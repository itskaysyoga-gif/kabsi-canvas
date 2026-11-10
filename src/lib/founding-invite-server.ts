// Founding 1 (R-151): whether a slug is the current private invite is decided on the server, on each request. The page
// /founding/<slug> asks through this server function; the browser never decides, and the answer is never cached.
import { createServerFn } from "@tanstack/react-start";
import { isInviteShape } from "./founding-invite";

export type InviteCheck = { ok: boolean };

export const checkFoundingInvite = createServerFn({ method: "GET" })
  .inputValidator((slug: string) => (isInviteShape(slug) ? slug : ""))
  .handler(async ({ data: slug }): Promise<InviteCheck> => {
    if (!slug) return { ok: false };
    const { readFoundingCount } = await import("./founding-count");
    const r = await readFoundingCount(slug);
    if (r.status === "ok") return { ok: true };
    if (r.status === "not_found") return { ok: false };
    // The count could not be read, so the slug could not be checked: the page says so, never "not found" for a real invite.
    throw new Error("founding invite check unavailable");
  });
