// Fix 1 (QA 2 L7): after Approve reply (or a post's Approve) by keyboard, focus moves to the card's Undo, not the top of
// the page. The rule: focus is placed only when it was lost, never taken from where the person is.
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { focusIsLost, keepFocus } from "../src/lib/keep-focus";

const body = { isConnected: true } as unknown as HTMLElement;

describe("focus after Approve", () => {
  it("moves to Undo when the Approve button that had it is gone", () => {
    const undo = { focus: vi.fn() };
    const goneApprove = { isConnected: false } as unknown as Element;
    expect(keepFocus(undo, { activeElement: goneApprove, body })).toBe(true);
    expect(undo.focus).toHaveBeenCalledTimes(1);
    expect(undo.focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it("moves to Undo when focus fell to the page body", () => {
    const undo = { focus: vi.fn() };
    expect(keepFocus(undo, { activeElement: body, body })).toBe(true);
    expect(keepFocus(undo, { activeElement: null, body })).toBe(true);
    expect(undo.focus).toHaveBeenCalledTimes(2);
  });

  it("never takes focus from a field or button the person is on", () => {
    const undo = { focus: vi.fn() };
    const field = { isConnected: true } as unknown as Element;
    expect(focusIsLost({ activeElement: field, body })).toBe(false);
    expect(keepFocus(undo, { activeElement: field, body })).toBe(false);
    expect(undo.focus).not.toHaveBeenCalled();
  });

  it("the review card and the post's undo bar use it for Undo and the line after it", () => {
    for (const file of [
      "src/components/reviews/review-card.tsx",
      "src/components/kabsi/d3-content-task.tsx",
    ]) {
      const src = readFileSync(file, "utf8");
      expect(src, file).toContain("if (counting) keepFocus(undoRef.current)");
      // Review of PR WEBFORMS: when the countdown ends, focus follows only if Undo had it.
      expect(src, file).toContain(
        "undoHadFocus.current = document.activeElement === undoRef.current",
      );
      expect(src, file).toContain("ref={undoRef}");
    }
  });
});
