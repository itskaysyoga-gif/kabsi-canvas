// The one schema every pack is checked against (RB-C2). A pack is data only: which kinds a business uses, the words an
// owner reads for each status, the service vocabulary and its spellings, the fields to extract and example phrases. It
// holds no workflow code. A new trade is a new file that passes validatePack; nothing else changes.
import { KINDS, OPEN_STATUSES, OUTCOMES, statusKeys, type Kind } from "../types.ts";

export type PackWords = { singular: string; plural: string };

export type ServiceEntry = {
  /** Stable key, lower case, stored nowhere personal. */
  key: string;
  /** What the owner reads. */
  label: string;
  /** Every way an owner or customer writes it, including common misspellings and written-out Arabic in Latin letters. */
  spellings: string[];
};

/** Where an extracted field goes in a request. Anything else is `details`, a small object the pack names. */
export const FIELD_TARGETS = ["customer_name", "phone", "summary", "when", "details"] as const;
export type FieldTarget = (typeof FIELD_TARGETS)[number];

export type FieldSpec = {
  /** For `details` fields this is the key inside `details`. */
  key: string;
  label: string;
  target: FieldTarget;
  required: boolean;
};

export type PackExample = { text: string; kind: Kind };

export type Pack = {
  id: string;
  version: number;
  /** The name of the pack for Kabsi's own screens and logs. */
  title: string;
  /** Which kinds this business uses, and the one a new request starts as when nothing says otherwise. */
  kinds: Kind[];
  defaultKind: Kind;
  words: {
    /** The customer, as this business says it. */
    customer: PackWords;
    /** The business's own side, as a phrase that follows "from". */
    staffSide: string;
    /** One word pair per used kind. */
    kinds: Partial<Record<Kind, PackWords>>;
    /** A word for every open status and every outcome of every used kind. */
    status: Partial<Record<Kind, Record<string, string>>>;
  };
  services: ServiceEntry[];
  fields: FieldSpec[];
  examples: PackExample[];
};

export const PACK_ID = /^[a-z][a-z0-9_]{1,40}$/;
const KEY = /^[a-z][a-z0-9_]{1,30}$/;

/** Words that claim a fact. Code writes them from the record; a pack may never supply one (reply rule). */
export const CLAIM_WORDS = /\b(book(?:ed|ing|ings)?|available|availability|confirm(?:ed|s|ing|ation|ations)?)\b/i;
const DASH_OR_BANG = /[–—!]/;
const ARABIC_SCRIPT = /[؀-ۿݐ-ݿ]/;

export type PackProblem = { path: string; message: string };

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

function checkText(path: string, v: unknown, max: number, out: PackProblem[], opts: { claims?: boolean } = {}): v is string {
  if (typeof v !== "string" || v.trim() === "" || v.length > max) {
    out.push({ path, message: `must be a text of 1 to ${max} characters` });
    return false;
  }
  if (v !== v.trim()) out.push({ path, message: "has spaces at an end" });
  if (DASH_OR_BANG.test(v)) out.push({ path, message: "has an em dash, an en dash or an exclamation mark" });
  if (ARABIC_SCRIPT.test(v)) out.push({ path, message: "has Arabic script; write it in Latin letters" });
  if (opts.claims !== false && CLAIM_WORDS.test(v)) out.push({ path, message: "uses a word that claims a fact (booked, available, confirmed); code writes those from the record" });
  return true;
}

function checkWords(path: string, v: unknown, out: PackProblem[]) {
  if (!isObj(v)) return void out.push({ path, message: "must be { singular, plural }" });
  checkText(`${path}.singular`, v["singular"], 40, out);
  checkText(`${path}.plural`, v["plural"], 40, out);
}

/** Every problem found, or an empty list when the pack is valid. Never throws on bad input. */
export function validatePack(input: unknown): PackProblem[] {
  const out: PackProblem[] = [];
  if (!isObj(input)) return [{ path: "", message: "a pack is an object" }];
  const p = input;

  if (typeof p["id"] !== "string" || !PACK_ID.test(p["id"])) out.push({ path: "id", message: "must match ^[a-z][a-z0-9_]{1,40}$ (the database column check)" });
  if (!Number.isInteger(p["version"]) || (p["version"] as number) < 1) out.push({ path: "version", message: "must be an integer of 1 or more" });
  checkText("title", p["title"], 60, out);

  const kinds = Array.isArray(p["kinds"]) ? (p["kinds"] as unknown[]) : null;
  const used: Kind[] = [];
  if (!kinds || kinds.length === 0) out.push({ path: "kinds", message: "must list at least one kind" });
  else {
    for (const k of kinds) {
      if (!(KINDS as readonly unknown[]).includes(k)) out.push({ path: "kinds", message: `unknown kind ${String(k)}` });
      else if (used.includes(k as Kind)) out.push({ path: "kinds", message: `kind ${String(k)} listed twice` });
      else used.push(k as Kind);
    }
  }
  if (!used.includes(p["defaultKind"] as Kind)) out.push({ path: "defaultKind", message: "must be one of the used kinds" });

  const w = p["words"];
  if (!isObj(w)) out.push({ path: "words", message: "is required" });
  else {
    checkWords("words.customer", w["customer"], out);
    checkText("words.staffSide", w["staffSide"], 40, out);
    const wk = isObj(w["kinds"]) ? w["kinds"] : null;
    const ws = isObj(w["status"]) ? w["status"] : null;
    if (!wk) out.push({ path: "words.kinds", message: "is required" });
    if (!ws) out.push({ path: "words.status", message: "is required" });
    for (const k of KINDS) {
      const isUsed = used.includes(k);
      if (wk) {
        if (isUsed) checkWords(`words.kinds.${k}`, wk[k], out);
        else if (wk[k] !== undefined) out.push({ path: `words.kinds.${k}`, message: "given for a kind the pack does not use" });
      }
      if (ws) {
        const sw = ws[k];
        if (!isUsed) {
          if (sw !== undefined) out.push({ path: `words.status.${k}`, message: "given for a kind the pack does not use" });
        } else if (!isObj(sw)) out.push({ path: `words.status.${k}`, message: "a word for every status and outcome is required" });
        else {
          for (const key of statusKeys(k)) checkText(`words.status.${k}.${key}`, sw[key], 40, out);
          for (const key of Object.keys(sw)) {
            if (!statusKeys(k).includes(key)) out.push({ path: `words.status.${k}.${key}`, message: "is not a status or outcome of this kind" });
          }
          // Two statuses an owner cannot tell apart would make every reply ambiguous.
          const open = OPEN_STATUSES[k].map((s) => String(sw[s]).toLowerCase());
          if (new Set(open).size !== open.length) out.push({ path: `words.status.${k}`, message: "open statuses need different words" });
          const closed = OUTCOMES[k].map((s) => String(sw[s]).toLowerCase());
          if (new Set(closed).size !== closed.length) out.push({ path: `words.status.${k}`, message: "outcomes need different words" });
        }
      }
    }
  }

  const services = Array.isArray(p["services"]) ? (p["services"] as unknown[]) : null;
  if (!services) out.push({ path: "services", message: "must be a list (it may be empty)" });
  else {
    const keys = new Set<string>();
    const spelled = new Map<string, string>();
    services.forEach((s, i) => {
      const at = `services[${i}]`;
      if (!isObj(s)) return void out.push({ path: at, message: "must be { key, label, spellings }" });
      if (typeof s["key"] !== "string" || !KEY.test(s["key"])) out.push({ path: `${at}.key`, message: "must match ^[a-z][a-z0-9_]{1,30}$" });
      else if (keys.has(s["key"])) out.push({ path: `${at}.key`, message: "is used twice" });
      else keys.add(s["key"]);
      checkText(`${at}.label`, s["label"], 60, out);
      const sp = Array.isArray(s["spellings"]) ? (s["spellings"] as unknown[]) : null;
      if (!sp || sp.length === 0) out.push({ path: `${at}.spellings`, message: "needs at least one spelling" });
      else {
        sp.forEach((x, j) => {
          if (checkText(`${at}.spellings[${j}]`, x, 40, out, { claims: false }) && !/^[a-z0-9 ]+$/.test(x))
            out.push({ path: `${at}.spellings[${j}]`, message: "must be lower case letters, digits and single spaces" });
          else if (typeof x === "string" && /  /.test(x)) out.push({ path: `${at}.spellings[${j}]`, message: "has a double space" });
          if (typeof x === "string" && typeof s["key"] === "string") {
            const owner = spelled.get(x);
            if (owner !== undefined && owner !== s["key"]) out.push({ path: `${at}.spellings[${j}]`, message: `is also a spelling of ${owner}; one spelling means one service` });
            else spelled.set(x, s["key"]);
          }
        });
      }
    });
  }

  const fields = Array.isArray(p["fields"]) ? (p["fields"] as unknown[]) : null;
  if (!fields || fields.length === 0) out.push({ path: "fields", message: "must list the fields to extract" });
  else {
    const seen = new Set<string>();
    const targets = new Set<string>();
    fields.forEach((f, i) => {
      const at = `fields[${i}]`;
      if (!isObj(f)) return void out.push({ path: at, message: "must be { key, label, target, required }" });
      if (typeof f["key"] !== "string" || !KEY.test(f["key"])) out.push({ path: `${at}.key`, message: "must match ^[a-z][a-z0-9_]{1,30}$" });
      else if (seen.has(f["key"])) out.push({ path: `${at}.key`, message: "is used twice" });
      else seen.add(f["key"]);
      checkText(`${at}.label`, f["label"], 40, out);
      if (!(FIELD_TARGETS as readonly unknown[]).includes(f["target"])) out.push({ path: `${at}.target`, message: `must be one of ${FIELD_TARGETS.join(", ")}` });
      else {
        if (f["target"] !== "details" && targets.has(f["target"] as string)) out.push({ path: `${at}.target`, message: "only one field may fill this target" });
        targets.add(f["target"] as string);
      }
      if (typeof f["required"] !== "boolean") out.push({ path: `${at}.required`, message: "must be true or false" });
    });
    for (const t of ["customer_name", "summary"]) if (!targets.has(t)) out.push({ path: "fields", message: `needs a field for ${t}` });
  }

  const examples = Array.isArray(p["examples"]) ? (p["examples"] as unknown[]) : null;
  if (!examples || examples.length < 3 || examples.length > 12) out.push({ path: "examples", message: "needs 3 to 12 example phrases" });
  else {
    examples.forEach((e, i) => {
      const at = `examples[${i}]`;
      if (!isObj(e)) return void out.push({ path: at, message: "must be { text, kind }" });
      // An example is what an owner types, so it may say booked or confirmed; it still follows the other copy rules.
      checkText(`${at}.text`, e["text"], 200, out, { claims: false });
      if (!used.includes(e["kind"] as Kind)) out.push({ path: `${at}.kind`, message: "must be one of the used kinds" });
    });
  }

  const known = new Set(["id", "version", "title", "kinds", "defaultKind", "words", "services", "fields", "examples"]);
  for (const k of Object.keys(p)) if (!known.has(k)) out.push({ path: k, message: "is not part of the pack schema" });
  return out;
}

/** Returns the pack, or throws with every problem named. Used when a pack file is loaded. */
export function assertValidPack(p: Pack): Pack {
  const problems = validatePack(p);
  if (problems.length) throw new Error(`pack ${p.id}.v${p.version} is not valid: ${problems.map((x) => `${x.path} ${x.message}`).join("; ")}`);
  return p;
}
