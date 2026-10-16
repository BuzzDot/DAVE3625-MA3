import { test, expect } from "@playwright/test";
test("published responses resist framing, avoid caching private routes and expose no deployment files", async ({
  page,
  request,
}) => {
  const response = await page.goto("/login");
  expect(response?.status()).toBe(200);
  const headers = response!.headers();
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["content-security-policy"]).toContain(
    "frame-ancestors 'none'",
  );
  expect(headers["x-robots-tag"]).toBe("noindex, nofollow");
  expect(headers["x-powered-by"]).toBeUndefined();
  if (process.env.NEXT_PUBLIC_SUPABASE_URL)
    expect(headers["cache-control"]).toContain("no-store");
  for (const path of [
    "/.env.local",
    "/.vercel/project.json",
    "/scripts/lib/hosted-access.mjs",
  ]) {
    const result = await request.get(path);
    expect([403, 404]).toContain(result.status());
  }
});
