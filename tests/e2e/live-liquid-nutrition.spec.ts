import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
test.use({ trace: "off", screenshot: "off", video: "off" });
test("liquid barcode review, ml portions, zeros and historical persistence", async ({
  page,
  browser,
}) => {
  const live = process.env.FORM_LIQUID_LIVE_TESTS === "1";
  test.skip(
    !live && process.env.FORM_OFF_FIXTURES !== "1",
    "Requires explicitly enabled live OFF checks or isolated local OFF fixtures",
  );
  if (live && process.env.FORM_OFF_FIXTURES === "1")
    throw new Error("Live OFF checks cannot use provider fixtures.");
  test.setTimeout(120000);
  test.info().annotations.push({
    type: "verification-scope",
    description: live
      ? "Real OFF liquid responses; deployed application and real Supabase Auth/PostgreSQL/RLS; no provider/decoder mocks or physical-device claim."
      : "Deterministic OFF liquid responses; real local Supabase Auth/PostgreSQL/RLS and actual browser form/persistence interactions. No production or physical-device test.",
  });
  const api = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );
  const date =
    test.info().project.name === "desktop" ? "2026-10-20" : "2026-10-21";
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      !message.location().url.endsWith("/favicon.ico")
    )
      errors.push(message.text());
  });
  page.on("requestfailed", (request) => {
    if (request.failure()?.errorText !== "net::ERR_ABORTED")
      errors.push(new URL(request.url()).pathname);
  });
  async function login(p: typeof page) {
    await p.goto("/login");
    await p
      .getByLabel("Email", { exact: true })
      .fill(process.env.FORM_TEST_EMAIL!);
    await p
      .getByLabel("Password", { exact: true })
      .fill(process.env.FORM_TEST_PASSWORD!);
    await p.getByRole("button", { name: "Log in", exact: true }).click();
    await expect(p).toHaveURL(/\/workouts$/);
    await p.goto(`/nutrition?date=${date}`);
  }
  const result = await api.auth.signInWithPassword({
    email: process.env.FORM_TEST_EMAIL!,
    password: process.env.FORM_TEST_PASSWORD!,
  });
  expect(result.error).toBeNull();
  await login(page);
  const names: string[] = [];
  const products = live
    ? ([
        ["9002490100070", 46, 11, 250],
        ["5449000133328", 0.2, 0, 330],
        ["3057640257858", 0, 0, 500],
      ] as const)
    : ([
        ["9002490100070", 46, 11, 250],
        ["9002490100315", 3, 0, 330],
        ["3068320120253", 0, 0, 500],
      ] as const);
  for (const [code, kcal, sugars, amount] of products) {
    const name = `Liquid ${code} ${test.info().project.name} ${Date.now()}`;
    names.push(name);
    await page
      .getByRole("button", { name: "Food library", exact: true })
      .click();
    await page.getByLabel("Product barcode").fill(code);
    await page
      .getByRole("button", { name: "Find product", exact: true })
      .click();
    await expect(
      page.getByText("Per 100 ml. Unknown nutrients stay unknown."),
    ).toBeVisible();
    await expect(
      page.getByText(`Sugars: ${sugars} g per 100 ml`, { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Review food draft", exact: true })
      .click();
    await expect(
      page.getByLabel("Calories per 100 ml", { exact: true }),
    ).toHaveValue(String(kcal));
    await expect(
      page.getByLabel("Sugars per 100 ml", { exact: true }),
    ).toHaveValue(String(sugars));
    await page.getByLabel("Food name", { exact: true }).fill(name);
    await page.getByRole("button", { name: "Save food", exact: true }).click();
    await expect(page.getByRole("status")).toHaveText("Saved to your account.");
    await page.getByRole("searchbox", { name: "Search foods" }).fill(name);
    await page
      .getByRole("button", { name: `Log ${name}`, exact: true })
      .click();
    const logger = page.getByTestId("nutrition-log-editor");
    const options = await logger
      .getByLabel("Quantity unit")
      .locator("option")
      .allTextContents();
    expect(options.join(" ")).not.toContain("grams (g)");
    for (const size of [250, 330, 500])
      expect(options.join(" ")).toContain(`${size} ml`);
    await logger.getByLabel("Quantity unit").selectOption(`volume-${amount}`);
    await logger.getByLabel("Consumed quantity").fill("1");
    await logger
      .getByRole("button", { name: "Save food entry", exact: true })
      .click();
    await expect(page.getByRole("status")).toHaveText("Saved to your account.");
    const entry = await api
      .from("nutrition_entries")
      .select("*")
      .eq("name_snapshot", name)
      .single();
    expect(entry.error).toBeNull();
    expect(entry.data.ml_snapshot).toBe(amount);
    expect(entry.data.grams_snapshot).toBeNull();
    expect(entry.data.kcal_snapshot).toBeCloseTo((kcal * amount) / 100, 3);
    expect(entry.data.nutrients_snapshot.sugars.amount).toBeCloseTo(
      (sugars * amount) / 100,
      3,
    );
    await page.reload();
    await expect(page.locator("main")).not.toContainText(`1 volume-${amount}`);
    await expect(
      page.getByRole("button", { name: `Edit entry ${name}`, exact: true }),
    ).toBeVisible();
    if (kcal === 46) {
      expect(
        (
          await api
            .from("foods")
            .update({ kcal_per_100g: 99, portions: [] })
            .eq("id", entry.data.food_id)
        ).error,
      ).toBeNull();
      await page
        .getByRole("button", { name: `Edit entry ${name}`, exact: true })
        .click();
      await logger.getByLabel("Consumed quantity").fill("2");
      await expect(logger).toContainText("230 kcal");
      await logger
        .getByRole("button", { name: "Save entry changes", exact: true })
        .click();
      await expect(page.getByRole("status")).toHaveText(
        "Saved to your account.",
      );
      const corrected = await api
        .from("nutrition_entries")
        .select("*")
        .eq("id", entry.data.id)
        .single();
      expect(corrected.data.kcal_snapshot).toBe(230);
      expect(corrected.data.ml_snapshot).toBe(500);
    }
  }
  await page.getByRole("button", { name: "Food library", exact: true }).click();
  // This live OFF record has a volume but lacks a confirmed nutrition label.
  // The local fixture instead supplies explicitly conflicting weight/volume metadata.
  await page
    .getByLabel("Product barcode")
    .fill(live ? "9002490216030" : "0999999999999");
  await page.getByRole("button", { name: "Find product", exact: true }).click();
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "nutrition basis could not be confirmed" }),
  ).toBeVisible();
  const device = test.info().project.use;
  const fresh = await browser.newContext({
    viewport: device.viewport,
    userAgent: device.userAgent,
    isMobile: device.isMobile,
    hasTouch: device.hasTouch,
    deviceScaleFactor: device.deviceScaleFactor,
  });
  try {
    const returning = await fresh.newPage();
    await login(returning);
    for (const name of names)
      await expect(
        returning.getByRole("button", {
          name: `Edit entry ${name}`,
          exact: true,
        }),
      ).toBeVisible();
    await returning.locator("main").screenshot({
      path: `test-results/${test.info().project.name}-liquid-nutrition.png`,
    });
    expect(
      await returning.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  } finally {
    await fresh.close();
    await api.auth.signOut({ scope: "local" });
  }
  expect(errors).toEqual([]);
});
