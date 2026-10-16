"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkError, DataError } from "@/lib/training/repository";
import {
  foodSchema,
  recipeSchema,
  entrySchema,
  goalSchema,
} from "@/lib/nutrition/validation";
import type { Result } from "@/lib/nutrition/types";
import type { Json } from "@/lib/supabase/database.types";
type Client = Awaited<ReturnType<typeof createSupabaseServerClient>>;
async function change(
  operation: (client: Client, uid: string) => Promise<void>,
): Promise<Result> {
  const viewer = await getViewer();
  if (!viewer.user)
    return {
      success: false,
      error: "Log in again before saving your nutrition diary.",
    };
  try {
    await operation(await createSupabaseServerClient(), viewer.user.id);
    for (const path of ["/nutrition", "/", "/calendar"]) revalidatePath(path);
    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError)
      return {
        success: false,
        error: error.issues[0]?.message ?? "Check the entered values.",
      };
    if (error instanceof DataError && ["PT409", "23505"].includes(error.code))
      return {
        success: false,
        error:
          "This record changed or is unavailable. Reload before editing again.",
      };
    return {
      success: false,
      error:
        "The change could not be saved. Check your connection and entered values, then retry.",
    };
  }
}
export async function saveFood(input: unknown) {
  return change(async (client, uid) => {
    const { id, revision, ...values } = foodSchema.parse(input);
    if (revision === 0)
      checkError(
        (
          await client.from("foods").insert({
            ...values,
            id,
            owner_id: uid,
            portions: values.portions as Json,
          })
        ).error,
      );
    else {
      const { data, error } = await client
        .from("foods")
        .update({ ...values, portions: values.portions as Json })
        .eq("id", id)
        .eq("owner_id", uid)
        .eq("revision", revision)
        .select("id")
        .maybeSingle();
      checkError(error);
      if (!data) throw new DataError("PT409");
    }
  });
}
export async function archiveNutrition(
  kind: "food" | "recipe",
  id: string,
  revision: number,
) {
  return change(async (client, uid) => {
    z.uuid().parse(id);
    z.number().int().positive().parse(revision);
    if (!["food", "recipe"].includes(kind)) throw new Error("Invalid catalog.");
    const { data, error } = await client
      .from(kind === "food" ? "foods" : "recipes")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", id)
      .eq("owner_id", uid)
      .eq("revision", revision)
      .select("id")
      .maybeSingle();
    checkError(error);
    if (!data) throw new DataError("PT409");
  });
}
export async function favoriteNutrition(
  kind: "food" | "recipe",
  id: string,
  value: boolean,
) {
  return change(async (client, uid) => {
    z.uuid().parse(id);
    z.boolean().parse(value);
    if (!["food", "recipe"].includes(kind)) throw new Error("Invalid catalog.");
    if (kind === "food") {
      const result = value
        ? await client
            .from("food_favorites")
            .upsert(
              { owner_id: uid, food_id: id },
              { onConflict: "owner_id,food_id", ignoreDuplicates: true },
            )
        : await client
            .from("food_favorites")
            .delete()
            .eq("owner_id", uid)
            .eq("food_id", id);
      checkError(result.error);
    } else {
      const result = value
        ? await client
            .from("recipe_favorites")
            .upsert(
              { owner_id: uid, recipe_id: id },
              { onConflict: "owner_id,recipe_id", ignoreDuplicates: true },
            )
        : await client
            .from("recipe_favorites")
            .delete()
            .eq("owner_id", uid)
            .eq("recipe_id", id);
      checkError(result.error);
    }
  });
}
export async function saveRecipe(input: unknown) {
  return change(async (client) => {
    const doc = recipeSchema.parse(input);
    checkError(
      (await client.rpc("save_nutrition_recipe", { p_document: doc as Json }))
        .error,
    );
  });
}
export async function saveEntry(input: unknown) {
  return change(async (client) => {
    const doc = entrySchema.parse(input);
    checkError(
      (await client.rpc("save_nutrition_entry", { p_document: doc as Json }))
        .error,
    );
  });
}
export async function deleteEntry(id: string, revision: number) {
  return change(async (client, uid) => {
    z.uuid().parse(id);
    z.number().int().positive().parse(revision);
    const { data, error } = await client
      .from("nutrition_entries")
      .delete()
      .eq("id", id)
      .eq("owner_id", uid)
      .eq("revision", revision)
      .select("id")
      .maybeSingle();
    checkError(error);
    if (!data) throw new DataError("PT409");
  });
}
export async function saveGoals(input: unknown) {
  return change(async (client) => {
    const g = goalSchema.parse(input);
    checkError(
      (
        await client.rpc("set_nutrition_goal", {
          p_date: g.date,
          p_kcal: g.kcal,
          p_protein: g.protein,
          p_carbs: g.carbs,
          p_fat: g.fat,
        })
      ).error,
    );
  });
}
