// The nightly smoke test's alert (QA 1, master plan 30.12): when the GitHub workflow smoke.yml fails against production it calls
// `POST /whatsapp/qa/alert` with a token only that workflow holds. The route makes one ops event and tells the staff phones on
// WhatsApp. The token is checked against the Vault secret `qa_smoke_token` and can do nothing else: the text is cut to a short
// plain summary here, so nothing a failing page printed can become a message.

/** One plain line for a staff message: letters, numbers and simple marks, no dash or exclamation mark, 140 characters at most. */
export function alertSummary(raw: unknown): string {
  const s = String(typeof raw === "string" ? raw : "")
    .replace(/[–—!]/g, " ")
    .replace(/[^\p{L}\p{N} .,:;'()/+_-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140)
    .trim();
  return s || "a check failed";
}

/** The hour the alert belongs to, so a night of retries makes one message, not many. */
export const alertHour = (d: Date) => d.toISOString().slice(0, 13);
