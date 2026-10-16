// Refuse to mistake a local production build for deployed-site acceptance.
import { spawn } from "node:child_process";
const value = process.env.FORM_TEST_BASE_URL;
if (!value)
  throw new Error(
    "Set FORM_TEST_BASE_URL to the deployed HTTPS origin before production acceptance.",
  );
const target = new URL(value);
if (
  target.protocol !== "https:" ||
  target.username ||
  target.password ||
  target.pathname !== "/" ||
  target.search ||
  target.hash ||
  ["localhost", "127.0.0.1", "[::1]"].includes(target.hostname)
)
  throw new Error("Production acceptance requires an external HTTPS origin.");
const response = await fetch(new URL("/login", target), {
  signal: AbortSignal.timeout(30000),
  redirect: "manual",
});
if (response.status !== 200)
  throw new Error(
    `Deployed login is unavailable (HTTP ${response.status}); check deployment/protection before testing.`,
  );
console.log(`Independent production acceptance target: ${target.origin}`);
const child = spawn(
  process.execPath,
  ["scripts/verify-hosted.mjs", ...process.argv.slice(2)],
  {
    stdio: "inherit",
    windowsHide: true,
    env: { ...process.env, FORM_TEST_BASE_URL: target.origin },
  },
);
child.once("error", () => {
  console.error("Could not start production acceptance.");
  process.exitCode = 1;
});
child.once("exit", (code) => {
  process.exitCode = code ?? 1;
});
