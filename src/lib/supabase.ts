import { createClient } from "@supabase/supabase-js";

export const supabaseUrl = "https://ynjdqjlmdwjgbfezevxy.supabase.co";
const supabasePublishableKey = "sb_publishable_eF-s_uWvQzj1MngyU1to6Q_aJNQZh2R";

// Public "anon" JWT (safe in the browser, like the publishable key). Edge Functions with JWT verification on
// reject calls that carry no token, so anonymous browser calls (email action links, Nora, forms) send this one (D295).
export const anonJwt =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InluamRxamxtZHdqZ2JmZXpldnh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzMDA5NzAsImV4cCI6MjEwNTg3Njk3MH0.VfPtwbV2h1-HevQMW8PjVYsO48SHBZ6vXnRivEu07vA";
export const anonHeaders = { apikey: anonJwt, authorization: `Bearer ${anonJwt}` } as const;

export const supabase = createClient(supabaseUrl, supabasePublishableKey);
