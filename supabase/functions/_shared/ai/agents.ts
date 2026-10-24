// The six agents (master plan 28.6): one brain (Business Knowledge plus each business's own data), and each agent has
// one job, a fixed list of tools and a model per task. Code calls `task(agent, name)` for the model settings and
// `useTool(agent, tool)` before an agent's step runs, so a step outside an agent's list fails loudly instead of running.
// No agent has a tool that writes to Google: an agent can only prepare something for the owner (`propose_publication`);
// the publish job sends it after the owner's yes, through the one publication pipeline (guardrail 6).
// Model rule (28.6, R-39): Haiku for sorting and short checks, Sonnet for replies, posts, reports and Nora, never Opus.
import { MODELS } from "../models.ts";

export type AgentName = "reply" | "guard" | "growth" | "insights" | "scout" | "nora";

export type Tool =
  | "read_business_knowledge" | "read_review" | "read_owner_replies" | "propose_publication" | "ask_owner"
  | "read_google_profile" | "read_google_state" | "open_task" | "alert_staff"
  | "read_photos" | "read_holidays" | "read_insights" | "read_rank_scans" | "run_rank_scan"
  | "read_public_facts" | "save_contact" | "hand_to_person" | "read_tasks" | "save_owner_fact" | "read_onboarding_state";

/** One model step of an agent. `effort` is sent only to models that take it (not Haiku 4.5). */
export type TaskSettings = { model: string; maxTokens: number; effort?: "low" | "medium" | "high" };

export type Agent = { job: string; tools: readonly Tool[]; tasks: Record<string, TaskSettings> };

// N-004 (22 Oct 2026): Sonnet 5.5 thinks before it writes and the thinking counts toward max_tokens, so a 500 token cap
// could end with no text at all. Drafts now run at low effort with room for the thinking and the answer.
const DRAFT: TaskSettings = { model: MODELS.draft, maxTokens: 2000, effort: "low" };

export const AGENTS: Record<AgentName, Agent> = {
  reply: {
    job: "Drafts a reply to each review from Business Knowledge only, checks it, and offers it to the owner to approve.",
    tools: ["read_business_knowledge", "read_review", "read_owner_replies", "propose_publication", "ask_owner"],
    tasks: {
      classify: { model: MODELS.check, maxTokens: 200 },
      draft: DRAFT,
      check: { model: MODELS.check, maxTokens: 250 },
    },
  },
  guard: {
    job: "Google Protection: watches the listing, Google's own updates and the suspension and verification state, and tells the owner.",
    tools: ["read_google_profile", "read_google_state", "read_business_knowledge", "open_task", "alert_staff", "propose_publication"],
    tasks: {},
  },
  growth: {
    job: "Posts, photos, holiday hours, Review Growth messages and the Ask a customer text, each prepared for the owner's yes.",
    tools: ["read_business_knowledge", "read_photos", "read_holidays", "propose_publication", "ask_owner"],
    tasks: {
      draft_post: { ...DRAFT, maxTokens: 2500 },
      check_post: { model: MODELS.check, maxTokens: 200 },
    },
  },
  insights: {
    job: "The Results Report, the three next actions, why calls dropped, the category check and AI Visibility sources turned into actions.",
    tools: ["read_insights", "read_rank_scans", "read_business_knowledge", "open_task"],
    tasks: {},
  },
  // V1 fills Scout in (Visibility Map, Competitor Watch, AI Visibility). Until then it has no tools and no tasks.
  scout: {
    job: "Runs and reads the Visibility Map, Competitor Watch and AI Visibility jobs and turns raw ranks into three numbers and one line. Never writes to Google.",
    tools: [],
    tasks: {},
  },
  nora: {
    job: "Kabsi's voice on the site, in the app and in WhatsApp: answers only from the public facts, sells with the free scan, supports owners, hands to a person.",
    // save_owner_fact writes the owner's own answer into Business Knowledge (signed in, their business); nothing reaches Google.
    tools: ["read_public_facts", "save_contact", "hand_to_person", "read_tasks", "save_owner_fact", "read_onboarding_state"],
    tasks: {
      chat: { model: MODELS.chat, maxTokens: 2000, effort: "low" },
      label_chat: { model: MODELS.check, maxTokens: 500 },
    },
  },
};

export class AgentToolError extends Error {
  constructor(agent: AgentName, tool: string) {
    super(`agent_tool_denied: ${agent} may not use ${tool}`);
  }
}

/** Throws unless the agent's list has this tool. */
export function useTool(agent: AgentName, tool: Tool): void {
  if (!AGENTS[agent].tools.includes(tool)) throw new AgentToolError(agent, tool);
}

export function task(agent: AgentName, name: string): TaskSettings {
  const t = AGENTS[agent].tasks[name];
  if (!t) throw new AgentToolError(agent, `task ${name}`);
  return t;
}

/** Haiku 4.5 rejects output_config.effort; every newer model takes it. */
export const takesEffort = (model: string) => !/haiku-4-5/.test(model);

// US dollars per million tokens (Anthropic list prices, read 24 Oct 2026). Cache writes cost 1.25 times input, reads
// 0.1 times. Used only to record cost per agent per business (25.8); the bill is Anthropic's.
const PRICE: Record<string, { input: number; output: number }> = {
  "claude-sonnet-5-5": { input: 2, output: 10 },
  "claude-sonnet-5": { input: 2, output: 10 },
  "claude-haiku-4-5": { input: 1, output: 5 },
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
};

export type Usage = { input: number; output: number; cacheRead: number; cacheWrite: number };

/** Cost in millionths of a US dollar; an unknown model is priced like Sonnet so the cost is never under-counted. */
export function costMicros(model: string, u: Usage): number {
  const key = Object.keys(PRICE).sort((a, b) => b.length - a.length).find((k) => model.startsWith(k));
  const p = PRICE[key ?? "claude-sonnet-5-5"];
  return Math.round(u.input * p.input + u.cacheWrite * p.input * 1.25 + u.cacheRead * p.input * 0.1 + u.output * p.output);
}
