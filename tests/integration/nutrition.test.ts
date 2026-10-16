import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/lib/supabase/database.types";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const available = Boolean(
  url &&
  key &&
  process.env.FORM_TEST_EMAIL &&
  process.env.FORM_TEST_PASSWORD &&
  process.env.FORM_TEST_OTHER_EMAIL &&
  process.env.FORM_TEST_OTHER_PASSWORD,
);
const client = () =>
  createClient<Database>(url!, key!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
test(
  "hosted nutrition catalog, recipe snapshots, persisted edits, goals and two-user isolation",
  {
    skip: !available ? "Requires two confirmed dedicated test accounts" : false,
  },
  async () => {
    const alice = client(),
      bob = client(),
      fresh = client();
    const foodId = randomUUID(),
      recipeId = randomUUID(),
      entryId = randomUUID(),
      foodEntryId = randomUUID();
    let uid: string | undefined;
    let madeGoals = false;
    try {
      const a = await alice.auth.signInWithPassword({
        email: process.env.FORM_TEST_EMAIL!,
        password: process.env.FORM_TEST_PASSWORD!,
      });
      assert.ifError(a.error);
      uid = a.data.user!.id;
      const b = await bob.auth.signInWithPassword({
        email: process.env.FORM_TEST_OTHER_EMAIL!,
        password: process.env.FORM_TEST_OTHER_PASSWORD!,
      });
      assert.ifError(b.error);
      assert.notEqual(uid, b.data.user!.id);
      const norwegian = await alice
        .from("foods")
        .select("id,name,kcal_per_100g,carbs_per_100g,portions")
        .eq("source", "matvaretabellen")
        .eq("external_id", "05.003")
        .single();
      assert.ifError(norwegian.error);
      assert.equal(norwegian.data!.name, "Havregryn");
      assert.ifError(
        (
          await alice.from("foods").insert({
            id: foodId,
            owner_id: uid,
            name: `Nutrition integration ${foodId}`,
            kcal_per_100g: 200,
            protein_per_100g: 10,
            carbs_per_100g: 20,
            fat_per_100g: 5,
            portions: [{ id: "slice", label: "slice", grams: 50 }],
          })
        ).error,
      );
      assert.ifError(
        (
          await alice
            .from("food_favorites")
            .upsert(
              { owner_id: uid, food_id: foodId },
              { ignoreDuplicates: true },
            )
        ).error,
      );
      const recipe = {
        id: recipeId,
        revision: 0,
        name: "Integration meal",
        servings: 2,
        instructions: "",
        ingredients: [{ foodId, grams: 200 }],
      };
      assert.ifError(
        (await alice.rpc("save_nutrition_recipe", { p_document: recipe }))
          .error,
      );
      assert.ifError(
        (
          await alice
            .from("recipe_favorites")
            .upsert(
              { owner_id: uid, recipe_id: recipeId },
              { ignoreDuplicates: true },
            )
        ).error,
      );
      const entry = {
        id: entryId,
        revision: 0,
        foodId: null,
        recipeId,
        date: "2026-10-16",
        loggedAt: "2026-10-16T10:00:00Z",
        timezone: "Europe/Oslo",
        meal: "lunch",
        quantity: 1,
        unit: "serving",
      };
      assert.ifError(
        (await alice.rpc("save_nutrition_entry", { p_document: entry })).error,
      );
      const foodEntry = {
        ...entry,
        id: foodEntryId,
        foodId,
        recipeId: null,
        quantity: 2,
        unit: "slice",
      };
      assert.ifError(
        (await alice.rpc("save_nutrition_entry", { p_document: foodEntry }))
          .error,
      );
      for (const table of [
        "nutrition_entries",
        "recipes",
        "recipe_ingredients",
        "food_favorites",
        "recipe_favorites",
      ] as const) {
        const r: { data: unknown[] | null; error: { message: string } | null } =
          await bob.from(table).select("*").eq("owner_id", uid);
        assert.ifError(r.error);
        assert.deepEqual(r.data, []);
      }
      assert.deepEqual(
        (await bob.from("foods").select("id").eq("id", foodId)).data,
        [],
      );
      assert.equal(
        (
          await bob.rpc("save_nutrition_entry", {
            p_document: { ...entry, revision: 1 },
          })
        ).error?.code,
        "PT409",
      );
      assert.ok(
        (
          await bob.rpc("save_nutrition_recipe", {
            p_document: { ...recipe, id: randomUUID() },
          })
        ).error,
      );
      assert.ok(
        (
          await bob
            .from("food_favorites")
            .insert({ owner_id: b.data.user!.id, food_id: foodId })
        ).error,
      );
      const badDelete = await bob
        .from("nutrition_entries")
        .delete()
        .eq("id", entryId)
        .select("id");
      assert.ifError(badDelete.error);
      assert.deepEqual(badDelete.data, []);
      assert.ifError(
        (
          await alice
            .from("foods")
            .update({
              name: "Changed food",
              kcal_per_100g: 900,
              portions: [{ id: "slice", label: "slice", grams: 90 }],
            })
            .eq("id", foodId)
        ).error,
      );
      assert.ifError(
        (
          await alice.rpc("save_nutrition_recipe", {
            p_document: {
              ...recipe,
              revision: 1,
              servings: 10,
              name: "Changed meal",
            },
          })
        ).error,
      );
      assert.ifError(
        (
          await fresh.auth.signInWithPassword({
            email: process.env.FORM_TEST_EMAIL!,
            password: process.env.FORM_TEST_PASSWORD!,
          })
        ).error,
      );
      const stored = await fresh
        .from("nutrition_entries")
        .select("*")
        .eq("id", entryId)
        .single();
      assert.ifError(stored.error);
      assert.equal(Number(stored.data!.kcal_snapshot), 200);
      assert.equal(stored.data!.name_snapshot, "Integration meal");
      assert.ifError(
        (
          await alice.rpc("save_nutrition_entry", {
            p_document: { ...entry, revision: 1, quantity: 1.5 },
          })
        ).error,
      );
      const edited = await fresh
        .from("nutrition_entries")
        .select("*")
        .eq("id", entryId)
        .single();
      assert.ifError(edited.error);
      assert.equal(Number(edited.data!.kcal_snapshot), 300);
      assert.equal(edited.data!.revision, 2);
      assert.ifError(
        (
          await alice.rpc("save_nutrition_entry", {
            p_document: { ...foodEntry, revision: 1, quantity: 3 },
          })
        ).error,
      );
      assert.equal(
        Number(
          (
            await fresh
              .from("nutrition_entries")
              .select("kcal_snapshot")
              .eq("id", foodEntryId)
              .single()
          ).data?.kcal_snapshot,
        ),
        300,
      );
      const currentGoals = await alice
        .from("nutrition_goals")
        .select("id")
        .eq("owner_id", uid);
      assert.ifError(currentGoals.error);
      // Never split or replace an existing personal goal timeline during tests.
      if (currentGoals.data!.length === 0) {
        madeGoals = true;
        for (const [date, kcal] of [
          ["2026-10-01", 2000],
          ["2026-10-20", 2400],
        ] as const)
          assert.ifError(
            (
              await alice.rpc("set_nutrition_goal", {
                p_date: date,
                p_kcal: kcal,
                p_protein: 120,
                p_carbs: 250,
                p_fat: 60,
              })
            ).error,
          );
        assert.equal(
          (
            await fresh
              .from("nutrition_goals")
              .select("ends_on")
              .eq("starts_on", "2026-10-01")
              .single()
          ).data?.ends_on,
          "2026-10-19",
        );
        assert.deepEqual(
          (await bob.from("nutrition_goals").select("id").eq("owner_id", uid))
            .data,
          [],
        );
      }
      assert.ifError(
        (
          await alice
            .from("nutrition_entries")
            .delete()
            .in("id", [entryId, foodEntryId])
        ).error,
      );
      assert.deepEqual(
        (
          await fresh
            .from("nutrition_entries")
            .select("id")
            .in("id", [entryId, foodEntryId])
        ).data,
        [],
      );
      assert.ok(
        (await client().rpc("save_nutrition_entry", { p_document: entry }))
          .error,
      );
    } finally {
      if (uid) {
        await alice
          .from("nutrition_entries")
          .delete()
          .in("id", [entryId, foodEntryId]);
        await alice.from("recipe_favorites").delete().eq("recipe_id", recipeId);
        await alice.from("recipes").delete().eq("id", recipeId);
        await alice.from("food_favorites").delete().eq("food_id", foodId);
        await alice.from("foods").delete().eq("id", foodId);
        if (madeGoals)
          await alice
            .from("nutrition_goals")
            .delete()
            .eq("owner_id", uid)
            .in("starts_on", ["2026-10-01", "2026-10-20"]);
      }
      await Promise.all([
        alice.auth.signOut({ scope: "local" }),
        bob.auth.signOut({ scope: "local" }),
        fresh.auth.signOut({ scope: "local" }),
      ]);
    }
  },
);
