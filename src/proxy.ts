import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfigured, supabaseConfig } from "@/lib/supabase/config";

export async function proxy(request: NextRequest) {
  if (!supabaseConfigured()) return NextResponse.next({ request });
  let response = NextResponse.next({ request });
  const { url, key } = supabaseConfig();
  const client = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values, headers) {
        for (const { name, value } of values) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of values)
          response.cookies.set(name, value, options);
        for (const [name, value] of Object.entries(headers))
          response.headers.set(name, value);
      },
    },
  });
  // Signature-verified claims refresh expired cookie sessions. DAL/actions verify again.
  await client.auth.getClaims();
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
