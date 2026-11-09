// The FAQPage JSON-LD builder. The questions themselves are in src/components/kabsi/faq-data.ts (Sync 2a, PUB-09: the
// old FAQ array here was not rendered anywhere and held out of date lines, so it is gone). Answers are plain text.
// Launch 4: no default list, so a route head that builds FAQPage markup does not pull FAQ into the shared entry script.
export const faqJsonLd = (items: { q: string; a: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: items.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
});
