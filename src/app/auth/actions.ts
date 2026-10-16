"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { siteUrl, supabaseConfigured } from "@/lib/supabase/config";

export type AuthResult = { error?: string; message?: string };
const credentials = z.object({
  email: z.email().max(254),
  password: z.string().min(8).max(128),
});
export async function authenticate(
  mode: "login" | "signup",
  _previous: AuthResult,
  form: FormData,
): Promise<AuthResult> {
  if (!supabaseConfigured())
    return {
      error: "Supabase is not configured. Follow the setup instructions.",
    };
  const parsed = credentials.safeParse({
    email: form.get("email"),
    password: form.get("password"),
  });
  if (!parsed.success || !["login", "signup"].includes(mode))
    return { error: "Enter a valid email and a password of 8–128 characters." };
  const client = await createSupabaseServerClient();
  try {
    if (mode === "signup") {
      const { error } = await client.auth.signUp({
        ...parsed.data,
        options: { emailRedirectTo: `${siteUrl()}/auth/callback` },
      });
      if (error)
        return {
          error:
            "Sign-up could not be completed. Check your details or try again later.",
        };
      // Do not reveal whether an email address already exists.
      return {
        message:
          "Check your email for confirmation, then log in. If confirmation is disabled on your local stack, you can log in now.",
      };
    }
    const { error } = await client.auth.signInWithPassword(parsed.data);
    if (error)
      return {
        error:
          "Unable to log in. Check your email, password, and email confirmation.",
      };
  } catch {
    return { error: "Authentication is unavailable. Please try again." };
  }
  revalidatePath("/", "layout");
  redirect("/workouts");
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
