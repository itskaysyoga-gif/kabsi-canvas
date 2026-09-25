import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ynjdqjlmdwjgbfezevxy.supabase.co";
const supabasePublishableKey = "sb_publishable_eF-s_uWvQzj1MngyU1to6Q_aJNQZh2R";

export const supabase = createClient(supabaseUrl, supabasePublishableKey);
