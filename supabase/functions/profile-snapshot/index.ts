// profile-snapshot: the free Google Profile Check on /google-profile-check and onboarding steps 1 and 2 (P0.4-01).
// Public data only, through the Google layer's Places guard (field mask, 24 hour cache, daily cap). The Places key
// never reaches the browser. The logic and its limits are in _shared/profile-snapshot.ts.
import { getCachedSnapshot, getSnapshotPlace, searchText } from "../_shared/google/index.ts";
import { admin, APP_URL, captureError, CORS, emailLayout, esc, rateLimit, sendEmail, sha256Hex, verifyTurnstile } from "../_shared/kabsi.ts";
import { makeHandler } from "../_shared/profile-snapshot.ts";

Deno.serve(makeHandler({
  env: (name) => Deno.env.get(name),
  ip: (req) => (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown",
  today: () => new Date().toISOString().slice(0, 10),
  sha256Hex,
  rateLimit,
  giveBack: async (key) => {
    await admin().rpc("give_back_rate_limit", { p_key: key });
  },
  verifyTurnstile,
  searchText,
  getSnapshotPlace,
  getCachedSnapshot,
  saveEmail: async (row) => {
    const { error } = await admin().from("profile_check_emails").insert(row);
    if (error) throw error;
  },
  sendEmail,
  captureError,
  appUrl: APP_URL,
  cors: CORS,
  emailLayout,
  esc,
}));
