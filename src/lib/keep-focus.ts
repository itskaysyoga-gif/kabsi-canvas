// Keyboard focus after an action replaces the button that had it (Fix 1, QA 2 L7): after Approve reply or a post's
// Approve, the button is gone and focus fell to the top of the page. The new part of the card takes it instead (its Undo
// button, or the line that says where the reply is). Focus is only placed when it was lost, never taken from a field
// or button the person is on.

type FocusDoc = { activeElement: Element | null; body: HTMLElement | null };

/** Focus fell out of the page: nothing has it, the page body has it, or the element that had it is gone. */
export function focusIsLost(doc: FocusDoc): boolean {
  const a = doc.activeElement;
  return !a || a === doc.body || a.isConnected === false;
}

/** Puts focus on `el` when focus was lost; otherwise leaves it where it is. Never scrolls. Answers whether it moved. */
export function keepFocus(
  el: { focus: (o?: FocusOptions) => void } | null | undefined,
  doc: FocusDoc | undefined = typeof document === "undefined" ? undefined : document,
): boolean {
  if (!el || !doc || !focusIsLost(doc)) return false;
  el.focus({ preventScroll: true });
  return true;
}
