"use client";
import Link from "next/link";
import { useActionState } from "react";
import {
  authenticate,
  logout,
  resendConfirmation,
  type AuthResult,
} from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
export function AuthForm({
  mode,
  configured,
  confirmationFailed = false,
  confirmationReceived = false,
}: {
  mode: "login" | "signup";
  configured: boolean;
  confirmationFailed?: boolean;
  confirmationReceived?: boolean;
}) {
  const [state, action, pending] = useActionState(
    authenticate.bind(null, mode),
    {} as AuthResult,
  );
  return (
    <Card className="mx-auto max-w-md">
      <p className="eyebrow">YOUR PRIVATE FITNESS DIARY</p>
      <h1>{mode === "login" ? "Welcome back." : "Start your next chapter."}</h1>
      <p className="my-4 text-sm text-muted-foreground">
        {mode === "login"
          ? "Log in to your workouts, history, and progress."
          : "Create an account to keep your training in one place."}
      </p>
      {!configured && (
        <p className="mb-5 rounded-xl bg-secondary p-4 text-sm">
          Supabase isn’t configured.{" "}
          <Link className="underline" href="/setup">
            View setup instructions
          </Link>
          . Your credentials will not be submitted.
        </p>
      )}
      <form action={action} className="space-y-4">
        <label className="block text-sm">
          Email
          <input
            className="mt-2"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
          />
        </label>
        <label className="block text-sm">
          Password
          <input
            className="mt-2"
            name="password"
            type="password"
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            required
            minLength={mode === "signup" ? 8 : 1}
            maxLength={mode === "signup" ? 72 : 1024}
          />
        </label>
        {mode === "signup" && (
          <p className="text-xs text-muted-foreground">
            Use a unique password of at least 8 characters, up to 72 bytes.
            Symbols are welcome; accented letters and emoji use extra bytes.
          </p>
        )}
        <p role="alert" className="text-sm text-red-700">
          {state.error ||
            (confirmationFailed
              ? "That confirmation link could not be completed here. Try logging in if your email is already confirmed, or request a new sign-up confirmation."
              : "")}
        </p>
        <p role="status" className="text-sm text-primary">
          {state.message ||
            (confirmationReceived
              ? "Confirmation link received. Log in with your email and password. If the link has expired, request a new confirmation below."
              : "")}
        </p>
        <Button
          className="w-full"
          disabled={pending || !configured}
          type="submit"
        >
          {pending
            ? "Please wait…"
            : mode === "login"
              ? "Log in"
              : "Create account"}
        </Button>
      </form>
      {mode === "login" && configured && <ResendConfirmationForm />}
      <p className="mt-6 text-sm text-muted-foreground">
        {mode === "login" ? "New here?" : "Already have an account?"}{" "}
        <Link
          className="font-semibold text-primary underline"
          href={mode === "login" ? "/signup" : "/login"}
        >
          {mode === "login" ? "Create an account" : "Log in"}
        </Link>
      </p>
    </Card>
  );
}
function ResendConfirmationForm() {
  const [state, action, pending] = useActionState(
    resendConfirmation,
    {} as AuthResult,
  );
  return (
    <details className="mt-6 text-sm">
      <summary className="min-h-11 cursor-pointer py-3 font-semibold text-primary">
        Resend confirmation email
      </summary>
      <form action={action} className="space-y-3">
        <label className="block">
          Confirmation email
          <input
            className="mt-2"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
          />
        </label>
        <Button variant="outline" type="submit" disabled={pending}>
          {pending ? "Please wait…" : "Send confirmation"}
        </Button>
        <p role="alert" className="text-red-700">
          {state.error}
        </p>
        <p role="status" className="text-primary">
          {state.message}
        </p>
      </form>
    </details>
  );
}
export function LogoutButton({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState(logout, {} as AuthResult);
  return (
    <form
      action={action}
      onSubmit={() => {
        try {
          for (const key of Object.keys(localStorage))
            if (key.startsWith(`form:workout:${userId}:`))
              localStorage.removeItem(key);
        } catch {}
      }}
    >
      <Button variant="outline" disabled={pending}>
        {pending ? "Logging out…" : "Log out"}
      </Button>
      <p role="alert" className="mt-2 text-xs text-red-700">
        {state.error}
      </p>
    </form>
  );
}
