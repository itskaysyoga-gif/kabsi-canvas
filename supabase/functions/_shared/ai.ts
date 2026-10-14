// P0.3-02: the AI code lives in _shared/ai/ (client, fence, prompts, memory, checks, contract runner, reply pipeline,
// edit learning). This file only re-exports what other modules import, so posts and the AI budget keep one import.
export { AnthropicError, draftMessage, message, MODELS, type Meter, newMeter, parseJson, type System, type SystemPart } from "./ai/client.ts";
export { clean, fenceReview, houseStyle, noDashes, REVIEW_MAX, type ReviewInput, UNTRUSTED } from "./ai/fence.ts";
export { classify, CONTACT_LINE, draftGrounded, languageRule, parseReply, type ReplyInput, replySystem, replyUser, replyWorkflow } from "./ai/reply.ts";
export { buildMemory, type Memory } from "./ai/memory.ts";
export { type Check, problems, replyChecks, type ReplyOutput, similarity, STOCK_PHRASES } from "./ai/checks.ts";
export { runContract, runRecord, type RunResult, type Send, sha256 } from "./ai/contract.ts";
export { editKinds, factAdditions, RULE_TEXT, type EditKind } from "./ai/edits.ts";
export { HIGH_RISK_CHECKLIST, HIGH_RISK_TITLE, type Industry, industryOf, issueLines, type Risk, type RiskReason } from "./ai/risk.ts";
