// What came back, read without a model (Harvey 4A part E, master plan 30.39 item 5). Ported from kabsi-harvey's
// harvey/agents/handler.py (the opt-out phrases, "no thanks" as a phrase, the bare replies, the Spanish rules, our own
// quoted text removed) and harvey/integrations/mail_provider.py (bounce senders and subjects, the quote stripper). Hebrew
// is not ported: Outbound writes only in English (Kabsi's first country is the UK).

// ─── text, as a mail client may have re-quoted it
const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", apos: "'", nbsp: " " };
const unescape = (t: string) =>
  t.replace(/&(#\d+|#x[0-9a-f]+|[a-z]+\d*);/gi, (m, e: string) => {
    const k = e.toLowerCase();
    if (k in ENTITIES) return ENTITIES[k];
    if (k.startsWith("#x")) return String.fromCodePoint(parseInt(k.slice(2), 16));
    if (k.startsWith("#")) return String.fromCodePoint(Number(k.slice(1)));
    return m;
  });
const LINK_ANNOTATION = /<(?:mailto:|https?:\/\/)[^>\s]*>/gi;
const INVISIBLE = /[‎‏‪-‮⁦-⁩]/g;

export function flat(text: string): string {
  let t = unescape(String(text ?? "").replace(LINK_ANNOTATION, "")).replace(INVISIBLE, "");
  t = t.replace(/^[ \t>]+/gm, "").replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
  return t.toLowerCase().split(/\s+/).filter(Boolean).join(" ");
}

const OWN_TEXT_MIN_CHARS = 20;

/** What Kabsi wrote to this business, so their words can be told from our quote. */
export class OurText {
  lines = new Set<string>();
  joined: string;
  constructor(texts: string[]) {
    for (const t of texts) for (const line of String(t ?? "").split("\n")) {
      const f = flat(line);
      if (f.length >= OWN_TEXT_MIN_CHARS) this.lines.add(f);
    }
    this.joined = [...this.lines].sort().join("\n");
  }
  private ours(line: string) {
    const f = flat(line);
    if (!f || !this.joined.includes(f)) return false;
    return line.trimStart().startsWith(">") || f.length >= OWN_TEXT_MIN_CHARS;
  }
  remove(text: string): string {
    const kept: string[] = [];
    for (const line of String(text ?? "").split("\n")) {
      if (this.ours(line)) continue;
      let f = flat(line);
      const hits = [...this.lines].filter((o) => f.includes(o)).sort((a, b) => b.length - a.length);
      if (hits.length) {
        for (const o of hits) f = f.split(o).join(" ");
        kept.push(f.split(/\s+/).filter(Boolean).join(" "));
      } else kept.push(line);
    }
    return kept.join("\n");
  }
}

const ATTRIBUTION = [
  /^[ \t]*On\b[^\n]{0,300}(?:\n[^\n]{0,300})?\bwrote:[ \t]*$/m,
  /^[ \t]*El\b[^\n]{0,300}(?:\n[^\n]{0,300})?\bescribi[oó]:[ \t]*$/m,
];
const BLOCK = [
  /^[ \t]*-{2,}[ \t]*Original Message[ \t]*-{2,}/im,
  /^[ \t]*(?:_{10,}[ \t]*\n[ \t]*)?(?:From|De):[^\n]*\n[ \t]*(?:Sent|Date|Enviado):/m,
];
const unquoted = (t: string) => t.split("\n").filter((l) => !l.trimStart().startsWith(">")).join("\n");

/** What the sender wrote, without the email they answer (mail_provider.strip_quoted_reply). */
export function stripQuoted(body: string): string {
  const text = String(body ?? "").replace(/\r\n/g, "\n");
  let cut = text.length;
  for (const p of BLOCK) {
    const m = p.exec(text);
    if (m && m.index < cut) cut = m.index;
  }
  let head = text.slice(0, cut);
  for (const p of ATTRIBUTION) {
    const m = p.exec(head);
    if (!m) continue;
    const below = head.slice(m.index + m[0].length);
    const marked = below.split("\n").some((l) => l.trimStart().startsWith(">"));
    head = head.slice(0, m.index) + (marked ? "\n" + below : "");
  }
  const kept = unquoted(head).trim() || unquoted(text).trim();
  return kept.replace(/\n{3,}/g, "\n\n");
}

// ─── opt-outs
const OPT_OUT_PHRASES = [
  "unsubscribe", "opt out", "opt-out", "remove me", "take me off", "stop emailing", "stop contacting", "stop sending",
  "do not contact", "do not email", "don't contact", "don't email", "never contact", "delete my info", "delete my data",
  "not interested", "no longer interested", "don't write", "do not write", "stop writing", "no more emails",
];
const NO_THANKS = /(?<!\bor )\bno,?[ \t]+thank(?:s|[ \t]+you)\b(?![ \t]+(?:needed|necessary|required))/;
const BARE = new Set(["stop", "unsubscribe", "remove", "remove me", "opt out", "no thanks", "no thank you", "no", "baja",
  "no gracias", "de baja", "dar de baja", "darme de baja"]);
const COURTESIES = new Set(["please", "thanks", "thank", "you", "por", "favor", "gracias", "saludos"]);
const MOBILE_SIGNATURE =
  /^[ \t‎‏]*(?:sent from my \w[^\n]*|get outlook for \w[^\n]*|sent from \w+ mail[^\n]*|enviado desde mi \w[^\n]*|obt[eé]n outlook para \w[^\n]*)$/gim;

const ES_US = "(?:me|nos)";
const ES_LIST = "(?:(?:su|sus|la|las|el|los|esta|esa|este|ese|tu|vuestra)\\s+)*(?:lista|base|correo|mail|email|envio|registro|contacto|boletin)\\w*";
const ES_MY_ADDRESS = "(?:mi|mis|nuestro|nuestros)\\s+(?:correo|mail|email|direccion|contacto|dato)\\w*";
const ES_MAIL = "(?:mas(?!\\s+de\\s)|correos?|mails?|emails?|e-mails?|mensajes?|publicidad|nada|informacion|ofertas?)";
const ES_WRITE = "(?:escribir|enviar|mandar|contactar|molestar)(?:me|nos|le|les)?";
const ES_SAY_END = "(?=[ \\t]*(?:[.!;]|$|,(?![ \\t]*(?:pero|aunque|salvo|excepto|a[ \\t]+menos|si)(?!\\w))))";
const SPANISH = [
  "(?:darme|darnos|dame|danos|deme|denos|denme|dennos|me\\s+den|me\\s+de|nos\\s+den)\\s+de\\s+baja",
  "dar\\s+de\\s+baja\\s+(?:mi|nuestro|nuestra|este|esta)\\s+(?:correo|mail|email|direccion|suscripcion|cuenta)",
  "(?:saquen|saque|saca|quiten|quite|quita|borren|borre|borra|eliminen|elimine|elimina|retiren|retire|retira)" + ES_US +
    "(?:\\s+de\\s+" + ES_LIST + "|" + ES_SAY_END + ")",
  "(?:sacar|quitar|borrar|eliminar|retirar)" + ES_US + "\\s+de\\s+" + ES_LIST,
  "(?:saquen|quiten|borren|eliminen|retiren|remuevan|eliminar|borrar|retirar|remover|quitar)\\s+" + ES_MY_ADDRESS + "\\s+de\\s+" + ES_LIST,
  "desuscrib\\w+|desinscrib\\w+|(?:cancelar|anular)\\s+(?:mi\\s+|la\\s+)?suscripcion",
  "no\\s+" + ES_US + "\\s+(?:escrib(?:a|as|an)|contact(?:e|es|en)|molest(?:e|es|en))(?!\\w)",
  "no\\s+" + ES_US + "\\s+(?:envi(?:e|es|en)|mand(?:e|es|en))(?!\\w)(?:\\s+" + ES_MAIL + "(?!\\w)|" + ES_SAY_END + ")",
  "no\\s+(?:" + ES_US + "\\s+)?vuelva(?:s|n)?\\s+a\\s+" + ES_WRITE,
  "(?:dej|par)(?:e|en|a|ad)\\s+de\\s+" + ES_WRITE,
  "basta\\s+de\\s+(?:correos|mails|emails|mensajes|publicidad)",
  "no\\s+(?:quiero|queremos|deseo|deseamos)\\s+(?:seguir\\s+)?recibir\\s+(?:(?:mas|sus|estos|estas|ningun|ninguna)\\s+)*" + ES_MAIL,
  "(?:no\\s+" + ES_US + "\\s+interesan?|no\\s+(?:estoy|estamos)\\s+interesad[oa]s?|no\\s+(?:tengo|tenemos)\\s+(?:ningun\\s+)?interes)" +
    "(?:\\s+(?:por\\s+ahora|por\\s+el\\s+momento|en\\s+este\\s+momento|ahora))?" + ES_SAY_END,
];
const SPANISH_RE = new RegExp("(?<!\\w)(?:" + SPANISH.join("|") + ")(?!\\w)", "gm");
const ES_NOT_FINAL_BEFORE = new Set(["no", "si", "porque", "cuando", "aun", "todavia", "como"]);
const ES_NOT_FINAL_AFTER = new RegExp(
  "(?<!\\w)(?:hasta|antes\\s+de|despues\\s+de|a\\s+partir\\s+de|mejor|whatsapp|por\\s+telefono|llam(?:e|a|en)(?:me|nos)" +
    "|escrib(?:e|a|an|eme|ame|anme|enos|anos)(?:me|nos)?|lunes|martes|miercoles|jueves|viernes|sabado|domingo|semana|mes" +
    "|enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)(?!\\w)",
);
const SPANISH_NO_THANKS = /(?<!\bo )(?<!como )(?<!si )(?<!que )(?<!porque )(?<!todavia )(?<!aun )\bno,?[ \t]+(?:muchas[ \t]+)?gracias\b(?![ \t]+(?:a|por)\b)/;

const noAccents = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "");
const spanishLines = (t: string) => noAccents(String(t ?? "").replace(MOBILE_SIGNATURE, "").split("\n").map(flat).join("\n"));

function spanishOptOut(text: string): string | null {
  for (const m of text.matchAll(SPANISH_RE)) {
    const start = m.index ?? 0;
    const lineStart = text.lastIndexOf("\n", start - 1) + 1;
    const last = /(\S+)[ \t]*$/.exec(text.slice(Math.max(lineStart, start - 40), start));
    const before = last ? last[1].replace(/^[¿¡]+/, "") : "";
    if (ES_NOT_FINAL_BEFORE.has(before) && !(before === "no" && m[0].startsWith("no"))) continue;
    const rest = text.slice(start + m[0].length);
    const end = /[.!?;\n]/.exec(rest);
    if (ES_NOT_FINAL_AFTER.test(end ? rest.slice(0, end.index) : rest)) continue;
    return m[0];
  }
  return null;
}

/** Which opt-out rule their reply trips, on what words, or null (handler._opt_out_reason). */
export function optOutReason(theirText: string, ownWords: string): { rule: string; matched: string } | null {
  const f = flat(theirText);
  for (const p of OPT_OUT_PHRASES) if (f.includes(p)) return { rule: "phrase", matched: p };
  const es = spanishOptOut(spanishLines(theirText));
  if (es) return { rule: "phrase", matched: es };
  for (const line of String(theirText ?? "").split("\n")) {
    const l = flat(line);
    const a = SPANISH_NO_THANKS.exec(noAccents(l));
    if (a) return { rule: "no_thanks", matched: a[0] };
    const b = NO_THANKS.exec(l);
    if (b) return { rule: "no_thanks", matched: b[0] };
  }
  let bare = flat(String(ownWords ?? "").replace(MOBILE_SIGNATURE, ""));
  bare = noAccents(bare).replace(/[^\w\s-]/g, "").trim();
  const trimmed = bare.split(/\s+/).filter((w) => !COURTESIES.has(w)).join(" ");
  if (BARE.has(bare) || BARE.has(trimmed)) return { rule: "only_words", matched: bare };
  return null;
}

// ─── complaints, bounces, auto-replies
const COMPLAINT = [
  "spam", "report you", "reporting you", "reported you", "harass", "complain", "cease and desist", "lawyer", "solicitor",
  "attorney", "legal action", "lawsuit", "information commissioner", "the ico", "to the ico", "blacklist", "blocklist",
];
export const complaintWords = (theirText: string) => {
  const f = flat(theirText);
  return COMPLAINT.find((p) => new RegExp(`(?<![a-z])${p.replace(/ /g, "\\s+")}`).test(f)) ?? null;
};

const BOUNCE_SENDERS = ["mailer-daemon", "postmaster", "mail delivery subsystem", "mail delivery system"];
const BOUNCE_SUBJECTS = ["delivery status notification", "undeliverable", "returned mail", "delivery failure", "failure notice",
  "could not be delivered", "delivery incomplete", "address not found", "mail delivery failed", "undelivered mail"];

export function looksLikeBounce(from: string, subject: string, contentType: string): boolean {
  const f = String(from ?? "").toLowerCase();
  const s = String(subject ?? "").toLowerCase();
  if (/multipart\/report/i.test(contentType) && /report-type="?delivery-status/i.test(contentType)) return true;
  return BOUNCE_SENDERS.some((x) => f.includes(x)) || BOUNCE_SUBJECTS.some((x) => s.includes(x));
}

export const looksLikeFeedbackReport = (contentType: string) =>
  /multipart\/report/i.test(contentType) && /report-type="?feedback-report/i.test(contentType);

const OOO_SUBJECT = /\b(out of (the )?office|automatic reply|auto(matic)?[- ]?reply|autoreply|away from (the )?office|on (annual )?leave|on holiday|on vacation|abwesenheit|fuera de la oficina|respuesta autom[aá]tica)\b/i;
const OOO_BODY = /\b(i am|i'm|we are|we're) (currently )?(out of (the )?office|away|on (annual )?leave|on holiday|on vacation)\b|\bthis is an automat(ic|ed) (reply|response|message)\b/i;

export function looksLikeAutoReply(headers: Record<string, string>, subject: string, ownWords: string): boolean {
  const auto = (headers["auto-submitted"] ?? "").trim().toLowerCase();
  if (auto && auto !== "no") return true;
  if (headers["x-autoreply"] || headers["x-autorespond"] || headers["x-autoreply-from"] || headers["x-mail-autoreply"]) return true;
  if (/^(auto_reply|auto-reply)$/i.test((headers["precedence"] ?? "").trim())) return true;
  if (OOO_SUBJECT.test(subject ?? "")) return true;
  return String(ownWords ?? "").length < 1500 && OOO_BODY.test(ownWords ?? "");
}

// ─── a clear yes
const YES = new Set(["yes", "yes please", "yeah", "yep", "sure", "ok", "okay", "go ahead", "please do", "sounds good",
  "that would be great", "that'd be great", "great", "go for it", "happy to", "yes go ahead", "yes please do",
  "yes sure", "sure go ahead", "ok go ahead", "please go ahead", "please send it", "yes send it", "send it over",
  "yes please send it", "yes please go ahead", "yes that would be great", "sure that would be great", "yes please run it",
  "please run it", "yes run it", "go on then"]);
const FILLER = new Set(["hi", "hello", "hey", "rashid", "thanks", "thank", "you", "cheers", "many"]);

/** A short reply whose first line only says yes, with no question, no "not" and no condition, and at most a short
 *  sign-off under it. Anything else goes to Rashid with no draft. */
export function clearYes(ownWords: string): boolean {
  const lines = String(ownWords ?? "").replace(MOBILE_SIGNATURE, "").split("\n").map((l) => flat(l)).filter(Boolean);
  if (!lines.length || lines.length > 4) return false;
  const all = lines.join(" ");
  if (/\?/.test(all) || /\b(not|no|don't|dont|but|if|unless|later|how much|price|cost|who|what|why)\b/.test(all)) return false;
  const words = lines[0].replace(/[^a-z'\s]/g, " ").split(/\s+/).filter((w) => w && !FILLER.has(w));
  return words.length > 0 && words.length <= 6 && YES.has(words.join(" ")) && lines.slice(1).every((l) => l.split(" ").length <= 4);
}
