// Site 3b (R-161 item 3): the approved voice line, word for word from facts 13 ("Can I send a voice note instead of typing?"),
// shown on Home's trades section, on How it works and in the FAQ. Voice notes are on for every business since Voice 2
// (app_settings.voice_notes read back as 'on' on 12 Nov 2026), so the lines are plain; if the setting is ever turned off,
// switch these three places off with it (docs/LATER.md).
export const VOICE_LINE = "Type your message or send a voice note, in any language.";

export const VOICE_FAQ = {
  q: "Can I send a voice note instead of typing?",
  a: 'Yes, on both plans. Type your message or send a voice note, in any language: "We are closed Friday" becomes an hours change for you to approve. Every reply to a voice note starts with a line that says what Kabsi heard, so you can check it; a noisy note, or two languages in one note, can be misheard. A voice note can be up to 3 minutes and 10 MB. If Kabsi cannot hear a note clearly it asks you to send it again or type it. A voice note is never your yes: nothing goes on your Google profile until you tap Yes or type it yourself. Kabsi does not keep the audio, only the words.',
};
