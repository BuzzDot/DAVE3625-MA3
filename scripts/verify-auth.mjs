// Real hosted Auth and browser verification; generated link does NOT test email delivery.
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { chromium, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { target, hostedAdminKey } from "./lib/hosted-access.mjs";
process.loadEnvFile(".env.local");
const origin = process.env.FORM_AUTH_TEST_URL ?? "http://localhost:3000";
const parsed = new URL(origin);
if (
  parsed.origin !== origin ||
  !(
    parsed.protocol === "https:" ||
    (parsed.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(parsed.hostname))
  )
)
  throw new Error("Use an HTTPS or loopback origin.");
const run = randomUUID();
const email = `form-auth-${run}@example.com`;
const password = `Å!<>$\\\"' ${randomBytes(28).toString("base64url")}!`;
const contextOptions =
  process.env.FORM_AUTH_TEST_MOBILE === "1"
    ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }
    : {};
let admin,
  browser,
  id,
  step = "provisioning";
try {
  const { url } = await target();
  admin = createClient(url, await hostedAdminKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await admin.auth.admin.generateLink({
    type: "signup",
    email,
    password,
    options: {
      redirectTo: `${origin}/auth/confirm`,
      data: { form_auth_verification: run },
    },
  });
  if (error || !data.user || !data.properties?.action_link)
    throw new Error("Provisioning failed.");
  id = data.user.id;
  assert.equal(Boolean(data.user.email_confirmed_at), false);
  browser = await chromium.launch();
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  step = "UTF-8 password validation";
  await page.goto(`${origin}/signup`);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("å".repeat(37));
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await expect(page.getByRole("alert").first()).toContainText("72 bytes");
  step = "unconfirmed login restriction";
  await page.goto(`${origin}/login`);
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page.getByRole("alert").first()).toContainText(
    "Confirm your email",
  );
  await context.close();
  step = "confirmation in a fresh browser context";
  const fresh = await browser.newContext(contextOptions);
  const confirmed = await fresh.newPage();
  await confirmed.goto(data.properties.action_link);
  await expect(
    confirmed.getByRole("heading", { name: "Email confirmed.", exact: true }),
  ).toBeVisible();
  await expect(confirmed).toHaveURL(/\/auth\/confirm$/);
  assert.equal(
    await confirmed.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    true,
  );
  assert.equal(confirmed.url().includes("access_token"), false);
  assert.equal(confirmed.url().includes("refresh_token"), false);
  const { data: user } = await admin.auth.admin.getUserById(id);
  assert.equal(Boolean(user.user?.email_confirmed_at), true);
  await confirmed.goto(`${origin}/workouts`);
  await expect(confirmed).toHaveURL(/\/login/);
  step = "strong password login, persistence and logout";
  await confirmed.getByLabel("Email", { exact: true }).fill(email);
  await confirmed.getByLabel("Password", { exact: true }).fill(password);
  await confirmed.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(
    confirmed.getByRole("button", { name: "Start empty workout" }),
  ).toBeVisible();
  await confirmed.reload();
  await expect(
    confirmed.getByRole("button", { name: "Start empty workout" }),
  ).toBeVisible();
  await confirmed.goto(`${origin}/settings`);
  await confirmed.getByRole("button", { name: "Log out", exact: true }).click();
  await expect(confirmed).toHaveURL(/\/login$/);
  step = "single-use confirmation and redirect safety";
  await confirmed.goto(data.properties.action_link);
  await expect(
    confirmed.getByRole("heading", {
      name: "Confirmation needs attention.",
      exact: true,
    }),
  ).toBeVisible();
  await expect(confirmed.getByRole("alert").first()).toContainText(
    /new confirmation/,
  );
  await confirmed.goto(
    `${origin}/auth/callback?next=https://example.com#access_token=discard-me`,
  );
  await expect(confirmed).toHaveURL(/\/auth\/confirm$/);
  await expect(
    confirmed.getByRole("heading", {
      name: "Confirmation needs attention.",
      exact: true,
    }),
  ).toBeVisible();
  await confirmed.goto(
    `${origin}/auth/callback?error=access_denied&error_code=otp_expired`,
  );
  await expect(confirmed).toHaveURL(/\/login\?confirmation=expired#?$/);
  await expect(confirmed.getByRole("alert").first()).toContainText(
    "Supabase rejected",
  );
  await confirmed.goto(`${origin}/workouts`);
  await expect(confirmed).toHaveURL(/\/login/);
  console.log(
    "PASS: strong-symbol password, UTF-8 limit, unconfirmed-login denial, cross-browser confirmation, fragment removal, password login/reload/logout, replay and redirect safety.",
  );
  console.log(
    "Confirmation used an admin-generated link; inbox delivery was not tested.",
  );
} catch (error) {
  console.log(
    `Auth verification failed at: ${step}. Credentials and links withheld.`,
  );
  console.log(
    String(error.message)
      .split("\n")[0]
      .replaceAll(email, "[fixture]")
      .replaceAll(password, "[password]")
      .replace(/https?:\/\/\S+/g, "[URL]"),
  );
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (id && admin) {
    const { data } = await admin.auth.admin.getUserById(id);
    if (data.user?.user_metadata?.form_auth_verification === run) {
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) process.exitCode = 1;
      console.log(
        error
          ? "Fixture cleanup failed."
          : "Removed this run's dedicated auth fixture.",
      );
    } else {
      process.exitCode = 1;
      console.log("Fixture marker mismatch; left unchanged.");
    }
  }
}
