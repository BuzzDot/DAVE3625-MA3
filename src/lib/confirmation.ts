export type ConfirmationStatus =
  "confirmed" | "expired" | "invalid" | "unavailable" | "browser";

export function confirmationFailure(
  code: string | undefined,
): ConfirmationStatus {
  if (code === "otp_expired" || code === "otp_disabled") return "expired";
  if (
    code === "bad_code_verifier" ||
    code === "flow_state_not_found" ||
    code === "flow_state_expired"
  )
    return "browser";
  return "invalid";
}

export function confirmationMessage(status: ConfirmationStatus): string {
  switch (status) {
    case "confirmed":
      return "Your email is confirmed. Log in with your email and password to open your private diary.";
    case "expired":
      return "Supabase rejected this confirmation link because it is invalid, expired, already used or replaced by a newer email. Request one new confirmation and open only that newest email.";
    case "browser":
      return "This older confirmation link could not finish its browser-bound sign-in. Try logging in; if your email is still unconfirmed, request a new confirmation from this site.";
    case "unavailable":
      return "Supabase could not be reached to verify confirmation. Please try again later.";
    default:
      return "This link did not provide valid confirmation proof. Request a new confirmation from the login page and open the newest email.";
  }
}
