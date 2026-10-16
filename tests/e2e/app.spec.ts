import { test, expect } from "@playwright/test";

test("all seven routes render without horizontal overflow or browser errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const path of [
    "/demo/dashboard",
    "/demo/workouts",
    "/demo/nutrition",
    "/demo/calendar",
    "/demo/progress",
    "/community",
    "/setup",
  ]) {
    const response = await page.goto(path);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    if (path !== "/setup")
      await expect(page.getByText("DEMO WORKSPACE")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  expect(errors).toEqual([]);
  await page.screenshot({
    path: `test-results/${test.info().project.name}-settings.png`,
    fullPage: true,
  });
});

test("dashboard water demo is explicit and bounded", async ({ page }) => {
  await page.goto("/demo/dashboard");
  const add = page.getByRole("button", { name: "Add 250 ml · preview only" });
  for (let i = 0; i < 4; i++) await add.click();
  await expect(
    page.getByRole("button", { name: "Demo goal reached" }),
  ).toBeDisabled();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Add 250 ml · preview only" }),
  ).toBeEnabled();
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
  });
  await page.screenshot({
    path: `test-results/${test.info().project.name}-dashboard.png`,
    fullPage: true,
  });
});

test("demo workout records completed sets only and resets on reload", async ({
  page,
}) => {
  await page.goto("/demo/workouts");
  await page.getByRole("button", { name: "Try demo session" }).first().click();
  await expect(
    page.getByRole("button", { name: "Finish demo session" }),
  ).toBeDisabled();
  await page
    .getByRole("spinbutton", {
      name: "Barbell bench press set 1 weight",
      exact: true,
    })
    .fill("60");
  await page
    .getByRole("button", {
      name: "Complete Barbell bench press set 1",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Finish demo session" }).click();
  await expect(page.getByText("1 sets · 480 kg")).toBeVisible();
  await expect(page.getByRole("status")).toContainText(
    "held only on this page",
  );
  await page.reload();
  await expect(page.getByText("1 sets · 480 kg")).toHaveCount(0);
  await page
    .getByRole("textbox", { name: "Search routines" })
    .fill("does not exist");
  await expect(page.getByText("No routines match your search.")).toBeVisible();
});

test("manual demo food updates displayed macro totals", async ({ page }) => {
  await page.goto("/demo/nutrition");
  await page.getByRole("button", { name: "Try an entry" }).click();
  await page.getByRole("textbox", { name: "Food name" }).fill("Test apple");
  await page.getByRole("spinbutton", { name: "calories (kcal)" }).fill("95");
  await page.getByRole("spinbutton", { name: "protein (g)" }).fill("1");
  await page.getByRole("spinbutton", { name: "carbs (g)" }).fill("25");
  await page.getByRole("spinbutton", { name: "fat (g)" }).fill("0");
  await page.getByRole("button", { name: "Add demo entry" }).click();
  await expect(page.getByRole("heading", { name: "Test apple" })).toBeVisible();
  await expect(page.getByText("1935", { exact: false })).toBeVisible();
});

test("calendar changes dates and months and progress changes metrics", async ({
  page,
}) => {
  await page.goto("/demo/calendar");
  await page
    .getByRole("button", {
      name: "2026-10-17, has planned activity",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("heading", { name: "Meal prep for the week" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Next month" }).click();
  await expect(
    page.getByRole("heading", { name: "November 2026" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Demo day" }).click();
  await expect(
    page.getByRole("heading", { name: "October 2026" }),
  ).toBeVisible();
  await page.goto("/demo/progress");
  await page.getByRole("combobox", { name: "Metric" }).selectOption("weight");
  await expect(
    page.getByRole("img", { name: /Demo weekly weight chart/ }),
  ).toBeVisible();
});

test("keyboard skip link reaches main content and unknown paths return 404", async ({
  page,
}) => {
  await page.goto("/demo/dashboard");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main$/);
  const response = await page.goto("/unknown-module");
  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: "A little off track." }),
  ).toBeVisible();
});
