// navigator.clipboard.writeText can reject with no visible error (most often on iOS Safari, when the
// tab lost focus or the OS clipboard permission needs re-asking) rather than throwing synchronously, so a
// caller that never attaches a .catch() sees the button silently do nothing on a later tap: the first
// copy works, the second (or any copy after the page loses focus) doesn't. copyText() always resolves,
// falling back to the old execCommand approach, so a caller can show a real "couldn't copy" state instead
// of failing silently.
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the execCommand fallback below
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.top = "-1000px";
    area.style.left = "-1000px";
    document.body.appendChild(area);
    area.focus();
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}
