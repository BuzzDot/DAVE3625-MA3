export function supabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

export function supabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key)
    throw new Error("Supabase is not configured. Follow docs/SETUP.md.");
  if (key.startsWith("sb_secret_"))
    throw new Error("A secret key cannot be used as the publishable key.");
  if (key.split(".").length === 3) {
    try {
      const payload = JSON.parse(
        atob(key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
      ) as { role?: string };
      if (payload.role === "service_role" || payload.role === "supabase_admin")
        throw new Error("privileged-key");
    } catch (error) {
      if (error instanceof Error && error.message === "privileged-key")
        throw new Error(
          "A privileged key cannot be used as the publishable key.",
        );
    }
  }
  return { url, key };
}

export function siteUrl() {
  const value =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.NODE_ENV === "production" ? "" : "http://localhost:3000");
  if (!value)
    throw new Error("Set NEXT_PUBLIC_SITE_URL before enabling sign-up.");
  const url = new URL(value);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new Error("Invalid site URL.");
  return url.origin;
}
