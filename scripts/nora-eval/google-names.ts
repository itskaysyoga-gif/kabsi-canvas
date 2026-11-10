// Tidy 2 part 1 (master plan 30.49 item 4, R-147): Google's own product name, in the language of the answer, counts the
// same as "Google Business Profile" in Nora's evaluation checks. A Spanish answer that says "Perfil de Empresa de Google"
// is correct and honest: it is Google's name for the product in Spanish, and a check that demands the English words
// fails a right answer (sc05, Nora 2, 10 Nov 2026).
// This only widens what the `must` rules and the `warnFirst` rule accept. Nothing about Nora's answers, her rules or her
// facts changes, and the English name stays right in an English answer. It names no one's words but Google's own.
// The spellings are the names Google's interface and help pages use for the product in each language Nora answers in
// (the eval's four languages, English, Spanish, French and Arabic, and the other common ones). Lane R confirms the list
// when a new language is added; a spelling that is missing makes a right answer fail, never a wrong one pass.

/** The official name in each language, as a pattern. Case does not matter; accents may be left off; the apostrophe may be
 *  straight or curly. The English name is first and stays the fixed point: every other name stands for it. */
export const GOOGLE_PROFILE_NAMES: { lang: string; name: string; pattern: RegExp }[] = [
  { lang: "en", name: "Google Business Profile", pattern: /Google Business Profile/i },
  { lang: "es", name: "Perfil de Empresa de Google", pattern: /Perfil de Empresa (?:de|en) Google/i },
  { lang: "fr", name: "Profil d'entreprise Google", pattern: /Profil d['’]entreprise Google/i },
  { lang: "fr", name: "Fiche d'établissement Google", pattern: /Fiche d['’][eé]tablissement Google/i },
  { lang: "de", name: "Unternehmensprofil auf Google", pattern: /(?:Google[- ])?Unternehmensprofil(?: (?:auf|bei|von) Google)?/i },
  { lang: "pt", name: "Perfil da Empresa no Google", pattern: /Perfil d[ae] Empresa (?:no|do|de) Google/i },
  { lang: "it", name: "Profilo dell'attività su Google", pattern: /Profilo dell['’]attivit[aà] (?:su|di) Google/i },
  { lang: "nl", name: "Bedrijfsprofiel op Google", pattern: /(?:Google[- ])?Bedrijfsprofiel(?: (?:op|van) Google)?/i },
  { lang: "ar", name: "الملف التجاري على Google", pattern: /(?:الملف التجاري|ملف النشاط التجاري|ملف الأعمال|الملف الشخصي للنشاط التجاري) (?:على|في|من) (?:Google|جوجل|غوغل)/i },
];

/** The answer with every official name in another language written as the English name, so a rule written for the English
 *  name (`/Google Business Profile/`) reads the answer the way a person would. The English name is left as it is. */
export function withEnglishName(answer: string): string {
  let out = answer;
  for (const n of GOOGLE_PROFILE_NAMES.slice(1)) {
    out = out.replace(new RegExp(n.pattern.source, `${n.pattern.flags.replace("g", "")}g`), "Google Business Profile");
  }
  return out;
}
