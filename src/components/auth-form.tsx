"use client";
import Link from "next/link";
import { useActionState } from "react";
import { authenticate, logout, type AuthResult } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
export function AuthForm({
  mode,
  configured,
  confirmationFailed = false,
}: {
  mode: "login" | "signup";
  configured: boolean;
  confirmationFailed?: boolean;
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
            minLength={8}
            maxLength={128}
          />
        </label>
        <p className="text-xs text-muted-foreground">Use 8–128 characters.</p>
        <p role="alert" className="text-sm text-red-700">
          {state.error ||
            (confirmationFailed
              ? "That confirmation link could not be completed here. Try logging in if your email is already confirmed, or request a new sign-up confirmation."
              : "")}
        </p>
        <p role="status" className="text-sm text-primary">
          {state.message}
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
