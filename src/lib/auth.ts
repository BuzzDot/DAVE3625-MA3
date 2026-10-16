import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/config";

export const getViewer = cache(async () => {
  if (!supabaseConfigured())
    return { status: "unconfigured" as const, user: null };
  try {
    const client = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await client.auth.getUser();
    if (error)
      return {
        status:
          error.name === "AuthSessionMissingError" ||
          error.status === 401 ||
          error.status === 403
            ? ("anonymous" as const)
            : ("unavailable" as const),
        user: null,
      };
    return {
      status: user ? ("authenticated" as const) : ("anonymous" as const),
      user,
    };
  } catch {
    return { status: "unavailable" as const, user: null };
  }
});

export async function requireUser() {
  const viewer = await getViewer();
  if (!viewer.user) {
    if (viewer.status === "anonymous") redirect("/login");
    throw new Error(
      viewer.status === "unconfigured"
        ? "Configure Supabase before using your private diary."
        : "The authentication service is unavailable. Please retry.",
    );
  }
  return viewer.user;
}
