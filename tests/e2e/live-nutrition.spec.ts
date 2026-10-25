import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
test.use({ trace: "off", screenshot: "off", video: "off" });
test("Norwegian food, custom food, saved recipes, dated goals and fresh-browser nutrition persistence", async ({
  page,
  browser,
}) => {
  test.skip(
    !process.env.FORM_TEST_EMAIL || !process.env.FORM_TEST_OTHER_EMAIL,
    "Requires two confirmed dedicated accounts",
  );
  test.setTimeout(90000);
  const name = `Browser meal ${test.info().project.name} ${Date.now()}`;
  const foodName = `Browser food ${test.info().project.name} ${Date.now()}`;
  const date =
    test.info().project.name === "desktop" ? "2026-10-12" : "2026-10-13";
  const api = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );
  let returningContext:
    Awaited<ReturnType<typeof browser.newContext>> | undefined;
  const baselineIds = new Set<string>();
  async function login(target: typeof page) {
    await target.goto("/login");
    await target
      .getByRole("textbox", { name: "Email", exact: true })
      .fill(process.env.FORM_TEST_EMAIL!);
    await target
      .getByLabel("Password", { exact: true })
      .fill(process.env.FORM_TEST_PASSWORD!);
    await target.getByRole("button", { name: "Log in", exact: true }).click();
    await expect(target).toHaveURL(/\/workouts$/);
  }
  async function saved(target: typeof page) {
    await expect(target.getByRole("status")).toHaveText(
      "Saved to your account.",
    );
  }
  try {
    const initial = await api.auth.signInWithPassword({
      email: process.env.FORM_TEST_EMAIL!,
      password: process.env.FORM_TEST_PASSWORD!,
    });
    expect(initial.error).toBeNull();
    const baseline = await api
      .from("nutrition_entries")
      .select("id")
      .eq("local_date", date);
    expect(baseline.error).toBeNull();
    for (const row of baseline.data ?? []) baselineIds.add(row.id);
    await login(page);
    await page.goto(`/nutrition?date=${date}`);
    await expect(
      page.getByRole("heading", { name: "Good food. Good energy." }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Food library", exact: true })
      .click();
    await page
      .getByRole("searchbox", { name: "Search foods" })
      .fill("Havregryn");
    await page
      .getByRole("button", { name: "Log Havregryn", exact: true })
      .click();
    await page
      .getByRole("spinbutton", { name: "Consumed quantity" })
      .fill("50");
    await page
      .getByRole("button", { name: "Save food entry", exact: true })
      .click();
    await saved(page);
    await expect(page.getByTestId("daily-kcal")).toHaveText("184.5");
    await page
      .getByRole("button", { name: "Create food", exact: true })
      .click();
    await page
      .getByRole("textbox", { name: "Food name", exact: true })
      .fill(foodName);
    for (const [label, value] of [
      ["Calories", "200"],
      ["Protein", "10"],
      ["Carbohydrates", "30"],
      ["Fat", "5"],
    ])
      await page
        .getByRole("spinbutton", { name: `${label} per 100 g`, exact: true })
        .fill(value);
    await page
      .getByRole("button", { name: "Add serving unit", exact: true })
      .click();
    await page.getByRole("textbox", { name: "Serving name" }).fill("slice");
    await page.getByRole("spinbutton", { name: "Serving 1 grams" }).fill("40");
    await page.getByRole("button", { name: "Save food", exact: true }).click();
    await saved(page);
    await page.getByRole("searchbox", { name: "Search foods" }).fill(foodName);
    await expect(
      page.getByRole("heading", { name: foodName, exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: `Favorite food ${foodName}`, exact: true })
      .click();
    await saved(page);
    await page
      .getByRole("combobox", { name: "Food filter" })
      .selectOption("favorites");
    await expect(
      page.getByRole("heading", { name: foodName, exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: `Edit food ${foodName}`, exact: true })
      .click();
    await page
      .getByRole("textbox", { name: "Description", exact: true })
      .fill("Persisted personal food");
    await page.getByRole("button", { name: "Save food", exact: true }).click();
    await saved(page);
    await page
      .getByRole("button", { name: "Saved meals", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Create recipe", exact: true })
      .click();
    await page
      .getByRole("textbox", { name: "Recipe name", exact: true })
      .fill(name);
    await page
      .getByRole("spinbutton", { name: "Recipe servings", exact: true })
      .fill("2");
    await page.getByRole("searchbox", { name: "Search foods" }).fill(foodName);
    await page
      .getByRole("button", { name: `Add ingredient ${foodName}`, exact: true })
      .click();
    await page
      .getByRole("spinbutton", {
        name: `${foodName} ingredient 1 grams`,
        exact: true,
      })
      .fill("200");
    await page
      .getByRole("button", { name: "Save recipe", exact: true })
      .click();
    await saved(page);
    await page.goto("/calendar");
    await page.getByLabel("Activity type").selectOption("meal");
    await page.getByLabel("Saved meals").selectOption({ label: name });
    await page.getByRole("button", { name: "Preview schedule" }).click();
    await expect(
      page.getByRole("button", { name: "Save schedule", exact: true }),
    ).toBeVisible();
    await page.goto(`/nutrition?date=${date}`);
    await page
      .getByRole("button", { name: "Saved meals", exact: true })
      .click();
    await page
      .getByRole("button", { name: `Favorite recipe ${name}`, exact: true })
      .click();
    await saved(page);
    await page
      .getByRole("button", { name: `Log recipe ${name}`, exact: true })
      .click();
    await page
      .getByRole("spinbutton", { name: "Consumed quantity", exact: true })
      .fill("1.5");
    await page
      .getByRole("button", { name: "Save food entry", exact: true })
      .click();
    await saved(page);
    await expect(page.getByTestId("daily-kcal")).toHaveText("484.5");
    await page
      .getByRole("button", { name: `Edit recipe ${name}`, exact: true })
      .click();
    await page
      .getByRole("spinbutton", { name: "Recipe servings", exact: true })
      .fill("4");
    await page
      .getByRole("button", { name: "Save recipe", exact: true })
      .click();
    await saved(page);
    await expect(page.getByTestId("daily-kcal")).toHaveText("484.5");
    await page.getByRole("button", { name: "Diary", exact: true }).click();
    await page
      .getByRole("button", { name: `Edit entry ${name}`, exact: true })
      .click();
    await page
      .getByRole("spinbutton", { name: "Consumed quantity", exact: true })
      .fill("1");
    await page
      .getByRole("button", { name: "Save entry changes", exact: true })
      .click();
    await saved(page);
    await expect(page.getByTestId("daily-kcal")).toHaveText("384.5");
    await page
      .getByRole("button", { name: "Goals & history", exact: true })
      .click();
    for (const [label, value] of [
      ["Calories target (kcal)", "2200"],
      ["Protein target (g)", "140"],
      ["Carbohydrates target (g)", "260"],
      ["Fat target (g)", "70"],
    ])
      await page
        .getByRole("spinbutton", { name: label, exact: true })
        .fill(value);
    await page
      .getByRole("button", { name: "Save nutrition goals", exact: true })
      .click();
    await saved(page);
    await expect(
      page.getByRole("progressbar", {
        name: "Calories goal progress",
        exact: true,
      }),
    ).toHaveAttribute("max", "2200");
    await page
      .getByRole("combobox", { name: "Nutrition chart metric", exact: true })
      .selectOption("protein");
    await expect(
      page.getByRole("img", {
        name: "Daily Protein (g) and dated targets",
        exact: true,
      }),
    ).toBeVisible();
    returningContext = await browser.newContext();
    const returning = await returningContext.newPage();
    await login(returning);
    await returning.goto(`/nutrition?date=${date}`);
    await expect(returning.getByTestId("daily-kcal")).toHaveText("384.5");
    await returning.reload();
    await expect(
      returning.getByRole("button", {
        name: `Edit entry ${name}`,
        exact: true,
      }),
    ).toBeVisible();
    await returning.goto("/calendar");
    await returning.getByLabel("Calendar date").fill(date);
    await expect(
      returning.getByText(new RegExp(`${name} · 1 serving`)),
    ).toBeVisible();
    await returning.goto(`/nutrition?date=${date}`);
    await returning
      .getByRole("button", { name: `Delete entry ${name}`, exact: true })
      .click();
    await returning
      .getByRole("button", {
        name: `Confirm delete entry ${name.toLowerCase()}`,
        exact: true,
      })
      .click();
    await saved(returning);
    await expect(returning.getByTestId("daily-kcal")).toHaveText("184.5");
    await returning
      .getByRole("button", { name: "Saved meals", exact: true })
      .click();
    await returning
      .getByRole("button", { name: `Remove recipe ${name}`, exact: true })
      .click();
    await returning
      .getByRole("button", {
        name: `Confirm remove recipe ${name.toLowerCase()}`,
        exact: true,
      })
      .click();
    await saved(returning);
    await expect(
      returning.getByRole("heading", { name, exact: true }),
    ).toHaveCount(0);
    await returning
      .getByRole("button", { name: "Food library", exact: true })
      .click();
    await returning
      .getByRole("searchbox", { name: "Search foods" })
      .fill(foodName);
    await returning
      .getByRole("button", { name: `Remove food ${foodName}`, exact: true })
      .click();
    await returning
      .getByRole("button", {
        name: `Confirm remove food ${foodName.toLowerCase()}`,
        exact: true,
      })
      .click();
    await saved(returning);
    await expect(
      returning.getByRole("heading", { name: foodName, exact: true }),
    ).toHaveCount(0);
    expect(
      await returning.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  } finally {
    if (returningContext) await returningContext.close();
    const auth = await api.auth.signInWithPassword({
      email: process.env.FORM_TEST_EMAIL!,
      password: process.env.FORM_TEST_PASSWORD!,
    });
    if (!auth.error) {
      const uid = auth.data.user.id;
      const recipe = await api
        .from("recipes")
        .select("id")
        .eq("owner_id", uid)
        .eq("name", name)
        .maybeSingle();
      const candidates = await api
        .from("nutrition_entries")
        .select("id")
        .eq("owner_id", uid)
        .eq("local_date", date)
        .in("name_snapshot", ["Havregryn", name]);
      const added = (candidates.data ?? [])
        .map((r) => r.id)
        .filter((id) => !baselineIds.has(id));
      if (added.length)
        await api.from("nutrition_entries").delete().in("id", added);
      if (recipe.data) {
        await api
          .from("recipe_favorites")
          .delete()
          .eq("recipe_id", recipe.data.id);
        await api.from("recipes").delete().eq("id", recipe.data.id);
      }
      const createdFood = await api
        .from("foods")
        .select("id")
        .eq("owner_id", uid)
        .eq("name", foodName)
        .maybeSingle();
      if (createdFood.data) {
        await api
          .from("food_favorites")
          .delete()
          .eq("food_id", createdFood.data.id);
        await api.from("foods").delete().eq("id", createdFood.data.id);
      }
      await api
        .from("nutrition_goals")
        .delete()
        .eq("owner_id", uid)
        .eq("starts_on", date);
      await api.auth.signOut({ scope: "local" });
    }
  }
});
