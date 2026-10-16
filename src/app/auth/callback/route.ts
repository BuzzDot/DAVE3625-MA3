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
  return NextResponse.redirect(new URL("/login?confirmation=failed", origin), {
    headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
}
