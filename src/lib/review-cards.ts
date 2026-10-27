// The print-ready counter card and table card (V3, supabase/functions/review-cards): POST { code, kind } with the member's
// token, and the answer is a PDF. Nothing is stored; the card carries the business's own link and name only.
import { supabase, sessionFetch, supabaseUrl } from "@/lib/supabase";
import { endSession } from "@/lib/session-ended";

export type PrintKind = "counter" | "tent";
export const PRINT_FILE: Record<PrintKind, string> = {
  counter: "kabsi-counter-card.pdf",
  tent: "kabsi-table-card.pdf",
};
const FALLBACK = "The card did not come out. Try again.";

/** Fetches the PDF. Throws an Error with a plain line when it does not come. */
export async function fetchPrintCard(code: string, kind: PrintKind): Promise<Blob> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw endSession();
  const res = await sessionFetch(`${supabaseUrl}/functions/v1/review-cards`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ code, kind }),
  });
  if (!res.ok || !(res.headers.get("content-type") ?? "").includes("pdf")) {
    const body = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(body.message || FALLBACK);
  }
  return res.blob();
}

/** Saves the PDF with its own name (a phone opens it from the download). */
export function savePdf(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
