"use server";
import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { timezoneSchema } from "@/lib/diary/domain";
import type { Result } from "@/lib/nutrition/types";
export async function saveTimezone(value: unknown): Promise<Result> {
  const viewer = await getViewer();
  if (!viewer.user)
    return {
      success: false,
      error: "Log in again before changing your timezone.",
    };
  const parsed = timezoneSchema.safeParse(value);
  if (!parsed.success)
    return {
      success: false,
      error: "Enter a valid IANA timezone, for example Europe/Oslo.",
    };
  try {
    const client = await createSupabaseServerClient();
    const profile = await client
      .from("profiles")
      .select("display_name")
      .eq("id", viewer.user.id)
      .maybeSingle();
    if (profile.error) throw profile.error;
    const r = await client.from("profiles").upsert({
      id: viewer.user.id,
      display_name: profile.data?.display_name ?? "Your diary",
      timezone: parsed.data,
    });
    if (r.error) throw r.error;
    for (const path of ["/settings", "/", "/calendar", "/health", "/nutrition"])
      revalidatePath(path);
    return { success: true };
  } catch {
    return {
      success: false,
      error: "Could not save your timezone. Check your connection and retry.",
    };
  }
}
