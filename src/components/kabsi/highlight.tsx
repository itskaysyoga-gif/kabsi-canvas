// Design 9 highlight (Industries 2, master plan 30.32 item 3): one key phrase of a headline on the Kabsi-yellow bar, the
// hero's treatment B, in charcoal text (#111 on #ffd60a, 13.4:1, AA). Only on a light background (ivory or white), at most once per
// headline, and never yellow text on ivory or white. On a charcoal band the headline's second sentence is yellow text
// instead (`text-phrase`), not this bar. DESIGN.md, "The highlight bar".
import type { ReactNode } from "react";

export function Highlight({ children }: { children: ReactNode }) {
  return <span className="d9-mark">{children}</span>;
}

/**
 * A headline with its key phrase on the bar. `mark` must appear once in `text`; when it does not, the headline stays plain
 * (tests/industries2.test.ts checks every page's marks, so that never ships).
 */
export function Marked({ text, mark }: { text: string; mark?: string | undefined }) {
  const at = mark ? text.indexOf(mark) : -1;
  if (!mark || at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <Highlight>{mark}</Highlight>
      {text.slice(at + mark.length)}
    </>
  );
}
