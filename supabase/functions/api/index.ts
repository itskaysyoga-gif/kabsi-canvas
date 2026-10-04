// api: one Edge Function, four routes (one deploy keeps the shared code identical everywhere):
//   /api/cron-tick  internal, pg_cron every 5 min (x-cron-secret)
//   /api/dispatch   internal, the job dispatcher, woken by pg_cron when a job is due (x-cron-secret)
//   /api/action     public, email action links (the token is the credential)
//   /api/approve    signed-in members (checked inside with the user's JWT)
import { CORS, json } from "../_shared/kabsi.ts";
import { cronTick } from "./cron.ts";
import { action } from "./action.ts";
import { approve } from "./approve.ts";
import { dispatch } from "./jobs.ts";

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  const route = new URL(req.url).pathname.split("/").filter(Boolean).pop();
  if (route === "cron-tick") return cronTick(req);
  if (route === "dispatch") return dispatch(req);
  if (route === "action") return action(req);
  if (route === "approve") return approve(req);
  return json({ error: "not_found" }, 404);
});
