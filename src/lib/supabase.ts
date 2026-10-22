import { createClient } from "@supabase/supabase-js";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase-config";
import { SUPABASE_READY_EVENT } from "@/lib/stored-session";
import { makeSessionFetch } from "@/lib/session-ended";

// The Supabase client. Importing this file loads supabase-js, so a public page imports `@/lib/supabase-config` for the
// URL and the anon headers and loads this file only when it needs a session (see auth-provider.tsx).
export { anonHeaders, anonJwt, supabaseUrl } from "@/lib/supabase-config";

// Every call made as a signed-in person goes through sessionFetch: a session Kabsi no longer accepts ends here, with
// "Your session ended. Sign in again." on screen (session-ended.ts).
export const sessionFetch = makeSessionFetch((...a) => fetch(...a), supabasePublishableKey);
export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  global: { fetch: sessionFetch },
});

// Tell the auth provider the client exists (it may have been loaded by the sign-up sheet, not by the provider).
if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
  (window as { __kabsiSupabase?: boolean }).__kabsiSupabase = true;
  window.dispatchEvent(new Event(SUPABASE_READY_EVENT));
}
