// The first paint of a public page is the page's own HTML and one stylesheet. TanStack Start lists every script the page
// will need as <link rel="modulepreload"> in the head (about forty files, 200 KB compressed on the homepage), and on a
// slow phone those downloads compete with the stylesheet and the fonts, so the page paints about a second later
// (lane R, 22 Oct 2026, performance; docs/reports/lighthouse-home-2026-10-22.md). The hints are only hints: the page
// still loads the same scripts, one step later, as the entry script reaches them. They are dropped on public pages and
// kept on private ones (the app, sign-in, setup), where the next click matters more than the first paint.
import { isPrivatePath } from "@/lib/private-paths";

const MODULE_PRELOAD = /<link\s+rel="modulepreload"[^>]*>/g;
/** The head is far smaller than this; a response with no </head> inside the limit is passed through untouched. */
const HEAD_LIMIT = 200_000;

export function dropModulePreloads(head: string): string {
  return head.replace(MODULE_PRELOAD, "");
}

/** True for a page whose first paint matters more than its next click: a public HTML page. */
export function wantsLeanHead(request: Request, response: Response): boolean {
  if (request.method !== "GET" || response.status !== 200 || !response.body) return false;
  if (!(response.headers.get("content-type") ?? "").includes("text/html")) return false;
  return !isPrivatePath(new URL(request.url).pathname);
}

/** Streams the response through, removing the module preload hints from the head and touching nothing else. */
export function withLeanHead(response: Response): Response {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffered = "";
  let sent = false;
  const stream = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      if (sent) {
        controller.enqueue(chunk);
        return;
      }
      buffered += decoder.decode(chunk, { stream: true });
      const end = buffered.indexOf("</head>");
      if (end === -1 && buffered.length < HEAD_LIMIT) return;
      sent = true;
      controller.enqueue(
        encoder.encode(end === -1 ? buffered : dropModulePreloads(buffered.slice(0, end)) + buffered.slice(end)),
      );
      buffered = "";
    },
    flush(controller) {
      if (!sent && buffered) controller.enqueue(encoder.encode(buffered));
    },
  });
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  return new Response(response.body!.pipeThrough(stream), {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
