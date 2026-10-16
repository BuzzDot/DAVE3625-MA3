import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseConfig } from "./config";

// Registration confirms email only. It deliberately does not create an app
// session from the email link; password login uses the request-scoped SSR client.
// No PKCE verifier is needed to confirm in a different browser.
export function createRegistrationClient() {
  const { url, key } = supabaseConfig();
  return createClient(url, key, {
    auth: {
      flowType: "implicit",
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
