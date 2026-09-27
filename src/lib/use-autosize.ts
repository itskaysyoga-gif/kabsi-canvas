import { useLayoutEffect, useRef } from "react";

// Grows a textarea with its text so the whole draft is visible (no inner scrollbar), between a minimum
// height and a cap. Returns the ref to put on the <textarea>.
export function useAutosize(value: string, maxPx = 560) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight + 2, maxPx)}px`;
    el.style.overflowY = el.scrollHeight + 2 > maxPx ? "auto" : "hidden";
  }, [value, maxPx]);
  return ref;
}
