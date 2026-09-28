// slack (D263): Kabsi's operations hub in Slack.
//   POST /slack/flush     internal (cron secret)   → posts queued ops_events (new message, thread reply, or update)
//   POST /slack/digest    internal (cron secret)   → queues the daily summary for #kabsi-daily
//   POST /slack/interact  Slack (signed)           → "I'm on it" / "Done" buttons
//   POST /slack/command   Slack (signed)           → /kabsi [today|week|pending|find <text>|help]
// Needs two secrets set in Supabase (never in code or chat): SLACK_BOT_TOKEN (xoxb-…) and SLACK_SIGNING_SECRET.
// Without the token, events simply wait in ops_events and go out once it's set. Only Slack users listed in
// app_settings.slack_staff_users can use the command and the buttons.
import { admin, APP_URL, captureError, fail, isInternal, json, log, timingSafeEqual } from "../_shared/kabsi.ts";

const FN = "slack";
const token = () => Deno.env.get("SLACK_BOT_TOKEN") ?? "";
const signingSecret = () => Deno.env.get("SLACK_SIGNING_SECRET") ?? "";

type Ev = {
  id: number; kind: string; channel: string; title: string; body: string | null;
  fields: { l: string; v: string }[]; buttons: { t: string; u: string }[];
  dedupe_key: string | null; thread_key: string | null; mode: "post" | "reply" | "reply_broadcast" | "update";
  created_at: string;
};
type Block = Record<string, unknown>;

// Slack mrkdwn: only &, < and > need escaping.
const x = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

async function api<T = Record<string, unknown>>(method: string, body: Record<string, unknown>): Promise<T & { ok: boolean; error?: string }> {
  const res = await fetch(`https://slack.com/api/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8", authorization: `Bearer ${token().trim()}` },
    body: JSON.stringify(body),
  });
  if (res.status === 429) return { ok: false, error: "ratelimited" } as T & { ok: boolean; error?: string };
  return (await res.json()) as T & { ok: boolean; error?: string };
}

async function setting<T>(key: string, fallback: T): Promise<T> {
  const { data } = await admin().from("app_settings").select("value").eq("key", key).maybeSingle();
  if (!data?.value) return fallback;
  try {
    return JSON.parse(String(data.value)) as T;
  } catch {
    return fallback;
  }
}

// ── message layout: title + body, up to 10 fields, link buttons, then "I'm on it" / "Done" for things to act on
function render(ev: Ev): { text: string; blocks: Block[] } {
  const blocks: Block[] = [];
  const head = `*${x(ev.title)}*${ev.body ? `\n${x(ev.body)}` : ""}`;
  blocks.push({ type: "section", text: { type: "mrkdwn", text: cut(head, 2990) } });
  const fields = (ev.fields ?? []).filter((f) => f?.v).slice(0, 10);
  if (fields.length) {
    blocks.push({ type: "section", fields: fields.map((f) => ({ type: "mrkdwn", text: cut(`*${x(f.l)}*\n${x(f.v)}`, 1900) })) });
  }
  // Email links as text (Slack buttons only take web links); web links as buttons.
  const mail = (ev.buttons ?? []).filter((b) => b?.u?.startsWith("mailto:"));
  if (mail.length) {
    blocks.push({ type: "context", elements: [{ type: "mrkdwn", text: mail.map((b) => `:email: <${b.u.replace(/[<>|]/g, "")}|${x(b.t)}>`).join("   ") }] });
  }
  const elements: Block[] = (ev.buttons ?? []).filter((b) => b?.u && /^https?:/.test(b.u)).slice(0, 4).map((b, i) => ({
    type: "button", text: { type: "plain_text", text: cut(b.t, 70), emoji: true }, url: cut(b.u, 2990), action_id: `link_${i}`,
  }));
  const actionable = ev.mode !== "reply" && ev.channel !== "daily";
  if (actionable) {
    elements.push(
      { type: "button", text: { type: "plain_text", text: "I'm on it", emoji: true }, action_id: "ops_ack", value: String(ev.id) },
      { type: "button", text: { type: "plain_text", text: "Done", emoji: true }, style: "primary", action_id: "ops_done", value: String(ev.id) },
    );
  }
  if (elements.length) blocks.push({ type: "actions", elements });
  return { text: cut(ev.title, 300), blocks };
}

// ── /flush: send queued events in order. Replies and updates find their parent message by thread_key.
async function flush() {
  if (!token()) return json({ ok: true, skipped: "SLACK_BOT_TOKEN not set; events wait in the queue" });
  // A wrong value (not a bot token) would burn every event's retries; wait instead until it's fixed.
  if (!/^xoxb-[A-Za-z0-9-]+$/.test(token().trim())) {
    return json({ ok: true, skipped: "SLACK_BOT_TOKEN is not a bot token (it must start with xoxb-); events wait in the queue" });
  }
  const db = admin();
  const channels = await setting<Record<string, string>>("slack_channels", {});
  let sent = 0;
  let failed = 0;
  for (let round = 0; round < 3; round++) {
    const { data, error } = await db.rpc("ops_claim", { p_limit: 20 });
    if (error) throw error;
    const batch = (data ?? []) as Ev[];
    if (!batch.length) break;
    for (const ev of batch) {
      try {
        const { text, blocks } = render(ev);
        let parent: { slack_channel: string | null; slack_ts: string | null; sent_at: string | null } | null = null;
        if (ev.thread_key) {
          const { data: p } = await db.from("ops_events").select("slack_channel, slack_ts, sent_at").eq("dedupe_key", ev.thread_key).maybeSingle();
          parent = p;
          // Parent queued but not out yet (it failed this round): try again on the next run.
          if (parent && !parent.slack_ts) {
            await db.from("ops_events").update({ claimed_at: null }).eq("id", ev.id);
            continue;
          }
        }
        let res: { ok: boolean; error?: string; ts?: string; channel?: string };
        if (parent?.slack_ts && ev.mode === "update") {
          res = await api("chat.update", { channel: parent.slack_channel, ts: parent.slack_ts, text, blocks });
          if (res.ok) res.ts = parent.slack_ts;
        } else if (parent?.slack_ts && (ev.mode === "reply" || ev.mode === "reply_broadcast")) {
          res = await api("chat.postMessage", {
            channel: parent.slack_channel, thread_ts: parent.slack_ts, reply_broadcast: ev.mode === "reply_broadcast",
            text, blocks, unfurl_links: false, unfurl_media: false,
          });
        } else {
          const channel = channels[ev.channel];
          if (!channel) throw new Error(`no Slack channel for ${ev.channel}`);
          res = await api("chat.postMessage", { channel, text, blocks, unfurl_links: false, unfurl_media: false });
          if (!res.ok && res.error === "not_in_channel") {
            await api("conversations.join", { channel });
            res = await api("chat.postMessage", { channel, text, blocks, unfurl_links: false, unfurl_media: false });
          }
        }
        if (!res.ok) throw new Error(res.error ?? "slack_error");
        await db.from("ops_events").update({
          sent_at: new Date().toISOString(), slack_ts: res.ts ?? null, slack_channel: res.channel ?? parent?.slack_channel ?? channels[ev.channel] ?? null, error: null,
        }).eq("id", ev.id);
        sent++;
        await new Promise((r) => setTimeout(r, 250));
      } catch (e) {
        failed++;
        const msg = e instanceof Error ? e.message : String(e);
        await db.from("ops_events").update({ error: cut(msg, 300), claimed_at: msg === "ratelimited" ? null : undefined }).eq("id", ev.id);
        if (msg === "ratelimited") break;
        if (!/channel_not_found|not_in_channel|invalid_blocks/.test(msg)) await captureError(FN, e, { event: ev.id, kind: ev.kind });
      }
    }
  }
  log(FN, { ok: true, route: "flush", sent, failed });
  return json({ ok: true, sent, failed });
}

// ── /digest: the morning summary, queued like any other event (so it waits if Slack isn't connected yet)
type Digest = Record<string, number | string | null>;
const n = (v: unknown) => Number(v ?? 0);
function digestText(d: Digest, w: Digest) {
  const line = (label: string, day: unknown, week?: unknown) =>
    `• ${label}: *${n(day)}*${week !== undefined ? `  (7 days: ${n(week)})` : ""}`;
  const parts = [
    "*Customers*",
    line("New accounts", d.signups, w.signups),
    line("Businesses started setup", d.businesses_new, w.businesses_new),
    line("Businesses went live", d.businesses_live, w.businesses_live),
    `• Live now: *${n(d.businesses_active_total)}* · waiting for Google access: *${n(d.waiting_for_access)}*`,
    "",
    "*Reviews and profiles*",
    line("New reviews", d.reviews_new, w.reviews_new),
    line("Replies posted", d.replies_posted, w.replies_posted),
    `• Drafts waiting for owners: *${n(d.drafts_waiting)}*${n(d.urgent_waiting) ? ` (${n(d.urgent_waiting)} need care)` : ""}`,
    line("Google posts published", d.posts_published, w.posts_published),
    line("Listing changes caught", d.shield_changes, w.shield_changes),
    line("Card and link opens", d.taps, w.taps),
    "",
    "*Chats, leads and partners*",
    line("Chats with Nora", d.chats, w.chats),
    `• Hot leads: *${n(d.chats_hot)}* · passed to a person: *${n(d.handoffs)}* · contacts saved: *${n(d.contacts)}*`,
    line("Enquiries and partner applications", d.leads, w.leads),
    `• Partners active: *${n(d.partners_active)}* · invites sent: *${n(d.invites)}*`,
    "",
    "*Money*",
    `• Payments recorded: *$${n(d.payments_usd).toFixed(2)}*  (7 days: $${n(w.payments_usd).toFixed(2)})`,
    `• USDT payments waiting for you: *${n(d.claims_pending)}* · plans ending in 14 days: *${n(d.plans_ending_14d)}*`,
    "",
    "*Health*",
    `• Emails sent: *${n(d.emails_sent)}* · failed: *${n(d.emails_failed)}*`,
    `• Failed jobs: *${n(d.jobs_failed)}* · failed Google writes: *${n(d.publications_failed)}*`,
    `• Google mode: *${d.google_mode ?? "?"}*`,
  ];
  return parts.join("\n");
}

async function digest() {
  const db = admin();
  const [{ data: d, error }, { data: w }] = await Promise.all([
    db.rpc("ops_digest", { p_hours: 24 }), db.rpc("ops_digest", { p_hours: 168 }),
  ]);
  if (error) throw error;
  const day = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "Asia/Beirut" });
  const { error: e2 } = await db.rpc("ops_emit", {
    p_kind: "digest", p_channel: "daily", p_title: `:sunrise: Kabsi, last 24 hours · ${day}`,
    p_body: digestText(d as Digest, (w ?? {}) as Digest), p_fields: [], p_buttons: [{ t: "Open staff page", u: `${APP_URL}/staff` }],
    p_dedupe: `digest:${new Date().toISOString().slice(0, 10)}`,
  });
  if (e2) throw e2;
  return json({ ok: true });
}

// ── Slack request signing (https://api.slack.com/authentication/verifying-requests-from-slack)
async function verified(req: Request): Promise<string | null> {
  const secret = signingSecret();
  const ts = req.headers.get("x-slack-request-timestamp") ?? "";
  const sig = req.headers.get("x-slack-signature") ?? "";
  const raw = await req.text();
  if (!secret || !ts || !sig || Math.abs(Date.now() / 1000 - Number(ts)) > 300) return null;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`v0:${ts}:${raw}`));
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return timingSafeEqual(`v0=${hex}`, sig) ? raw : null;
}
async function isStaffUser(userId: string) {
  const ids = await setting<string[]>("slack_staff_users", []);
  return ids.includes(userId);
}

// ── /interact: "I'm on it" keeps the message and notes who took it; "Done" closes it.
async function interact(req: Request) {
  const raw = await verified(req);
  if (raw === null) return new Response("bad signature", { status: 401 });
  const payload = JSON.parse(new URLSearchParams(raw).get("payload") ?? "{}");
  const action = payload.actions?.[0];
  if (payload.type !== "block_actions" || !action || !["ops_ack", "ops_done"].includes(action.action_id)) return new Response("", { status: 200 });
  const user = String(payload.user?.id ?? "");
  if (!(await isStaffUser(user))) return new Response("", { status: 200 });
  const blocks = ((payload.message?.blocks ?? []) as Block[]).map((b) => {
    if (b.type !== "actions") return b;
    const els = (b.elements as Block[]).filter((e) =>
      action.action_id === "ops_done" ? !["ops_ack", "ops_done"].includes(String(e.action_id)) : e.action_id !== "ops_ack");
    return { ...b, elements: els };
  }).filter((b) => b.type !== "actions" || (b.elements as Block[]).length > 0)
    .filter((b) => !(b.type === "context" && String(b.block_id ?? "").startsWith("ops_state")));
  const when = `<!date^${Math.floor(Date.now() / 1000)}^{time}|now>`;
  blocks.push({
    type: "context", block_id: `ops_state_${Date.now()}`,
    elements: [{ type: "mrkdwn", text: action.action_id === "ops_done" ? `:white_check_mark: Done by <@${user}> at ${when}` : `:eyes: <@${user}> is on it (since ${when})` }],
  });
  await api("chat.update", { channel: payload.channel?.id, ts: payload.message?.ts, text: payload.message?.text ?? "Kabsi", blocks });
  return new Response("", { status: 200 });
}

// ── /command: /kabsi …
async function command(req: Request) {
  const raw = await verified(req);
  if (raw === null) return new Response("bad signature", { status: 401 });
  const form = new URLSearchParams(raw);
  const reply = (text: string) => json({ response_type: "ephemeral", text });
  if (!(await isStaffUser(form.get("user_id") ?? ""))) return reply("Sorry, /kabsi is only for the Kabsi team.");
  const [sub = "today", ...rest] = (form.get("text") ?? "").trim().split(/\s+/).filter(Boolean);
  const db = admin();
  switch (sub.toLowerCase()) {
    case "today":
    case "stats":
    case "week": {
      const hours = sub === "week" ? 168 : 24;
      const [{ data: d }, { data: w }] = await Promise.all([db.rpc("ops_digest", { p_hours: hours }), db.rpc("ops_digest", { p_hours: 168 })]);
      return reply(`*Kabsi, last ${hours === 24 ? "24 hours" : "7 days"}*\n${digestText(d as Digest, (w ?? {}) as Digest)}`);
    }
    case "pending": {
      const [claims, handoffs, waiting, drafts] = await Promise.all([
        db.from("usdt_claims").select("amount_usd, network, created_at, kind").eq("status", "pending").order("created_at").limit(10),
        db.from("chat_conversations").select("id, updated_at, summary, contact_id").eq("status", "handoff").gt("updated_at", new Date(Date.now() - 14 * 864e5).toISOString()).order("updated_at", { ascending: false }).limit(10),
        db.from("locations").select("name, created_at").eq("status", "access_pending").order("created_at").limit(15),
        db.from("reviews").select("id", { count: "exact", head: true }).in("state", ["drafted", "blocked"]).eq("urgency", "urgent"),
      ]);
      const lines = [
        `*USDT payments to check:* ${claims.data?.length ?? 0}`,
        ...(claims.data ?? []).map((c) => `• $${Number(c.amount_usd).toFixed(2)} ${String(c.network).toUpperCase()} (${c.kind === "plan" ? "owner plan" : "partner invoice"})`),
        `*Chats passed to a person (14 days):* ${handoffs.data?.length ?? 0}`,
        ...(handoffs.data ?? []).map((h) => `• ${cut(String(h.summary ?? "Not summarised yet"), 140)}`),
        `*Businesses waiting for Google access:* ${waiting.data?.length ?? 0}`,
        ...(waiting.data ?? []).map((l) => `• ${x(l.name)}`),
        `*Urgent reviews waiting for owners:* ${drafts.count ?? 0}`,
        `<${APP_URL}/staff|Open the staff page>`,
      ];
      return reply(lines.join("\n"));
    }
    case "find": {
      const q = rest.join(" ").trim();
      if (q.length < 2) return reply("Type at least 2 characters, e.g. `/kabsi find bakery` or `/kabsi find name@email.com`.");
      const like = `%${q.replace(/[%_,()]/g, " ")}%`;
      const [locs, contacts, partners, leads] = await Promise.all([
        db.from("locations").select("name, status, country, created_at").ilike("name", like).limit(5),
        db.from("contacts").select("name, email, business_name, created_at").or(`email.ilike.${like},name.ilike.${like},business_name.ilike.${like}`).limit(5),
        db.from("partners").select("name, handle, status, contact_email, whatsapp, preferred_channel").or(`name.ilike.${like},handle.ilike.${like},contact_email.ilike.${like}`).limit(5),
        db.from("leads").select("kind, name, email, instagram, created_at").or(`email.ilike.${like},name.ilike.${like},instagram.ilike.${like}`).limit(5),
      ]);
      const out = [`*Results for "${x(q)}"*`];
      for (const l of locs.data ?? []) out.push(`• Business: *${x(l.name)}* · ${l.status} · ${l.country ?? ""}`);
      for (const c of contacts.data ?? []) out.push(`• Nora contact: *${x(c.name ?? c.email)}* ${x(c.email)}${c.business_name ? ` · ${x(c.business_name)}` : ""}`);
      for (const p of partners.data ?? []) out.push(`• Partner: *${x(p.name)}* (@${p.handle}) · ${p.status} · prefers ${p.preferred_channel}${p.whatsapp ? ` · WhatsApp ${x(p.whatsapp)}` : ""}`);
      for (const l of leads.data ?? []) out.push(`• ${l.kind === "partner" ? "Partner application" : "Enquiry"}: *${x(l.name ?? l.email)}* ${x(l.email)}`);
      if (out.length === 1) out.push("Nothing found.");
      return reply(out.join("\n"));
    }
    default:
      return reply([
        "*/kabsi* commands:",
        "• `/kabsi` or `/kabsi today`: the last 24 hours",
        "• `/kabsi week`: the last 7 days",
        "• `/kabsi pending`: payments to check, chats waiting for a person, businesses waiting for Google access",
        "• `/kabsi find <text>`: a business, Nora contact, partner or enquiry by name or email",
      ].join("\n"));
  }
}

Deno.serve(async (req) => {
  const path = new URL(req.url).pathname.replace(/\/+$/, "");
  try {
    if (req.method !== "POST") return fail("method_not_allowed", "Use POST.", 405);
    if (path.endsWith("/interact")) return await interact(req);
    if (path.endsWith("/command")) return await command(req);
    if (!(await isInternal(req))) return fail("forbidden", "Not allowed.", 403);
    if (path.endsWith("/flush")) return await flush();
    if (path.endsWith("/digest")) return await digest();
    return fail("not_found", "Unknown route.", 404);
  } catch (e) {
    await captureError(FN, e, { path });
    return fail("error", "Something went wrong.", 500);
  }
});
