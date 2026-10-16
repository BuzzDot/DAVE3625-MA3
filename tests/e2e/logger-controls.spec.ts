import { test, expect } from "@playwright/test";
test("shared strength logger controls work without overflow on the explicit nonpersistent preview", async ({
  page,
}) => {
  await page.goto("/demo/logger");
  await expect(
    page.getByText(
      "Authentication, autosave, and persistent saves are not simulated here.",
      { exact: false },
    ),
  ).toBeVisible();
  await page
    .getByRole("spinbutton", {
      name: "Barbell bench press set 1 weight (kg)",
      exact: true,
    })
    .fill("60");
  await page
    .getByRole("spinbutton", {
      name: "Barbell bench press set 1 repetitions",
      exact: true,
    })
    .fill("8");
  await page
    .getByRole("button", {
      name: "Complete Barbell bench press set 1",
      exact: true,
    })
    .click();
  await expect(page.getByRole("status")).toContainText("480 kg");
  await page
    .getByRole("combobox", {
      name: "Barbell bench press set 1 type",
      exact: true,
    })
    .selectOption("warmup");
  await expect(page.getByRole("status")).toContainText("0 kg");
  await page.locator("details").first().locator("summary").click();
  await page
    .getByRole("spinbutton", {
      name: "Barbell bench press set 1 RPE",
      exact: true,
    })
    .fill("8");
  await page
    .getByRole("spinbutton", {
      name: "Barbell bench press set 1 RIR",
      exact: true,
    })
    .fill("2");
  await page.getByRole("button", { name: "Add set", exact: true }).click();
  await expect(
    page.getByRole("spinbutton", {
      name: "Barbell bench press set 4 repetitions",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Add demo row exercise", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Move Bent-over row up", exact: true })
    .click();
  await expect(page.getByRole("heading", { level: 2 }).first()).toHaveText(
    "Bent-over row",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: `test-results/${test.info().project.name}-logger-controls.png`,
    fullPage: true,
  });
  await page.reload();
  await expect(page.getByRole("status")).toContainText("0 kg");
});
