import { test, expect } from "@playwright/test";
test.use({ trace: "off", screenshot: "off", video: "off" });
test("a new account has real empty states, working pages and persisted timezone preferences", async ({
  page,
}) => {
  test.skip(
    !process.env.FORM_TEST_EMPTY_EMAIL || !process.env.FORM_TEST_EMPTY_PASSWORD,
    "Requires an untouched dedicated empty account",
  );
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.name));
  await page.goto("/login");
  await page
    .getByLabel("Email", { exact: true })
    .fill(process.env.FORM_TEST_EMPTY_EMAIL!);
  await page
    .getByLabel("Password", { exact: true })
    .fill(process.env.FORM_TEST_EMPTY_PASSWORD!);
  await page.getByRole("button", { name: "Log in", exact: true }).click();
  await expect(page).toHaveURL(/\/workouts$/);
  for (const path of [
    "/",
    "/workouts",
    "/nutrition",
    "/health",
    "/calendar",
    "/progress",
    "/settings",
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(
      page.getByText("PRIVATE WORKSPACE", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Let’s take a breath." }),
    ).toHaveCount(0);
    if (path === "/")
      await expect(
        page.getByText("No consumed meals logged today."),
      ).toBeVisible();
    if (path === "/health")
      await expect(
        page.getByText("No measurements logged for this date."),
      ).toBeVisible();
    if (path === "/calendar") {
      const date = await page.getByLabel("Calendar date").inputValue();
      await expect(page.getByLabel("Workout routines")).toBeDisabled();
      await expect(
        page.getByRole("link", { name: "Open Workouts to create a routine" }),
      ).toHaveAttribute("href", `/workouts?date=${date}`);
      await expect(
        page.getByRole("button", { name: "Preview schedule" }),
      ).toBeDisabled();
      await page.getByLabel("Activity type").selectOption("meal");
      await expect(page.getByLabel("Saved meals")).toBeDisabled();
      await expect(
        page.getByRole("link", { name: "Open Nutrition to create a recipe" }),
      ).toHaveAttribute("href", `/nutrition?date=${date}&view=meals`);
      await expect(
        page.getByRole("button", { name: "Save schedule" }),
      ).toHaveCount(0);
      await page
        .getByRole("link", { name: "Open Nutrition to create a recipe" })
        .click();
      await expect(page.getByLabel("Nutrition date")).toHaveValue(date);
      await expect(
        page.getByRole("button", { name: "Saved meals", exact: true }),
      ).toHaveAttribute("aria-pressed", "true");
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.getByLabel("Diary timezone").fill("Europe/Oslo");
  await page
    .getByRole("button", { name: "Save timezone", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Timezone saved");
  await page.reload();
  await expect(page.getByLabel("Diary timezone")).toHaveValue("Europe/Oslo");
  expect(errors).toEqual([]);
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/calendar");
  await expect(page).toHaveURL(/\/login$/);
});
