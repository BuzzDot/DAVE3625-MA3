import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
test.use({ trace: "off", screenshot: "off", video: "off" });
test("health, recurrence, scheduled workout and meal persist across fresh desktop/mobile sessions", async ({
  page,
  browser,
}) => {
  test.skip(
    !process.env.FORM_TEST_EMAIL || !process.env.FORM_TEST_OTHER_EMAIL,
    "Requires two dedicated confirmed accounts",
  );
  test.setTimeout(120000);
  const date =
    test.info().project.name === "desktop" ? "2027-04-12" : "2027-04-13";
  const name = `Calendar ${test.info().project.name} ${Date.now()}`;
  const api = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );
  const ids = {
    routine: crypto.randomUUID(),
    food: crypto.randomUUID(),
    recipe: crypto.randomUUID(),
  };
  let uid: string | undefined;
  let context: Awaited<ReturnType<typeof browser.newContext>> | undefined;
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
  }
  try {
    const signed = await api.auth.signInWithPassword({
      email: process.env.FORM_TEST_EMAIL!,
      password: process.env.FORM_TEST_PASSWORD!,
    });
    expect(signed.error).toBeNull();
    uid = signed.data.user!.id;
    const exercise = "f0000000-0000-4000-8000-000000000001";
    expect(
      (
        await api.rpc("save_strength_routine", {
          p_document: {
            id: ids.routine,
            revision: 0,
            name,
            notes: "",
            exercises: [
              {
                exerciseId: exercise,
                notes: "",
                sets: [
                  {
                    reps: 8,
                    weight: 40,
                    rpe: null,
                    rir: null,
                    setType: "working",
                    notes: "",
                  },
                ],
              },
            ],
          },
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await api.from("foods").insert({
          id: ids.food,
          owner_id: uid,
          name: `${name} food`,
          kcal_per_100g: 200,
          protein_per_100g: 10,
          carbs_per_100g: 20,
          fat_per_100g: 5,
        })
      ).error,
    ).toBeNull();
    expect(
      (
        await api.rpc("save_nutrition_recipe", {
          p_document: {
            id: ids.recipe,
            revision: 0,
            name: `${name} meal`,
            servings: 2,
            instructions: "",
            ingredients: [{ foodId: ids.food, grams: 200 }],
          },
        })
      ).error,
    ).toBeNull();
    await login(page);
    await page.goto(`/calendar?date=${date}`);
    await page
      .getByRole("combobox", { name: "Metric", exact: true })
      .selectOption("water");
    await page.getByLabel("Value (ml)", { exact: true }).fill("250");
    await page.getByLabel("Notes", { exact: true }).fill(name);
    await page
      .getByRole("button", { name: "Save measurement", exact: true })
      .click();
    await expect(
      page.getByText("Saved to your diary.", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("250 ml", { exact: true }).first(),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.locator("p").getByText(name, { exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Edit measurement", exact: true })
      .click();
    await page.getByLabel("Value (ml)", { exact: true }).fill("500");
    await page
      .getByRole("button", { name: "Save measurement", exact: true })
      .click();
    await expect(
      page.getByText("500 ml", { exact: true }).first(),
    ).toBeVisible();
    await page.getByLabel("Goal metric").selectOption("water");
    await page.getByLabel("Target", { exact: true }).fill("2000");
    await page.getByRole("button", { name: "Save health goal" }).click();
    await expect(page.getByText("Daily goal: 2,000 ml · 25%")).toBeVisible();
    await page.getByLabel("Saved template").selectOption(ids.routine);
    await page.getByLabel("Repeat weekly").check();
    await page.getByLabel("Mon", { exact: true }).check();
    await page.getByLabel("Wed", { exact: true }).check();
    await page.getByLabel("Maximum occurrences").fill("3");
    await page.getByRole("button", { name: "Preview schedule" }).click();
    await expect(page.getByText("3 planned workouts")).toBeVisible();
    await page
      .getByRole("button", { name: "Save schedule", exact: true })
      .click();
    await expect(
      page.getByText("Schedule saved.", { exact: true }),
    ).toBeVisible();
    // Move to the first materialized occurrence and edit it independently.
    const planned = await api
      .from("scheduled_activities")
      .select("*")
      .eq("routine_id", ids.routine)
      .order("scheduled_at");
    expect(planned.error).toBeNull();
    expect(planned.data!.length).toBe(3);
    const occurrenceDate = planned.data![0].occurrence_date;
    await page.getByLabel("Calendar date").fill(occurrenceDate);
    await page
      .getByRole("button", { name: "Edit activity", exact: true })
      .click();
    await page.getByLabel("Activity notes").fill("Single occurrence note");
    await page.getByRole("button", { name: "Save activity changes" }).click();
    await expect(
      page.getByText("Single occurrence note", { exact: true }),
    ).toBeVisible();
    await page.getByText("Intended exercises and sets").click();
    await expect(page.getByText(/Barbell bench press: 8 reps/)).toBeVisible();
    await page
      .getByRole("button", { name: "Start workout", exact: true })
      .click();
    await expect(page).toHaveURL(/\/workouts\/[a-f0-9-]+$/);
    await page
      .getByRole("button", {
        name: "Complete Barbell bench press set 1",
        exact: true,
      })
      .click();
    await page
      .getByRole("button", { name: "Finish workout", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText(
      "Saved to your account",
    );
    await page.goto(`/calendar?date=${date}`);
    await page.getByLabel("Activity type").selectOption("meal");
    await page.getByLabel("Saved template").selectOption(ids.recipe);
    await page.getByRole("button", { name: "Preview schedule" }).click();
    await page
      .getByRole("button", { name: "Save schedule", exact: true })
      .click();
    await expect(
      page.getByText("Schedule saved.", { exact: true }),
    ).toBeVisible();
    await page.getByLabel("Actual servings").fill("1.5");
    await page
      .getByRole("button", { name: "Log as consumed", exact: true })
      .click();
    await expect(
      page.getByText(`${name} meal · 1.5 serving · 300 kcal`, { exact: true }),
    ).toBeVisible({ timeout: 15000 });
    context = await browser.newContext({
      viewport:
        test.info().project.name === "mobile"
          ? { width: 390, height: 844 }
          : { width: 1440, height: 1000 },
    });
    const returning = await context.newPage();
    await login(returning);
    await returning.goto(`/calendar?date=${date}`);
    await expect(
      returning.getByText("500 ml", { exact: true }).first(),
    ).toBeVisible();
    await expect(
      returning.getByText(`${name} meal · 1.5 serving · 300 kcal`, {
        exact: true,
      }),
    ).toBeVisible();
    await returning.getByLabel("Time range").selectOption("90");
    await expect(
      returning.getByRole("img", { name: /Steps over 90 days/ }),
    ).toBeVisible();
    expect(
      await returning.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await returning.getByLabel("Calendar view").selectOption("week");
    await returning.getByRole("button", { name: "Next week" }).click();
    await returning.getByLabel("Calendar view").selectOption("day");
    await returning.getByLabel("Calendar date").fill(date);
    returning.on("dialog", (d) => d.accept());
    await returning
      .getByRole("button", { name: "Delete measurement", exact: true })
      .click();
    await expect(returning.getByText("500 ml", { exact: true })).toHaveCount(0);
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Your day, in Form." }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  } finally {
    await context?.close();
    if (uid) {
      const sessions = await api
        .from("workout_sessions")
        .select("id,revision")
        .eq("routine_id", ids.routine);
      for (const w of sessions.data ?? [])
        await api.rpc("delete_strength_workout", {
          p_id: w.id,
          p_revision: w.revision,
        });
      await api.from("nutrition_entries").delete().eq("recipe_id", ids.recipe);
      const rules = await api
        .from("schedule_rules")
        .select("id")
        .eq("routine_id", ids.routine);
      await api
        .from("scheduled_activities")
        .delete()
        .eq("routine_id", ids.routine);
      await api
        .from("scheduled_activities")
        .delete()
        .eq("recipe_id", ids.recipe);
      for (const r of rules.data ?? [])
        await api.from("schedule_rules").delete().eq("id", r.id);
      await api.from("routines").delete().eq("id", ids.routine);
      await api.from("recipes").delete().eq("id", ids.recipe);
      await api.from("foods").delete().eq("id", ids.food);
      await api.from("health_observations").delete().eq("notes", name);
      await api
        .from("health_goals")
        .delete()
        .eq("starts_on", date)
        .eq("metric_code", "water");
    }
    await api.auth.signOut({ scope: "local" });
  }
});
