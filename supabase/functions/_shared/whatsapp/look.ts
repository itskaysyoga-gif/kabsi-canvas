// Reply look 2 (master plan 30.50 item 2, R-150): the one render step every free-form WhatsApp reply in scope passes
// through. Pure: no database, network or environment access. Approved templates never pass through here and do not change.
//
// The look, each rule tested (look.test.ts):
//   - At most three blocks, split by one blank line: (1) one marker and a bold title of five words or fewer, the business
//     after it only where it is needed; (2) the facts, one per line, a label only where the value does not explain itself;
//     (3) one status or one question.
//   - Six body lines at most, unless the body is a list.
//   - A review and Kabsi's draft are WhatsApp quote lines ("> ", WhatsApp's own quote formatting).
//   - A standing note ("Nothing is saved until you tap Save.") goes in the footer of a message with buttons or a list;
//     a plain text message keeps it as its status line, because only interactive messages have a footer.
//   - A list of up to 10 requests is a list message whose rows open the request; more than 10 shows 10 and "and N more".
//   - One marker per message: the R-148 set plus star, clock, picture and receipt.
//   - At most 3 buttons (the callers keep the yes first; this file never reorders, renames or re-ids a button).
//
// Strings written for this module follow one convention, so a line of text says where each part goes:
//   "Title\nfact\nfact\n\nStatus or question"   (the first line is the title; the last paragraph is block 3).

/** The markers (R-148 item 3, and 30.50 item 2's four). DESIGN.md's no-emoji rule still holds for the site and app. */
export const MARK = {
  appointment: "\u{1F4C5}", enquiry: "\u{1F4AC}", job: "\u{1F527}", done: "✅", confirm: "⏳", undone: "↩️", ask: "❓", list: "\u{1F4CB}",
  review: "⭐", hours: "\u{1F552}", picture: "\u{1F5BC}️", receipt: "\u{1F9FE}",
} as const;
export type Mark = (typeof MARK)[keyof typeof MARK];
export const MARKS: readonly string[] = Object.values(MARK);

// WhatsApp's limits (Meta's Cloud API: interactive messages) and the look's own.
export const TITLE_WORDS = 5;
export const BODY_LINES = 6;
export const MAX_BUTTONS = 3;
export const LIST_ROWS = 10;
export const FOOTER_MAX = 60;
export const ROW_TITLE_MAX = 24;
export const ROW_DESC_MAX = 72;
export const SECTION_TITLE_MAX = 24;
export const LIST_BUTTON = "Open a request";
export const BUTTON_BODY_MAX = 1024;
export const TEXT_BODY_MAX = 4096;

export type Look = {
  mark: string;
  title: string;
  /** Named after the title (" · Business") only where it is needed: a phone with several businesses, or a change to Google. */
  business?: string | null;
  facts?: string[];
  /** Block 3: one status or one question. */
  end?: string | null;
  footer?: string | null;
};
export type ListRow = { id: string; title: string; description?: string };
export type ListSection = { title?: string; rows: ListRow[] };
export type ListMsg = { button: string; sections: ListSection[] };
/** What the sender sends: the body, and the footer and list where the message is interactive. */
export type Msg = { body: string; footer?: string; list?: ListMsg };

const clip = (s: string, n: number) => (s.length <= n ? s : `${s.slice(0, n - 3).trimEnd()}...`);
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const unstar = (s: string) => s.replace(/[*_~]/g, "");

/** The most whole words of a text that fit in max characters: a word is never cut and the result never ends with "...". */
export function wholeWords(text: string, max: number): string {
  const ws = text.trim().split(/\s+/).filter(Boolean);
  while (ws.length && ws.join(" ").length > max) ws.pop();
  return ws.join(" ").replace(/[\s,;:·-]+$/, "");
}

/**
 * A list row's description (72 characters) or any short line built from parts in order of worth: the parts joined with
 * " · "; when they do not fit, the lowest part (the last) is dropped whole, then the next, and so on. A word is never cut
 * and the line never ends with "...". Only when the first part alone is too long does it lose its last words.
 */
export function fitParts(parts: string[], max: number): string {
  const p = parts.map((x) => x.trim()).filter(Boolean);
  while (p.length > 1 && p.join(" · ").length > max) p.pop();
  return p.length === 1 && p[0]!.length > max ? wholeWords(p[0]!, max) : p.join(" · ");
}

/** A list row's title (24 characters): "#12 Sarah", the name losing its last words, never a part of one, never "...". */
export function rowTitle(number: string, name: string): string {
  return wholeWords(`#${number} ${name}`, ROW_TITLE_MAX);
}

/** WhatsApp quote lines for a review or a draft: "> " before the text, on one line, so the whole text reads as one quote. */
export function quote(text: string | null | undefined, max = 4000): string[] {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  return t ? [`> ${clip(t, max)}`] : [];
}

/** Standing notes: true always, so they sit in a footer when the message has one. */
const NOTES = [
  "Nothing is saved until you tap Save.",
  "Nothing is saved until you tap.",
  "Nothing is saved yet.",
  "Nothing is changed until you tap.",
  "Nothing is changed yet.",
  "This covers only what was entered in Kabsi.",
  "Tap Confirm to go ahead.",
  "Nothing goes on Google until you say yes.",
  "Nothing goes on Google until they say yes.",
];
export const isNote = (line: string) => NOTES.includes(line.trim());

/** A short title for a mark, used only when a line's first sentence is longer than five words (that sentence becomes a fact). */
const FALLBACK: Record<string, string> = {
  [MARK.done]: "Done", [MARK.ask]: "One question", [MARK.list]: "Here it is", [MARK.undone]: "Undone", [MARK.confirm]: "Needs a confirmation",
  [MARK.appointment]: "Your request book", [MARK.enquiry]: "Your request book", [MARK.job]: "Your request book",
  [MARK.review]: "Your review", [MARK.hours]: "Your hours", [MARK.picture]: "Your photo or post", [MARK.receipt]: "Your week",
};

/** The body: the bold title with its marker, then the facts, then the status or question, split by one blank line. */
export function render(l: Look): string {
  const title = unstar(l.title).replace(/[.:]$/, "").trim();
  const facts = (l.facts ?? []).map((f) => f.trimEnd()).filter((f) => f.trim());
  // The business is named after the title unless the title itself names it. A fact or a quote that happens to hold the
  // name never stands in for it (a review of "Bloom" may mention "Bloomfield").
  const biz = l.business && !title.includes(l.business) ? ` · ${unstar(l.business)}` : "";
  return [`*${l.mark} ${title}*${biz}`, facts.join("\n"), (l.end ?? "").trim()].filter(Boolean).join("\n\n");
}

/** The first line of a reply split into a title and the rest: a sentence end before any colon; "Dr." never ends one. */
function splitFirst(line: string): { title: string; more: string } {
  const colon = line.indexOf(":");
  const dot = /^(.+?(?<!\b(?:Dr|Mr|Mrs|Ms|St|No))[.?])\s+(\S.*)$/s.exec(line);
  const byColon = colon >= 0 && (!dot || colon < dot[1]!.length) ? /^((?:\S+\s+){2,}\S+:)\s+(\S.*)$/s.exec(line) : null;
  const cut = byColon ?? dot;
  return cut ? { title: cut[1]!.replace(/[.:]$/, ""), more: cut[2]! } : { title: line.replace(/\.$/, ""), more: "" };
}

/**
 * Nora's answer in the frame (30.50 item 2): one marker and a bold title of five words or fewer, the answer exactly as
 * Nora wrote it, then one question if she asked one. Only the frame is new: her words, and her prompt, do not change.
 * The title is the frame's own ("Nora's answer"), never a sentence of hers cut to length.
 */
export const NORA_TITLE = "Nora's answer";
export function noraLook(text: string, business: string | null = null): Look {
  const lines = text.trim().split("\n").map((x) => x.trimEnd()).filter((x) => x.trim());
  let end: string | null = null;
  const last = lines.at(-1) ?? "";
  if (lines.length && last.endsWith("?")) {
    // The question is the last sentence when it stands after others on its line, else the whole last line.
    const cut = /^(.+[.?])\s+([^.?]+\?)$/s.exec(last);
    const before = cut?.[1];
    if (cut && before && !/\b(?:Dr|Mr|Mrs|Ms|St|No)\.$/.test(before)) {
      lines[lines.length - 1] = before;
      end = cut[2]!.trim();
    } else {
      end = last.trim();
      lines.pop();
    }
  }
  return { mark: MARK.enquiry, title: NORA_TITLE, business, facts: lines, end };
}

/** A note at the end of a line ("Tap it to set that time. Nothing is changed until you tap.") split off as its own line. */
function noteOff(line: string): string[] {
  for (const n of NOTES) if (line !== n && line.endsWith(` ${n}`)) return [line.slice(0, -n.length - 1).trim(), n];
  return [line];
}

/**
 * Text in the convention above (or an older reply: a first line, then lines) read into its parts. A first line already
 * in bold ("*✅ Title* · Business") keeps its title; its marker and business are set again by the caller.
 */
export function fromText(text: string, mark: string, business: string | null = null): Look {
  const all = text.trim().split("\n");
  let first = all[0] ?? "";
  const styled = /^\*(.+?)\*(?:\s·\s.*)?$/.exec(first);
  let title: string;
  let more = "";
  if (styled) {
    title = styled[1]!.trim();
    for (const m of MARKS) if (title.startsWith(m)) title = title.slice(m.length).trim();
    title = title.replace(new RegExp(`\\s?(?:${MARKS.join("|")})\\s?`, "gu"), " ").replace(/\s+/g, " ").trim();
  } else {
    ({ title, more } = splitFirst(first.trim()));
  }
  first = "";
  const rest = [more, ...all.slice(1)].join("\n");
  const paras = rest.split(/\n\s*\n/).map((p) => p.split("\n").map((x) => x.trimEnd()).filter((x) => x.trim())).filter((p) => p.length);
  let facts: string[] = [];
  let end: string | null = null;
  if (paras.length >= 2) {
    facts = paras.slice(0, -1).flat();
    end = paras.at(-1)!.join(" ");
  } else if (paras.length === 1) {
    const lines = paras[0]!.flatMap(noteOff);
    const last = lines.at(-1)!;
    if (lines.length === 1 || /\?$/.test(last) || isNote(last)) {
      end = last;
      facts = lines.slice(0, -1);
    } else facts = lines;
  }
  if (words(title) > TITLE_WORDS) {
    facts.unshift(title.endsWith("?") || title.endsWith(".") ? title : `${title}.`);
    title = FALLBACK[mark] ?? "Kabsi";
  }
  return { mark, title, business, facts, end };
}

/** A standing note in block 3 moves to the footer when the message has buttons or a list (only those have a footer). */
export function withFooter(l: Look, interactive: boolean): Look {
  if (!interactive || l.footer || !l.end) return l;
  const parts = noteOff(l.end);
  const note = parts.at(-1)!;
  if (!isNote(note) || note.length > FOOTER_MAX) return l;
  return { ...l, end: parts.length > 1 ? parts[0]! : null, footer: note };
}

/** A part that says when: a date, a time, a day part or words kept with "no time set". */
const WHEN = /\b(?:today|tomorrow|(?:mon|tues?|wed(?:nes)?|thu(?:rs)?|fri|sat(?:ur)?|sun)(?:day)?)\b|\d{1,2}:\d{2}|\b(?:morning|afternoon|evening|night)\b|\(as written\)|, no time set$|^no time entered$/i;
const CONFIRM = /^(?:Needs confirmation from |Still needs confirmation from |To confirm: )/;

/** "To confirm: salon, client": the sides that have not confirmed, plainly, in the order the request book names them. */
export function toConfirm(part: string): string | null {
  const m = /^(?:(?:Still n|N)eeds confirmation from (.+)|To confirm: (.+))$/.exec(part.trim());
  if (!m) return null;
  const sides = (m[1] ?? m[2]!).split(/\s+and from\s+|,\s*/).map((x) => x.replace(/^the /, "").trim()).filter(Boolean);
  return sides.length ? `To confirm: ${sides.join(", ")}` : null;
}

/**
 * The description of a request row from the parts of its line: the service, then the day and time (in a row "afternoon"
 * stands without "no time set"), then what is to confirm, then the status where the line has one (a row under a status
 * heading has none). A held confirmation ("Confirmed by the salon") is not part of it.
 */
export function rowDescription(parts: string[]): string {
  const rest = parts.map((x) => x.trim()).filter(Boolean);
  const confirm = rest.map(toConfirm).find((x) => x) ?? null;
  const others = rest.filter((x) => !toConfirm(x) && !/^Confirmed by /.test(x) && !CONFIRM.test(x));
  const service = others[0] ?? null;
  const when = others.slice(1).find((x) => WHEN.test(x)) ?? null;
  const status = others.slice(1).filter((x) => x !== when);
  const day = when ? when.replace(/, no time set$/, "") : "";
  // R-155: a long service name loses its last words, so the day and time always stay.
  return fitParts([day && service ? wholeWords(service, ROW_DESC_MAX - day.length - 3) || service : service ?? "", day, confirm ?? "", ...status], ROW_DESC_MAX);
}

const ROW = /^#(\d{1,9})\s+(.+)$/;
/** True when the facts hold one or more request rows ("#12 Sarah · Highlights · ..."). */
export const hasRows = (l: Look) => (l.facts ?? []).some((f) => ROW.test(f.trim()));

/**
 * A list of requests as a WhatsApp list message: one row per request, its id "#N" (the tap reads as the owner typing
 * "#N", so it opens the request by the same path as before), the title "#N Name", the rest as the description. Group
 * lines ("Requested (2)") become sections. At most 10 rows; more is "and N more" in the body.
 */
export function toList(l: Look, extraMore = 0): { look: Look; list: ListMsg } | null {
  const sections: ListSection[] = [];
  let more = extraMore;
  let shown = 0;
  const other: string[] = [];
  for (const raw of l.facts ?? []) {
    const f = raw.trim();
    const m = ROW.exec(f);
    const moreLine = /^and (\d+) more$/.exec(f);
    if (moreLine) {
      more += Number(moreLine[1]);
      continue;
    }
    if (!m) {
      // A group line before rows is a section title; anything else stays in the body.
      if (/\(\d+\)$/.test(f) || /^(?:Requested|Confirmed|Arrived|In progress|Waiting|Ready|Appointments|Enquiries|Jobs|Visits)\b/.test(f)) {
        // "Appointments, Requested (17)" is too long for a section title: the status and its count are kept.
        sections.push({ title: wholeWords(f.length > SECTION_TITLE_MAX && f.includes(", ") ? f.slice(f.lastIndexOf(", ") + 2) : f, SECTION_TITLE_MAX), rows: [] });
      } else other.push(f);
      continue;
    }
    if (shown >= LIST_ROWS) {
      more++;
      continue;
    }
    if (!sections.length) sections.push({ rows: [] });
    // A row's description: the service, the day and time, what is to confirm, in that order. Anything else (a status, what
    // is already confirmed) is not part of it. What does not fit in 72 characters is dropped whole from the end.
    const [name, ...parts] = m[2]!.split(" \u00b7 ");
    const description = rowDescription(parts);
    sections.at(-1)!.rows.push({ id: `#${m[1]}`, title: rowTitle(m[1]!, name!), ...(description ? { description } : {}) });
    shown++;
  }
  if (!shown) return null;
  const kept = sections.filter((s) => s.rows.length);
  // WhatsApp needs a title on every section once there is more than one.
  if (kept.length > 1) kept.forEach((s, i) => (s.title ||= `Group ${i + 1}`));
  const facts = [...other, ...(more > 0 ? [`and ${more} more`] : [])];
  // The note that a list covers only what was entered in Kabsi is the footer; the status line says what a tap does.
  const note = l.end && isNote(l.end) ? l.end : l.footer ?? null;
  const end = l.end && !isNote(l.end) ? l.end : "Tap one to open it.";
  return { look: { ...l, facts, end, footer: note }, list: { button: LIST_BUTTON, sections: kept } };
}

/** The look as what the sender sends: the body, the footer for a message with buttons or a list, and the list itself. */
export function toMsg(l: Look, o: { buttons?: number; asList?: boolean; list?: ListMsg | null } = {}): Msg {
  let look = l;
  let list = o.list ?? null;
  if (!list && o.asList) {
    const made = toList(look);
    if (made) ({ look, list } = made);
  }
  look = withFooter(look, !!list || (o.buttons ?? 0) > 0);
  // A message with buttons or a list is never cut: what an owner approves must be shown whole. A body over WhatsApp's limit
  // is refused by the sender, as before look 2, and no Approve is shown. Plain text is cut at 4,096 as before.
  const interactive = !!list || (o.buttons ?? 0) > 0;
  const body = render(look);
  return {
    body: interactive || body.length <= TEXT_BODY_MAX ? body : `${body.slice(0, TEXT_BODY_MAX - 4).trimEnd()} ...`,
    ...(look.footer ? { footer: clip(look.footer, FOOTER_MAX) } : {}),
    ...(list ? { list } : {}),
  };
}

/** The checks the tests run on every reply in scope: blocks, the title, the body lines, one marker, the footer. */
export function lookProblems(m: Msg, o: { list?: boolean } = {}): string[] {
  const out: string[] = [];
  // Voice 2: the quote line of a voice note ("> I heard: ...") opens the reply and is not one of its blocks.
  const blocks = m.body.replace(/^> I heard: [^\n]*\n\n/, "").split("\n\n");
  if (blocks.length > 3) out.push(`${blocks.length} blocks`);
  const head = /^\*(\S+) (.+?)\*(?: · .+)?$/u.exec(blocks[0] ?? "");
  if (!head) out.push("no bold title");
  else {
    if (!MARKS.includes(head[1]!)) out.push(`marker ${head[1]}`);
    if (words(head[2]!) > TITLE_WORDS) out.push(`title of ${words(head[2]!)} words`);
  }
  const markers = MARKS.filter((x) => m.body.includes(x)).length;
  if (markers > 1) out.push(`${markers} markers`);
  const lines = blocks.slice(1).join("\n").split("\n").filter(Boolean).length;
  if (lines > BODY_LINES && !m.list && !o.list) out.push(`${lines} body lines`);
  if (m.footer && m.footer.length > FOOTER_MAX) out.push("footer too long");
  if (/[‒-―!]/.test(m.body + (m.footer ?? ""))) out.push("dash or exclamation mark");
  return out;
}

/** The kinds a request book reply can be about (request-book/types.ts Kind). */
type KindName = "appointment" | "enquiry" | "job";

/**
 * The one marker a reply gets, from what it did (its result code) and, for a request of one kind, that kind (RB-F3's
 * rules, with 30.50 item 2's four: hours, photos and posts, a review and its draft, the weekly receipt).
 */
export function markFor(result: string, kind: KindName | null): string {
  const r = result.split(":")[0]!;
  const byKind = kind ? MARK[kind] : MARK.list;
  if (r === "nora") return MARK.enquiry;
  if (/^hours_/.test(r)) return MARK.hours;
  if (/^(post_|photo|held_photo|video$|post_skip)/.test(r)) return MARK.picture;
  if (/^(shown_for_yes|no_review$|exact_|edit_(started|refused|draft)|show_refused|review_alert|new_draft)/.test(r)) return MARK.review;
  if (/^receipt/.test(r)) return MARK.receipt;
  // Cards 2: a card linked or given its place is done; "cards" is a list; anything else about a card asks or refuses.
  if (/^card_(linked|labelled|already)$/.test(r)) return MARK.done;
  if (/^card_(list|none)$/.test(r)) return MARK.list;
  if (/^card_/.test(r)) return MARK.ask;
  // Partners 2: the owner's link, and the staff list of first payouts.
  if (/^referral_/.test(r)) return MARK.list;
  if (r === "payouts_list") return MARK.receipt;
  if (/^payouts_(approved|none)$/.test(r)) return MARK.done;
  if (/undone|undo_refused|request_undo|^undo$|^too_late$/.test(r)) return MARK.undone;
  if (/^request_(confirm|convert)_(guess|choose)$/.test(r)) return MARK.confirm;
  if (/_(which|ask|choose|tap)$|which_|_tap_|still_waiting|request_change$|request_duplicate$|request_yes_tap_save|question_elsewhere|forwarded_yes|reset_ask|pick_closed|^off_topic$|^unclear|^refused$|^not_yours$|^stale_button$|_refused$|_owner_only$|^billing_(error|unclear|stub)$|^billing_[a-z_]+$/.test(r) && !/^billing_(cancelled|kept|upgraded|downgraded|location_link|status|no_plan|portal|same_plan|already_ends)$/.test(r)) return MARK.ask;
  if (/^request_(open|unconfirmed|asked|find)$|which_business|^help$|^request_find|^billing_(status|no_plan|portal|same_plan|already_ends)$|^yes_nothing$/.test(r)) return MARK.list;
  if (/^request_(saved|status|status_many|status_acknowledged|confirmed|time_set|corrected|converted|dropped|ask_no|time_no|updated)$|^request_saved_replay$|role_set|business_set|^switched$|reset_done|^started$|^approved$|^handoff$|^repeat$|^billing_(cancelled|kept|upgraded|downgraded|location_link)$/.test(r)) return MARK.done;
  return byKind;
}

/** The replies in scope of look 2 (30.50 item 2): the request book, help, switch, off topic, and the Google care replies
 *  inside the window (a review and its draft, hours, photos and posts, billing and the hand-off). Others keep their look
 *  until a later session moves them (docs/LATER.md). */
export const IN_SCOPE = /^(nora$|request_|reset_|forwarded_yes|help$|which_role|which_business|business_set|role_set|role_refused|switched|pick_closed|off_topic|hours_|post_|photo|held_photo|video$|file_refused|shown_for_yes|no_review$|exact_|edit_|show_refused|approved$|undone$|undo:|too_late$|repeat$|stale_button$|refused:|which_one$|yes_nothing$|not_yours$|billing_|handoff$|referral_|payouts_|card_)/;
/** Replies about a change to Google: the business is always named after the title (say.ts: the business named first on
 *  anything that can change Google). */
export const NAMES_BUSINESS = /^(hours_shown|post_shown|photo_post_shown|photo_category_set|shown_for_yes|approved)$/;
/** Replies that are a list of requests: a list message when they hold request rows. */
export const LIST_RESULT = /^request_(open|unconfirmed|asked|find|found)/;
