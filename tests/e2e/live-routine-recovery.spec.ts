import { test, expect } from "@playwright/test";

// Dedicated fixtures only; never record password-bearing artifacts.
test.use({ trace: "off", screenshot: "off", video: "off" });
test("routine validation, interrupted save recovery, editing, duplication and archival", async ({
  page,
}) => {
  test.skip(
    !process.env.FORM_TEST_EMAIL || !process.env.FORM_TEST_PASSWORD,
    "Requires a confirmed dedicated test account",
  );
  test.setTimeout(90000);
  const name = `Recovery routine ${test.info().project.name} ${Date.now()}`;
  const editedName = `${name} edited`;
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      !message.text().includes("net::ERR_FAILED")
    )
      consoleErrors.push(message.text());
  });
  const failedActions: string[] = [];
  page.on("requestfailed", (request) => {
    // Next.js also cancels completed action streams during navigation.
    // Count the deliberate transport failures, excluding normal ERR_ABORTED.
    if (
      request.headers()["next-action"] &&
      request.failure()?.errorText === "net::ERR_FAILED"
    )
      failedActions.push(request.url());
  });
  await page.goto("/login");
  await page
    .getByLabel("Email", { exact: true })
    .fill(process.env.FORM_TEST_EMAIL!);
  await page
    .getByLabel("Password", { exact: true })
    .fill(process.env.FORM_TEST_PASSWORD!);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL(/\/workouts$/);
  async function interrupt(action: () => Promise<unknown>) {
    await page.route("**/workouts", async (route) => {
      if (route.request().headers()["next-action"]) await route.abort("failed");
      else await route.continue();
    });
    try {
      await action();
      await expect(
        page.getByRole("alert").filter({ hasText: "Check your connection" }),
      ).toBeVisible();
    } finally {
      await page.unroute("**/workouts");
    }
  }
  await interrupt(() =>
    page
      .getByRole("button", { name: "Start empty workout", exact: true })
      .click(),
  );
  await expect(page).toHaveURL(/\/workouts$/);
  await page
    .getByRole("button", { name: "Create routine", exact: true })
    .click();
  await page.getByLabel("Routine name", { exact: true }).fill("");
  await page.getByRole("button", { name: "Save routine", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: /.+/ })).toHaveCount(
    1,
  );
  await page.getByLabel("Routine name", { exact: true }).fill(name);
  await page.getByLabel("Search exercises").fill("Barbell bench press");
  await page
    .getByRole("button", { name: "Add Barbell bench press", exact: true })
    .click();
  await page.getByRole("button", { name: "Save routine", exact: true }).click();
  const routine = (title: string) =>
    page.locator("section").filter({
      has: page.getByRole("heading", { name: title, exact: true }),
    });
  await routine(name)
    .getByRole("button", { name: "Edit routine", exact: true })
    .click();
  await page.getByLabel("Routine name", { exact: true }).fill(editedName);
  await page
    .getByLabel("Routine notes")
    .fill("Keep this draft after a failed request.");
  let releaseFailure!: () => void;
  const failureGate = new Promise<void>((resolve) => {
    releaseFailure = resolve;
  });
  await page.route("**/workouts", async (route) => {
    if (route.request().headers()["next-action"]) {
      await failureGate;
      await route.abort("failed");
    } else await route.continue();
  });
  try {
    await page
      .getByRole("button", { name: "Save routine", exact: true })
      .click();
    await expect(
      page.getByLabel("Routine name", { exact: true }),
    ).toBeDisabled();
    await expect(page.getByLabel("Routine notes")).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Cancel editing", exact: true }),
    ).toBeDisabled();
  } finally {
    releaseFailure();
  }
  await expect(
    page.getByRole("alert").filter({ hasText: "Your edits are still here" }),
  ).toBeVisible();
  await expect(page.getByLabel("Routine name", { exact: true })).toHaveValue(
    editedName,
  );
  await expect(page.getByLabel("Routine notes")).toHaveValue(
    "Keep this draft after a failed request.",
  );
  await expect(page.getByLabel("Routine name", { exact: true })).toBeEnabled();
  expect(failedActions).toHaveLength(2);
  await page.unroute("**/workouts");
  // Only safe fixture content; login credentials are never captured.
  await page.locator("main").screenshot({
    path: `test-results/${test.info().project.name}-routine-recovery.png`,
  });
  await page.getByRole("button", { name: "Save routine", exact: true }).click();
  await expect(routine(editedName)).toBeVisible();
  await page.reload();
  await expect(routine(editedName)).toContainText(
    "Keep this draft after a failed request.",
  );
  await expect(routine(name)).toHaveCount(0);
  const copyName = `${editedName} (copy)`;
  await interrupt(() =>
    routine(editedName)
      .getByRole("button", { name: `Duplicate ${editedName}`, exact: true })
      .click(),
  );
  await expect(routine(editedName)).toBeVisible();
  await expect(routine(copyName)).toHaveCount(0);
  await routine(editedName)
    .getByRole("button", { name: `Duplicate ${editedName}`, exact: true })
    .click();
  await expect(routine(copyName)).toBeVisible();
  for (const title of [copyName, editedName]) {
    await routine(title)
      .getByRole("button", { name: "Delete routine", exact: true })
      .click();
    if (title === copyName) {
      await interrupt(() =>
        routine(title)
          .getByRole("button", { name: "Confirm delete routine", exact: true })
          .click(),
      );
      await expect(routine(title)).toBeVisible();
    }
    await routine(title)
      .getByRole("button", { name: "Confirm delete routine", exact: true })
      .click();
    await expect(routine(title)).toHaveCount(0);
  }
  await page.reload();
  await expect(routine(editedName)).toHaveCount(0);
  await expect(routine(copyName)).toHaveCount(0);
  expect(failedActions).toHaveLength(4);
  expect(errors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
