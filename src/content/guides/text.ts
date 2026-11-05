// The words a reader sees in a guide, without rendering it (no router needed): strings are collected from every prop of
// every element, so Steps' items, Callout's title and a DoDont list count too. Used for the reading time, the word-count
// test (900 to 1,800) and the claim check.
import { isValidElement, type ReactNode } from "react";
import type { GuideDoc } from "./types";

function collect(node: unknown, out: string[]): void {
  if (node === null || node === undefined || typeof node === "boolean") return;
  if (typeof node === "string" || typeof node === "number") {
    out.push(String(node));
    return;
  }
  if (Array.isArray(node)) {
    for (const n of node) collect(n, out);
    return;
  }
  if (isValidElement(node)) {
    const props = node.props as Record<string, unknown>;
    for (const [k, v] of Object.entries(props)) {
      if (k === "className" || k === "id" || k === "to" || k === "href" || k === "slug") continue;
      if (k === "params" || k === "icon" || k === "rel" || k === "target") continue;
      collect(v, out);
    }
    return;
  }
  if (typeof node === "object") {
    for (const v of Object.values(node as Record<string, unknown>)) collect(v, out);
  }
}

export function textOf(node: ReactNode | unknown): string {
  const out: string[] = [];
  collect(node, out);
  return out.join(" ").replace(/\s+/g, " ").trim();
}

/** Everything a reader reads in the guide's article, in page order. */
export function guideText(g: GuideDoc): string {
  return [
    g.answer,
    ...g.inShort,
    ...g.sections.flatMap((s) => [s.heading, s.answer, textOf(s.body)]),
    g.kabsi.heading,
    textOf(g.kabsi.body),
    ...(g.faqs ?? []).flatMap((f) => [f.q, f.a]),
  ]
    .filter(Boolean)
    .join("\n");
}

export const wordCount = (text: string) =>
  text.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
