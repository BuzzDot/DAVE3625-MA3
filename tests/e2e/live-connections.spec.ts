import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

test.use({ trace: "off", screenshot: "off", video: "off" });
test("templates connect to scheduling, meal-specific logging and dashboard totals", async ({
  page,
}) => {
  test.skip(
    !process.env.FORM_TEST_EMAIL || !process.env.FORM_TEST_OTHER_EMAIL,
    "Requires two dedicated confirmed accounts",
  );
  test.setTimeout(120000);
  const name = `Connected ${test.info().project.name} ${Date.now()}`;
  const date =
    test.info().project.name === "desktop" ? "2027-06-14" : "2027-06-15";
  const api = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );
  const errors: string[] = [];
  const failedActions: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("requestfailed", (request) => {
    if (
      request.headers()["next-action"] &&
      request.failure()?.errorText === "net::ERR_FAILED"
    )
      failedActions.push(request.url());
  });
  let routineId: string | undefined;
  let recipeId: string | undefined;
  try {
    const signed = await api.auth.signInWithPassword({
      email: process.env.FORM_TEST_EMAIL!,
      password: process.env.FORM_TEST_PASSWORD!,
    });
    expect(signed.error).toBeNull();
    await page.goto("/login");
    await page
      .getByLabel("Email", { exact: true })
      .fill(process.env.FORM_TEST_EMAIL!);
    await page
      .getByLabel("Password", { exact: true })
      .fill(process.env.FORM_TEST_PASSWORD!);
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await expect(page).toHaveURL(/\/workouts$/);
    await page.goto(`/workouts?date=${date}`);
    await page
      .getByRole("button", { name: "Create routine", exact: true })
      .click();
    await page.getByLabel("Routine name", { exact: true }).fill(name);
    await page
      .getByRole("textbox", { name: "Search exercises" })
      .fill("Barbell bench press");
    await page
      .getByRole("button", { name: "Add Barbell bench press", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Save routine", exact: true })
      .click();
    await page
      .getByRole("link", { name: `Schedule routine ${name}`, exact: true })
      .click();
    await expect(page.getByLabel("Calendar date")).toHaveValue(date);
    await expect(page.getByLabel("Activity type")).toHaveValue("workout");
    routineId = await page.getByLabel("Workout routines").inputValue();
    expect(routineId).toBeTruthy();
    await expect(
      page.getByLabel("Workout routines").locator("option:checked"),
    ).toHaveText(name);
    await page.reload();
    await expect(page.getByLabel("Workout routines")).toHaveValue(routineId!);
    await page
      .getByRole("button", { name: "Preview schedule", exact: true })
      .click();
    await expect(
      page.getByText("1 planned workouts", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Save schedule", exact: true })
      .click();
    await expect(
      page.getByText("Schedule saved.", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name, exact: true }),
    ).toBeVisible();

    await page
      .getByRole("link", { name: "Open nutrition diary", exact: true })
      .click();
    await expect(page.getByLabel("Nutrition date")).toHaveValue(date);
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
      .getByRole("searchbox", { name: "Search foods" })
      .fill("Havregryn");
    await page
      .getByRole("button", { name: "Add ingredient Havregryn", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Save recipe", exact: true })
      .click();
    await expect(page.getByRole("status")).toHaveText("Saved to your account.");
    await page
      .getByRole("link", { name: `Schedule recipe ${name}`, exact: true })
      .click();
    await expect(page.getByLabel("Calendar date")).toHaveValue(date);
    await expect(page.getByLabel("Activity type")).toHaveValue("meal");
    recipeId = await page.getByLabel("Saved meals").inputValue();
    expect(recipeId).toBeTruthy();
    await page.reload();
    await expect(page.getByLabel("Saved meals")).toHaveValue(recipeId!);
    await page
      .getByRole("button", { name: "Preview schedule", exact: true })
      .click();
    await page.route("**/calendar?**", async (route) => {
      if (route.request().headers()["next-action"]) await route.abort("failed");
      else await route.continue();
    });
    await page
      .getByRole("button", { name: "Save schedule", exact: true })
      .click();
    await expect(page.getByText(/Your preview is still here/)).toBeVisible();
    await page.unroute("**/calendar?**");
    await expect(
      page.getByText("1 planned meals", { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Save schedule", exact: true })
      .click();
    await expect(
      page.getByText("Schedule saved.", { exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name, exact: true })).toHaveCount(
      2,
    );

    await page
      .getByRole("link", { name: "Open nutrition diary", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Log saved meal for dinner", exact: true })
      .click();
    await page
      .getByRole("button", { name: `Log recipe ${name}`, exact: true })
      .click();
    await expect(
      page.getByRole("combobox", { name: "Meal category", exact: true }),
    ).toHaveValue("dinner");
    await expect(page.getByLabel("Consumed date", { exact: true })).toHaveValue(
      date,
    );
    await page.getByLabel("Consumed quantity").fill("0");
    await page
      .getByRole("button", { name: "Save food entry", exact: true })
      .click();
    await expect(page.getByTestId("nutrition-log-editor")).toBeVisible();
    await page.getByLabel("Consumed quantity").fill("0.5");
    await page
      .getByRole("button", { name: "Save food entry", exact: true })
      .click();
    await expect(page.getByRole("status")).toHaveText("Saved to your account.");
    await page.reload();
    const dinner = page.locator("section").filter({
      has: page.getByRole("heading", { name: "Dinner", exact: true }),
    });
    await expect(dinner).toContainText(name);

    // Today's overview must match the persisted nutrition diary, excluding plans.
    await page.goto("/");
    await page
      .getByRole("link", { name: "Choose a saved meal", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Saved meals", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    const today = await page.getByLabel("Nutrition date").inputValue();
    await page
      .getByRole("button", { name: `Log recipe ${name}`, exact: true })
      .click();
    await page.getByLabel("Consumed quantity").fill("0.25");
    await page
      .getByRole("button", { name: "Save food entry", exact: true })
      .click();
    await expect(page.getByRole("status")).toHaveText("Saved to your account.");
    await page
      .getByRole("button", { name: "Goals & history", exact: true })
      .click();
    for (const [label, value] of [
      ["Calories target (kcal)", "2200"],
      ["Protein target (g)", "140"],
      ["Carbohydrates target (g)", "260"],
      ["Fat target (g)", "70"],
    ]) {
      await page
        .getByRole("spinbutton", { name: label, exact: true })
        .fill(value);
    }
    await page
      .getByRole("button", { name: "Save nutrition goals", exact: true })
      .click();
    await expect(page.getByRole("status")).toHaveText("Saved to your account.");
    const nutritionKcal = await page.getByTestId("daily-kcal").innerText();
    await page.goto("/");
    await expect(page.getByTestId("daily-kcal")).toHaveText(nutritionKcal);
    await expect(
      page.getByRole("progressbar", {
        name: "Calories goal progress",
        exact: true,
      }),
    ).toHaveAttribute("max", "2200");
    await page.locator("main").screenshot({
      path: `test-results/${test.info().project.name}-connected-dashboard.png`,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page
      .getByRole("link", { name: "Choose a saved meal", exact: true })
      .click();
    await expect(page.getByLabel("Nutrition date")).toHaveValue(today);
    await page.locator("main").screenshot({
      path: `test-results/${test.info().project.name}-connected-saved-meals.png`,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);

    // A valid UUID from another owner must not become a selectable template.
    const other = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false } },
    );
    const otherLogin = await other.auth.signInWithPassword({
      email: process.env.FORM_TEST_OTHER_EMAIL!,
      password: process.env.FORM_TEST_OTHER_PASSWORD!,
    });
    expect(otherLogin.error).toBeNull();
    const otherRecipe = crypto.randomUUID();
    const created = await other.from("recipes").insert({
      id: otherRecipe,
      owner_id: otherLogin.data.user!.id,
      name: "Other owner's private recipe",
      servings: 1,
    });
    expect(created.error).toBeNull();
    try {
      await page.goto(
        `/calendar?date=${date}&kind=meal&template=${otherRecipe}#schedule`,
      );
      await expect(page.getByLabel("Saved meals")).toHaveValue("");
      await expect(
        page.getByRole("option", {
          name: "Other owner's private recipe",
          exact: true,
        }),
      ).toHaveCount(0);
    } finally {
      await other.from("recipes").delete().eq("id", otherRecipe);
      await other.auth.signOut({ scope: "local" });
    }
    await page.goto("/calendar?date=invalid&kind=meal&template=invalid");
    await expect(page.getByLabel("Calendar date")).toHaveValue(today);
    await expect(page.getByLabel("Saved meals")).toHaveValue("");
    await page.goto("/nutrition?date=invalid&view=invalid");
    await expect(page.getByLabel("Nutrition date")).toHaveValue(today);
    await expect(
      page.getByRole("button", { name: "Diary", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(failedActions).toHaveLength(1);
    expect(errors).toEqual([]);
  } finally {
    if (recipeId) {
      await api.from("nutrition_entries").delete().eq("recipe_id", recipeId);
      await api.from("scheduled_activities").delete().eq("recipe_id", recipeId);
      await api.from("recipes").delete().eq("id", recipeId);
    }
    if (routineId) {
      await api
        .from("scheduled_activities")
        .delete()
        .eq("routine_id", routineId);
      await api.from("routines").delete().eq("id", routineId);
    }
    await api.auth.signOut({ scope: "local" });
  }
});
