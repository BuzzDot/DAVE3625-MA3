// Explicit, interactive public-signup verification. No credentials are persisted.
import { randomBytes, randomUUID } from "node:crypto";
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { target, hostedAdminKey } from "./lib/hosted-access.mjs";
process.loadEnvFile(".env.local");
const baseUrl =
  process.env.FORM_TEST_BASE_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
if (!baseUrl) throw new Error("Configure the signup verification origin.");
const parsedBase = new URL(baseUrl);
if (
  parsedBase.username ||
  parsedBase.password ||
  parsedBase.search ||
  parsedBase.hash ||
  parsedBase.pathname !== "/" ||
  !(
    parsedBase.protocol === "https:" ||
    (parsedBase.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(parsedBase.hostname))
  )
)
  throw new Error(
    "Use a plain HTTPS origin or local loopback origin for signup verification.",
  );
const email = process.env.FORM_SIGNUP_EMAIL;
if (!email) throw new Error("Set FORM_SIGNUP_EMAIL to an approved inbox.");
const password = `Signup-${randomBytes(24).toString("base64url")}!`;
const run = randomUUID();
let browser, admin, createdId;
try {
  const { url } = await target();
  admin = createClient(url, await hostedAdminKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  // Do not change or remove an existing account belonging to the inbox.
  const { data: existing, error } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (error || existing.users.length >= 1000)
    throw new Error("Cannot safely establish signup-account baseline.");
  if (
    existing.users.some((u) => u.email?.toLowerCase() === email.toLowerCase())
  )
    throw new Error(
      "Approved inbox already has an account; existing account was left unchanged.",
    );
  browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(new URL("/signup", baseUrl).href);
  await page.getByRole("textbox", { name: "Email", exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "Check your email" })
    .waitFor({ timeout: 30000 });
  const { data: users } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  const created = users.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase(),
  );
  if (!created)
    throw new Error("Public signup did not create a verification account.");
  createdId = created.id;
  const marked = await admin.auth.admin.updateUserById(createdId, {
    user_metadata: { form_signup_verification: run },
  });
  if (marked.error)
    throw new Error("Could not mark the newly created verification account.");
  console.log(
    "Public signup created an unconfirmed account. Open the confirmation email now. Temporary account will be removed after verification.",
  );
  let confirmed = false;
  for (let i = 0; i < 60; i++) {
    const { data } = await admin.auth.admin.getUserById(createdId);
    if (data.user?.email_confirmed_at) {
      confirmed = true;
      break;
    }
    if (i % 3 === 0)
      console.log(
        "Awaiting inbox confirmation; no administrator confirmation has been used.",
      );
    await new Promise((resolve) => setTimeout(resolve, 10000));
  }
  if (!confirmed)
    throw new Error("Inbox confirmation was not completed within ten minutes.");
  console.log("Real inbox confirmation verified.");
  await page.goto(new URL("/login", baseUrl).href);
  await page.getByRole("textbox", { name: "Email", exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await page.getByRole("button", { name: "Start empty workout" }).waitFor();
  await page.reload();
  await page.getByRole("button", { name: "Start empty workout" }).waitFor();
  await page.goto(new URL("/settings", baseUrl).href);
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await page.waitForURL("**/login");
  console.log(
    "Public signup, real email confirmation, login, reload persistence and logout passed.",
  );
} catch (error) {
  console.log(
    `Signup verification did not complete (${error.name}). No password or confirmation token is logged.`,
  );
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (createdId && admin) {
    const { data } = await admin.auth.admin.getUserById(createdId);
    if (data.user?.user_metadata?.form_signup_verification === run) {
      const { error } = await admin.auth.admin.deleteUser(createdId);
      console.log(
        error
          ? "Temporary signup account cleanup failed."
          : "Only the temporary signup account was removed.",
      );
      if (error) process.exitCode = 1;
    }
  }
}
