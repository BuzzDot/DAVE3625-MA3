"use server";
import { createRegistrationClient } from "@/lib/supabase/registration";
import type { ConfirmationStatus } from "@/lib/confirmation";

// Public key only; getUser verifies this bearer token with Supabase. Never trust
// claims decoded in the browser or mark an account confirmed ourselves.
export async function checkEmailConfirmation(
  accessToken: unknown,
): Promise<ConfirmationStatus> {
  if (
    typeof accessToken !== "string" ||
    accessToken.length > 16384 ||
    !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(accessToken)
  )
    return "invalid";
  try {
    const { data, error } =
      await createRegistrationClient().auth.getUser(accessToken);
    if (error)
      return error.status && error.status >= 500 ? "unavailable" : "invalid";
    return data.user?.email_confirmed_at ? "confirmed" : "invalid";
  } catch {
    return "unavailable";
  }
}
