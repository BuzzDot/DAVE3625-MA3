"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { siteUrl, supabaseConfigured } from "@/lib/supabase/config";
import { authCredentials, authErrorMessage } from "@/lib/auth-validation";
import { createRegistrationClient } from "@/lib/supabase/registration";

export type AuthResult = { error?: string; message?: string };
export async function authenticate(
  mode: "login" | "signup",
  _previous: AuthResult,
  form: FormData,
): Promise<AuthResult> {
  if (!supabaseConfigured())
    return {
      error: "Supabase is not configured. Follow the setup instructions.",
    };
  const parsed = authCredentials(mode).safeParse({
    email: form.get("email"),
    password: form.get("password"),
  });
  if (!["login", "signup"].includes(mode)) return { error: "Invalid request." };
  if (!parsed.success)
    return {
      error:
        parsed.error.issues[0]?.message ?? "Check your email and password.",
    };
  const client = await createSupabaseServerClient();
  try {
    if (mode === "signup") {
      const { error } = await createRegistrationClient().auth.signUp({
        ...parsed.data,
        options: { emailRedirectTo: `${siteUrl()}/auth/confirm` },
      });
      if (error)
        return {
          error: authErrorMessage(error.code, mode),
        };
      // Do not reveal whether an email address already exists.
      return {
        message:
          "Check your email for confirmation. Open the newest link to confirm your account, then log in.",
      };
    }
    const { error } = await client.auth.signInWithPassword(parsed.data);
    if (error)
      return {
        error: authErrorMessage(error.code, mode),
      };
  } catch {
    return { error: "Authentication is unavailable. Please try again." };
  }
  revalidatePath("/", "layout");
  redirect("/workouts");
}
export async function resendConfirmation(
  _previous: AuthResult,
  form: FormData,
): Promise<AuthResult> {
  if (!supabaseConfigured()) return { error: "Supabase is not configured." };
  const email = z.email().max(254).safeParse(form.get("email"));
  if (!email.success) return { error: "Enter a valid email address." };
  try {
    const client = createRegistrationClient();
    const { error } = await client.auth.resend({
      type: "signup",
      email: email.data,
      options: { emailRedirectTo: `${siteUrl()}/auth/confirm` },
    });
    // Avoid disclosing whether an account exists or is already confirmed.
    if (
      error &&
      !["user_not_found", "email_already_confirmed"].includes(error.code ?? "")
    )
      return { error: authErrorMessage(error.code, "resend") };
    return {
      message:
        "If this address needs confirmation, a new email has been requested. Use the newest link. If already confirmed, log in.",
    };
  } catch {
    return { error: "Authentication is unavailable. Please try again." };
  }
}
export async function logout(_previous: AuthResult): Promise<AuthResult> {
  void _previous;
  if (!supabaseConfigured()) return { error: "Supabase is not configured." };
  const client = await createSupabaseServerClient();
  const { error } = await client.auth.signOut({ scope: "local" });
  if (error) return { error: "Could not log out. Please retry." };
  revalidatePath("/", "layout");
  redirect("/login");
}
