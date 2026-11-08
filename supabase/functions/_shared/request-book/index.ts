// The request book's code half (RB-C2): packs, normalizers, tools, policy, replies and the intake adapter. Dark: nothing
// under whatsapp/ imports this yet (a test holds that), and every database function it will call refuses unless the
// request book is switched on for a test business.
export * from "./types.ts";
export * from "./policy.ts";
export { TOOLS, TOOL_NAMES, UNDO_BUTTON, checkInput, roleMayUse } from "./tools/registry.ts";
export type { ToolContract, ToolName } from "./tools/registry.ts";
export { PACKS, getPack } from "./packs/index.ts";
export { validatePack, assertValidPack } from "./packs/schema.ts";
export type { Pack } from "./packs/schema.ts";
export { normalizeMessage, NORMALIZER_VERSIONS } from "./normalize/index.ts";
export * from "./replies/index.ts";
export { typedAdapter, readIntake, ADAPTERS } from "./intake/adapter.ts";
export type { IntakeAdapter, IntakeDraft } from "./intake/adapter.ts";
