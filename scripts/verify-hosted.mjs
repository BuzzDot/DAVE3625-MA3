// Explicit hosted verification, never imported by the application.
// Disposable fixture passwords and admin credentials stay in memory only.
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { randomBytes, randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { target, hostedAdminKey } from "./lib/hosted-access.mjs";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const runId = randomUUID();
const users = [];
const secrets = [];
function scrub(value) {
  let text = String(value);
  for (const secret of secrets)
    if (secret) text = text.split(secret).join("[redacted]");
  return text;
}
async function run(args, env) {
  const child = spawn(process.execPath, args, {
    env: { ...process.env, ...env },
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  for (const stream of [child.stdout, child.stderr])
    createInterface({ input: stream }).on("line", (line) =>
      console.log(scrub(line)),
    );
  const code = await new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", resolve);
  });
  if (code !== 0)
    throw new Error(`Verification command failed with exit code ${code}.`);
}
let admin;
try {
  const { url } = await target();
  const adminKey = await hostedAdminKey();
  secrets.push(adminKey, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  admin = createClient(url, adminKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const env = {};
  for (const suffix of ["", "_OTHER", "_EMPTY"]) {
    const email = `form-acceptance-${runId}${suffix.toLowerCase() || "a"}@example.com`;
    const password = `F2-${randomBytes(24).toString("base64url")}!`;
    secrets.push(password, email);
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { form_phase2_fixture: true, verification_run: runId },
    });
    if (error || !data.user)
      throw new Error("Could not provision a disposable test user.");
    users.push(data.user.id);
    env[`FORM_TEST${suffix}_EMAIL`] = email;
    env[`FORM_TEST${suffix}_PASSWORD`] = password;
  }
  console.log(
    "Provisioned three disposable, admin-confirmed fixtures (including an untouched empty account). These do not verify public signup or email delivery.",
  );
  await run(
    [
      "--import",
      "tsx",
      "--test",
      "tests/integration/supabase.test.ts",
      "tests/integration/nutrition.test.ts",
      "tests/integration/diary.test.ts",
    ],
    env,
  );
  if (process.env.FORM_TEST_BASE_URL) {
    const destination = new URL(process.env.FORM_TEST_BASE_URL);
    if (
      destination.protocol !== "https:" ||
      destination.username ||
      destination.password ||
      destination.pathname !== "/" ||
      destination.search ||
      destination.hash
    )
      throw new Error("Production verification requires a plain HTTPS origin.");
    console.log(
      `Browser target: ${destination.origin}. No local server will be started.`,
    );
  } else await run(["node_modules/next/dist/bin/next", "build"], env);
  await run(
    ["node_modules/@playwright/test/cli.js", "test", ...process.argv.slice(2)],
    env,
  );
  console.log("Hosted API and browser suites completed.");
} catch (error) {
  console.log(scrub(error.message));
  process.exitCode = 1;
} finally {
  if (admin)
    for (const id of users) {
      const { data } = await admin.auth.admin.getUserById(id);
      if (data.user?.user_metadata?.verification_run !== runId) {
        console.log("Fixture cleanup ownership check failed.");
        process.exitCode = 1;
        continue;
      }
      const { error } = await admin.auth.admin.deleteUser(id);
      if (error) {
        console.log("A disposable fixture could not be removed.");
        process.exitCode = 1;
      }
    }
  console.log(
    `Cleanup attempted only for ${users.length} users created by this verification run.`,
  );
}
