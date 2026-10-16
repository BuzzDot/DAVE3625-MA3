"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { checkEmailConfirmation } from "@/app/auth/confirm/actions";
import {
  confirmationFailure,
  confirmationMessage,
  type ConfirmationStatus,
} from "@/lib/confirmation";
import { Card } from "@/components/ui/card";

export function EmailConfirmation() {
  const [status, setStatus] = useState<ConfirmationStatus | "verifying">(
    "verifying",
  );
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    async function verify(): Promise<ConfirmationStatus> {
      const query = new URLSearchParams(window.location.search);
      const fragment = new URLSearchParams(window.location.hash.slice(1));
      // Clear both successful and failed provider responses before rendering or
      // navigating. No access/refresh token is persisted in storage or app cookies.
      window.history.replaceState(null, "", window.location.pathname);
      const error = query.get("error_code") || fragment.get("error_code");
      if (error || query.has("error") || fragment.has("error")) {
        return confirmationFailure(error ?? undefined);
      }
      const token = fragment.get("access_token");
      if (!token) {
        return "invalid";
      }
      return checkEmailConfirmation(token);
    }
    void verify()
      .then(setStatus)
      .catch(() => setStatus("unavailable"));
  }, []);
  return (
    <Card className="mx-auto max-w-md">
      <p className="eyebrow">EMAIL CONFIRMATION</p>
      <h1>
        {status === "verifying"
          ? "Checking your confirmation…"
          : status === "confirmed"
            ? "Email confirmed."
            : "Confirmation needs attention."}
      </h1>
      <p
        role={
          status === "confirmed" || status === "verifying" ? "status" : "alert"
        }
        className="my-5 text-sm text-muted-foreground"
      >
        {status === "verifying"
          ? "Verifying your confirmation securely with Supabase."
          : confirmationMessage(status)}
      </p>
      <Link
        className="inline-flex min-h-11 items-center rounded-xl bg-primary px-5 font-semibold text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-4"
        href="/login"
      >
        {status === "confirmed"
          ? "Continue to log in"
          : "Log in or request a new confirmation"}
      </Link>
    </Card>
  );
}
