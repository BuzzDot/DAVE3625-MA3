import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

test.use({ trace: "off", screenshot: "off", video: "off" });
test("real barcode lookup, reviewed personal food and confirmed quantity persist without changing history", async ({
  page,
  browser,
}) => {
  test.skip(
    !process.env.FORM_TEST_EMAIL || !process.env.FORM_TEST_OTHER_EMAIL,
    "Requires disposable confirmed accounts and Open Food Facts access",
  );
  test.setTimeout(120000);
  const name = `Barcode review ${test.info().project.name} ${Date.now()}`;
  const date =
    test.info().project.name === "desktop" ? "2026-10-10" : "2026-10-11";
  const api = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );
  const other = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.name));
  page.on("console", (message) => {
    // Full Chrome/Edge also request the existing app's optional favicon.
    // Keep every other console error visible to this regression test.
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
  let foodId: string | undefined;
  let returning: Awaited<ReturnType<typeof browser.newContext>> | undefined;
  async function login(target: typeof page) {
    await target.goto("/login");
    await target
      .getByLabel("Email", { exact: true })
      .fill(process.env.FORM_TEST_EMAIL!);
    await target
      .getByLabel("Password", { exact: true })
      .fill(process.env.FORM_TEST_PASSWORD!);
    await target.getByRole("button", { name: "Log in", exact: true }).click();
    await expect(target).toHaveURL(/\/workouts$/);
  }
  try {
    expect(
      (
        await api.auth.signInWithPassword({
          email: process.env.FORM_TEST_EMAIL!,
          password: process.env.FORM_TEST_PASSWORD!,
        })
      ).error,
    ).toBeNull();
    // No native detector is needed. Exercise missing hardware separately.
    await page.addInitScript(() => {
      Object.defineProperty(window, "BarcodeDetector", {
        value: undefined,
        configurable: true,
      });
      if (!navigator.mediaDevices)
        Object.defineProperty(navigator, "mediaDevices", {
          configurable: true,
          value: {},
        });
      navigator.mediaDevices.getUserMedia = async () => {
        throw new DOMException("No camera", "NotFoundError");
      };
    });
    await login(page);
    await page.goto(`/nutrition?date=${date}`);
    await page
      .getByRole("button", { name: "Food library", exact: true })
      .click();
    await page.getByRole("button", { name: "Use camera", exact: true }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "No camera was found" }),
    ).toBeVisible();
    await page.getByLabel("Product barcode").fill("123");
    await page
      .getByRole("button", { name: "Find product", exact: true })
      .click();
    await expect(
      page.getByRole("alert").filter({ hasText: "Enter an 8" }),
    ).toBeVisible();
    // OFF returns the canonical 13-digit identity for this 14-digit code.
    await page.getByLabel("Product barcode").fill("03017620422003");
    await page
      .getByRole("button", { name: "Find product", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Review food draft" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Source: Open Food Facts" }),
    ).toHaveAttribute(
      "href",
      "https://world.openfoodfacts.org/product/3017620422003",
    );
    await page.getByRole("button", { name: "Review food draft" }).click();
    await page.getByLabel("Food name", { exact: true }).fill(name);
    const kcal = Number(
      await page.getByLabel("Calories per 100 g", { exact: true }).inputValue(),
    );
    expect(kcal).toBeGreaterThan(0);
    await expect(
      page.getByRole("textbox", { name: "Description", exact: true }),
    ).toHaveValue(/Open Food Facts.*Barcode: 03017620422003/);
    await expect
      .poll(
        async () =>
          (await api.from("foods").select("id").eq("name", name)).data?.length,
      )
      .toBe(0);
    await page
      .getByRole("heading", { name: "Create food", exact: true })
      .locator("..")
      .screenshot({
        path: `test-results/${test.info().project.name}-barcode-review.png`,
      });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.getByRole("button", { name: "Save food", exact: true }).click();
    await expect(page.getByRole("status")).toHaveText("Saved to your account.");
    const food = await api
      .from("foods")
      .select("id,source,external_id,owner_id")
      .eq("name", name)
      .single();
    expect(food.error).toBeNull();
    foodId = food.data!.id;
    // This is a user-reviewed personal copy, never a trusted shared import.
    expect(food.data!.owner_id).toBeTruthy();
    expect(food.data!.external_id).toBeNull();
    expect(
      (await api.from("nutrition_entries").select("id").eq("food_id", foodId))
        .data,
    ).toEqual([]);
    await page.getByRole("searchbox", { name: "Search foods" }).fill(name);
    await page
      .getByRole("button", { name: `Log ${name}`, exact: true })
      .click();
    await page.getByLabel("Consumed quantity").fill("25");
    await page
      .getByRole("button", { name: "Save food entry", exact: true })
      .click();
    await expect(page.getByRole("status")).toHaveText("Saved to your account.");
    const entry = await api
      .from("nutrition_entries")
      .select("id,kcal_snapshot,quantity,unit_snapshot")
      .eq("food_id", foodId)
      .single();
    expect(entry.error).toBeNull();
    expect(entry.data!.quantity).toBe(25);
    expect(entry.data!.unit_snapshot).toBe("g");
    expect(entry.data!.kcal_snapshot).toBeCloseTo(kcal / 4, 3);
    await page
      .getByRole("button", { name: `Edit food ${name}`, exact: true })
      .click();
    await page.getByLabel("Calories per 100 g", { exact: true }).fill("1");
    await page.getByRole("button", { name: "Save food", exact: true }).click();
    await expect(page.getByRole("status")).toHaveText("Saved to your account.");
    expect(
      (
        await api
          .from("nutrition_entries")
          .select("kcal_snapshot")
          .eq("id", entry.data!.id)
          .single()
      ).data?.kcal_snapshot,
    ).toBeCloseTo(kcal / 4, 3);
    expect(
      (
        await other.auth.signInWithPassword({
          email: process.env.FORM_TEST_OTHER_EMAIL!,
          password: process.env.FORM_TEST_OTHER_PASSWORD!,
        })
      ).error,
    ).toBeNull();
    expect(
      (await other.from("foods").select("id").eq("id", foodId)).data,
    ).toEqual([]);
    expect(
      (
        await other
          .from("nutrition_entries")
          .select("id")
          .eq("id", entry.data!.id)
      ).data,
    ).toEqual([]);
    returning = await browser.newContext();
    const fresh = await returning.newPage();
    await login(fresh);
    await fresh.goto(`/nutrition?date=${date}`);
    await expect(
      fresh.getByRole("button", { name: `Edit entry ${name}`, exact: true }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    await returning?.close();
    if (!foodId)
      foodId = (
        await api.from("foods").select("id").eq("name", name).maybeSingle()
      ).data?.id;
    if (foodId) {
      await api.from("nutrition_entries").delete().eq("food_id", foodId);
      await api.from("foods").delete().eq("id", foodId);
    }
    await api.auth.signOut({ scope: "local" });
    await other.auth.signOut({ scope: "local" });
  }
});
