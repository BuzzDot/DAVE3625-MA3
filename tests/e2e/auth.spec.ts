import { test, expect } from "@playwright/test";
test("private routes never expose a demo identity or live diary to an anonymous visitor", async ({
  page,
}) => {
  for (const path of [
    "/",
    "/calendar",
    "/health",
    "/workouts",
    "/nutrition",
    "/progress",
    "/settings",
    "/workouts/11111111-1111-4111-8111-111111111111",
  ]) {
    await page.goto(path);
    await expect(
      page.getByRole("button", { name: "Start empty workout" }),
    ).toHaveCount(0);
    await expect(page.getByText("Jamie Davis", { exact: true })).toHaveCount(0);
    await expect(
      page.getByRole("heading", {
        name: /Connect your training space\.|Welcome back\.|Connection needs attention\./,
      }),
    ).toBeVisible();
  }
});
test("auth forms reflect whether Supabase is configured", async ({ page }) => {
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  await page.goto("/signup");
  if (configured) {
    await expect(
      page.getByRole("button", { name: "Create account" }),
    ).toBeEnabled();
    await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute(
      "minlength",
      "8",
    );
    return;
  }
  await expect(
    page.getByRole("button", { name: "Create account" }),
  ).toBeDisabled();
  await expect(
    page.getByText("Your credentials will not be submitted.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("link", { name: "View setup instructions" }).click();
  await expect(
    page.getByRole("heading", { name: "Make room for your real progress." }),
  ).toBeVisible();
});
