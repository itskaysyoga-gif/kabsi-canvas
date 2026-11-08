import * as React from "react";

type AutoFocusHandler = (event: Event) => void;

/**
 * Live check 8 Nov 2026 (R-126): Radix gives focus back to its own Trigger only. Every sheet and dialog in the app is opened
 * by a plain button with its own onClick, so closing one (Escape, Close, or a choice) dropped focus to the top of the page.
 * This remembers the element that had focus when the dialog opened and gives it back when the dialog closes, unless the
 * caller already took over (preventDefault) or that element has left the page.
 */
export function useReturnFocus(onOpen?: AutoFocusHandler, onClose?: AutoFocusHandler) {
  const returnTo = React.useRef<HTMLElement | null>(null);
  const onOpenAutoFocus = React.useCallback(
    (event: Event) => {
      const active = document.activeElement;
      returnTo.current = active instanceof HTMLElement && active !== document.body ? active : null;
      onOpen?.(event);
    },
    [onOpen],
  );
  const onCloseAutoFocus = React.useCallback(
    (event: Event) => {
      onClose?.(event);
      const target = returnTo.current;
      returnTo.current = null;
      if (event.defaultPrevented || !target?.isConnected) return;
      event.preventDefault();
      target.focus();
    },
    [onClose],
  );
  return { onOpenAutoFocus, onCloseAutoFocus };
}
