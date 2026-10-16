import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
const email = process.env.FORM_TEST_EMAIL;
const password = process.env.FORM_TEST_PASSWORD;
const available = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY &&
  email &&
  password,
);
test.use({ trace: "off", screenshot: "off", video: "off" }); // Never persist password-bearing traces.
test("real login, routine creation, saved sets, fresh-session history and logout", async ({
  page,
  browser,
}) => {
  test.skip(
    !available,
    "Requires Supabase and a confirmed dedicated test account",
  );
  const name = `Browser strength ${test.info().project.name} ${Date.now()}`;
  let workoutId: string | undefined;
  const api = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false } },
  );
  try {
    await page.goto("/login");
    await page
      .getByRole("textbox", { name: "Email", exact: true })
      .fill(email!);
    await page.getByLabel("Password", { exact: true }).fill(password!);
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Start empty workout" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Create routine", exact: true })
      .click();
    await page
      .getByRole("textbox", { name: "Routine name", exact: true })
      .fill(name);
    await page
      .getByRole("textbox", { name: "Search exercises" })
      .fill("Barbell bench press");
    await page
      .getByRole("button", { name: "Add Barbell bench press", exact: true })
      .click();
    await page
      .getByRole("spinbutton", {
        name: "Barbell bench press set 1 weight (kg)",
        exact: true,
      })
      .fill("60");
    await page
      .getByRole("button", { name: "Save routine", exact: true })
      .click();
    const routine = page
      .locator("section")
      .filter({ has: page.getByRole("heading", { name, exact: true }) });
    await routine
      .getByRole("button", { name: "Start workout", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Finish workout", exact: true }),
    ).toBeVisible();
    workoutId = page.url().split("/").at(-1);
    await page
      .getByRole("button", {
        name: "Complete Barbell bench press set 1",
        exact: true,
      })
      .click();
    await page
      .getByRole("button", { name: "Finish workout", exact: true })
      .click();
    await expect(
      page.getByText("YOUR RECORDED WORKOUT", { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("status")).toContainText(
      "Saved to your account",
    );
    await page.reload();
    await expect(
      page.getByRole("spinbutton", {
        name: "Barbell bench press set 1 weight (kg)",
        exact: true,
      }),
    ).toHaveValue("60");
    const context = await browser.newContext();
    const returning = await context.newPage();
    await returning.goto("/login");
    await returning
      .getByRole("textbox", { name: "Email", exact: true })
      .fill(email!);
    await returning.getByLabel("Password", { exact: true }).fill(password!);
    await returning
      .getByRole("button", { name: "Log in", exact: true })
      .click();
    await expect(returning).toHaveURL(/\/workouts$/);
    await returning.goto(`/workouts/${workoutId}`);
    await expect(
      returning.getByRole("spinbutton", {
        name: "Barbell bench press set 1 repetitions",
        exact: true,
      }),
    ).toHaveValue("8");
    await returning.goto("/progress");
    await returning
      .getByRole("combobox", { name: "Choose an exercise" })
      .selectOption("f0000000-0000-4000-8000-000000000001");
    await expect(
      returning.getByRole("link", { name: new RegExp(name) }),
    ).toBeVisible();
    await returning.goto(`/workouts/${workoutId}`);
    await returning
      .getByRole("spinbutton", {
        name: "Barbell bench press set 1 weight (kg)",
        exact: true,
      })
      .fill("65");
    await returning
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await expect(returning.getByRole("status")).toContainText(
      "Saved to your account",
    );
    // Expire only local session metadata: the genuine signed JWT and refresh
    // token remain unchanged. The SSR proxy must renew this real session.
    const authCookies = (await context.cookies())
      .filter((c) => /-auth-token(?:\.\d+)?$/.test(c.name))
      .sort((a, b) => a.name.localeCompare(b.name));
    expect(authCookies.length).toBeGreaterThan(0);
    const serialized = authCookies.map((c) => c.value).join("");
    expect(serialized.startsWith("base64-")).toBe(true);
    const session = JSON.parse(
      Buffer.from(serialized.slice(7), "base64url").toString(),
    );
    session.expires_at = Math.floor(Date.now() / 1000) - 30;
    const expired = `base64-${Buffer.from(JSON.stringify(session)).toString("base64url")}`;
    let offset = 0;
    await context.addCookies(
      authCookies.map((cookie, index) => {
        const length =
          index === authCookies.length - 1
            ? expired.length - offset
            : cookie.value.length;
        const value = expired.slice(offset, offset + length);
        offset += length;
        return { ...cookie, value };
      }),
    );
    await returning.reload();
    await expect(
      returning.getByRole("spinbutton", {
        name: "Barbell bench press set 1 weight (kg)",
        exact: true,
      }),
    ).toHaveValue("65");
    const renewed = (await context.cookies())
      .filter((c) => /-auth-token(?:\.\d+)?$/.test(c.name))
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => c.value)
      .join("");
    expect(
      JSON.parse(Buffer.from(renewed.slice(7), "base64url").toString())
        .expires_at,
    ).toBeGreaterThan(Math.floor(Date.now() / 1000));
    const otherContext = await browser.newContext();
    try {
      const other = await otherContext.newPage();
      await other.goto("/login");
      await other
        .getByRole("textbox", { name: "Email", exact: true })
        .fill(process.env.FORM_TEST_OTHER_EMAIL!);
      await other
        .getByLabel("Password", { exact: true })
        .fill(process.env.FORM_TEST_OTHER_PASSWORD!);
      await other.getByRole("button", { name: "Log in", exact: true }).click();
      await expect(other).toHaveURL(/\/workouts$/);
      await other.goto(`/workouts/${workoutId}`);
      // App Router may already have streamed its loading shell with HTTP 200.
      await expect(
        other.getByRole("heading", { name: "A little off track." }),
      ).toBeVisible();
      await expect(other.getByRole("spinbutton")).toHaveCount(0);
    } finally {
      await otherContext.close();
    }
    await returning
      .getByRole("button", { name: "Delete workout", exact: true })
      .click();
    await returning
      .getByRole("button", { name: "Confirm delete workout", exact: true })
      .click();
    await expect(returning).toHaveURL(/\/workouts$/);
    await returning.goto(`/workouts/${workoutId}`);
    await expect(
      returning.getByRole("heading", { name: "A little off track." }),
    ).toBeVisible();
    await returning.goto("/settings");
    await returning
      .getByRole("button", { name: "Log out", exact: true })
      .click();
    await expect(returning).toHaveURL(/\/login$/);
    await returning.goto("/workouts");
    await expect(returning).toHaveURL(/\/login$/);
    await context.close();
  } finally {
    const auth = await api.auth.signInWithPassword({
      email: email!,
      password: password!,
    });
    if (!auth.error) {
      if (workoutId) {
        const { data } = await api
          .from("workout_sessions")
          .select("revision")
          .eq("id", workoutId)
          .maybeSingle();
        if (data)
          await api.rpc("delete_strength_workout", {
            p_id: workoutId,
            p_revision: data.revision,
          });
      }
      await api
        .from("routines")
        .delete()
        .eq("owner_id", auth.data.user.id)
        .eq("name", name);
      await api.auth.signOut({ scope: "local" });
    }
  }
});
