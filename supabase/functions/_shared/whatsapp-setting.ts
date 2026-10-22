// Kabsi's WhatsApp number (K-122): the one setting. Empty while Kabsi has no number (the Kapso US number was deleted
// on 22 Oct 2026). While it is empty every WhatsApp link, button and line on the site, in Nora, in every email and in
// the auth emails (emails/build.py reads this file) is hidden or points to hello@kabsi.co instead.
// Turning WhatsApp back on is this one change: put the number here in the form "+1 201 555 0100", then rebuild the
// email previews and auth emails and update knowledge/kabsi-facts.md (tests/whatsapp.test.ts says what is out of date).
export const WHATSAPP_NUMBER: string = "";
export const WHATSAPP_ON = WHATSAPP_NUMBER.trim() !== "";
export const WHATSAPP_DIGITS = WHATSAPP_NUMBER.replace(/\D/g, "");
