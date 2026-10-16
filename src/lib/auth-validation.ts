import { z } from "zod";

export function authCredentials(mode: "login" | "signup") {
  return z.object({
    email: z.email().max(254),
    // Never trim, normalize or truncate passwords. Existing accounts may use
    // an older minimum; enforce the current policy only when creating accounts.
    password:
      mode === "signup"
        ? z
            .string()
            .min(8, "Use at least 8 characters for your password.")
            .refine(
              (value) => new TextEncoder().encode(value).length <= 72,
              "Use at most 72 bytes for your password (accented letters and emoji use extra bytes).",
            )
        : z.string().min(1, "Enter your password.").max(1024),
  });
}

export function authErrorMessage(
  code: string | undefined,
  mode: "login" | "signup" | "resend",
) {
  switch (code) {
    case "weak_password":
      return "Choose a stronger, unique password of at least 8 characters, within the 72-byte limit.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Too many attempts. Wait a few minutes before trying again or requesting another email.";
    case "email_address_not_authorized":
      return "Email delivery is restricted by this prototype's Supabase email service. Contact the project owner to enable your address or configure SMTP.";
    case "email_not_confirmed":
      return "Confirm your email before logging in. You can request a new confirmation below.";
    default:
      return mode === "login"
        ? "Unable to log in. Check your email and password, or confirm your email."
        : "The request could not be completed. Check your details or try again later.";
  }
}
