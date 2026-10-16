import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { siteUrl, supabaseConfigured } from "@/lib/supabase/config";
import { confirmationFailure } from "@/lib/confirmation";
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
  const headers = {
    "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer",
  };
  if (request.nextUrl.searchParams.has("error")) {
    const failure = confirmationFailure(
      request.nextUrl.searchParams.get("error_code") ?? undefined,
    );
    return NextResponse.redirect(`${origin}/login?confirmation=${failure}#`, {
      headers,
    });
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
  if (code)
    return NextResponse.redirect(`${origin}/login?confirmation=browser#`, {
      headers,
    });
  // Preserve an implicit fragment only to our own confirmation page. Fragments
  // never reach this server; the page clears and verifies them with Supabase.
  return NextResponse.redirect(`${origin}/auth/confirm`, { headers });
}
