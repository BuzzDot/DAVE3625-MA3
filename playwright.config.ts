import { defineConfig, devices } from "@playwright/test";
import { existsSync } from "node:fs";
for (const file of [".env.local", ".env.test.local"])
  if (existsSync(file)) process.loadEnvFile(file);
// An explicit HTTPS target tests the deployed app without starting any local server.
const remoteTarget = process.env.FORM_TEST_BASE_URL;
if (remoteTarget) {
  const parsed = new URL(remoteTarget);
  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    parsed.pathname !== "/"
  )
    throw new Error("FORM_TEST_BASE_URL must be a plain HTTPS origin.");
}
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 2,
  reporter: "list",
  expect: { timeout: 15000 },
  use: {
    baseURL: remoteTarget ?? "http://127.0.0.1:3100",
    trace: remoteTarget ? "off" : "retain-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: remoteTarget
    ? undefined
    : {
        command: "npm run start -- --hostname 127.0.0.1 --port 3100",
        url: "http://127.0.0.1:3100",
        reuseExistingServer: false,
        timeout: 120000,
      },
});
