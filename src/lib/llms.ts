// Guides 3: /llms.txt is the short facts (src/content/llms-base.txt, built from knowledge/facts/llms.txt by
// node scripts/build-kb.mjs) with the public guides in its Guides section, one line each with a one-line summary.
import base from "@/content/llms-base.txt?raw";

export function llmsText(guides: { slug: string; title: string; summary: string }[]): string {
  const lines = guides
    .map((g) => `- [${g.title}](https://kabsi.co/guides/${g.slug}): ${g.summary}`)
    .join("\n");
  return base.replace(/<!-- GUIDES:[^>]*-->/, lines || "- [All guides](https://kabsi.co/guides)");
}
