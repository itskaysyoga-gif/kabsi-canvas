// Design 9 hero treatment B (master plan 30.24): the H1's second sentence on the Kabsi-yellow bar (the d9-mark utility),
// once per page, in charcoal. Its own tiny file so every PageHero can use it without loading Home's module. The bar is
// the shared Highlight component (highlight.tsx, Industries 2).
import { Highlight } from "./highlight";

/**
 * "Your business on Google. Taken care of." becomes the lead and the last sentence, which carries the bar; a
 * one-sentence title stays whole. A longer title marks only its last sentence, so the bar never covers more than one.
 */
export function splitTitle(text: string): [string | null, string] {
  const m = text.match(/^(.+\.)\s+([^.]+\.?)$/);
  return m ? [m[1]!, m[2]!] : [null, text];
}

/** The inside of the one H1 (the caller renders the <h1>, so there is always exactly one). */
export function D9Title({ text }: { text: string }) {
  const [first, second] = splitTitle(text);
  if (!first) return <>{text}</>;
  return (
    <>
      {first} <Highlight>{second}</Highlight>
    </>
  );
}
