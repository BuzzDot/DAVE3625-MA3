import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { siteUrl, supabaseConfigured } from "@/lib/supabase/config";
export async function GET(request: NextRequest) {
  if (!supabaseConfigured())
    return NextResponse.json(
      { error: "Authentication is not configured." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  const code = request.nextUrl.searchParams.get("code");
  let origin: string;
  try {
    origin = siteUrl();
  } catch {
    return NextResponse.json(
      { error: "The application site URL is not configured." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (code) {
    const client = await createSupabaseServerClient();
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (!error)
      return NextResponse.redirect(new URL("/workouts", origin), {
        headers: {
          "Cache-Control": "no-store",
          "Referrer-Policy": "no-referrer",
        },
      });
  }
  const result =
    code || request.nextUrl.searchParams.has("error") ? "failed" : "received";
  // An explicit empty fragment stops browsers inheriting the implicit tokens
  // from Supabase's redirect. We never read or persist those tokens. A password
  // sign-in is required before any private diary can be accessed.
  return NextResponse.redirect(`${origin}/login?confirmation=${result}#`, {
    headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
}
