import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { checkError } from "@/lib/training/repository";
import { localDate } from "./calculations";
import type { NutritionData } from "./types";
async function collect<T>(
  query: (
    a: number,
    b: number,
  ) => PromiseLike<{
    data: T[] | null;
    error: { code?: string; message: string } | null;
  }>,
) {
  const rows: T[] = [];
  for (let a = 0; ; a += 500) {
    const result = await query(a, a + 499);
    checkError(result.error);
    rows.push(...(result.data ?? []));
    if (!result.data || result.data.length < 500) return rows;
  }
}
export async function loadNutritionData(
  options: { catalog?: boolean } = {},
): Promise<NutritionData> {
  const user = await requireUser();
  const client = await createSupabaseServerClient();
  const [
    foods,
    favorites,
    recipes,
    ingredients,
    recipeFavorites,
    entries,
    goals,
    profile,
  ] = await Promise.all([
    options.catalog === false
      ? Promise.resolve([])
      : collect((a, b) =>
          client.from("foods").select("*").order("id").range(a, b),
        ),
    options.catalog === false
      ? Promise.resolve([])
      : collect((a, b) =>
          client
            .from("food_favorites")
            .select("*")
            .eq("owner_id", user.id)
            .order("food_id")
            .range(a, b),
        ),
    collect((a, b) =>
      client
        .from("recipes")
        .select("*")
        .eq("owner_id", user.id)
        .is("archived_at", null)
        .order("id")
        .range(a, b),
    ),
    options.catalog === false
      ? Promise.resolve([])
      : collect((a, b) =>
          client
            .from("recipe_ingredients")
            .select("*")
            .eq("owner_id", user.id)
            .order("recipe_id")
            .order("position")
            .range(a, b),
        ),
    options.catalog === false
      ? Promise.resolve([])
      : collect((a, b) =>
          client
            .from("recipe_favorites")
            .select("*")
            .eq("owner_id", user.id)
            .order("recipe_id")
            .range(a, b),
        ),
    collect((a, b) =>
      client
        .from("nutrition_entries")
        .select("*")
        .eq("owner_id", user.id)
        .order("local_date", { ascending: false })
        .order("id")
        .range(a, b),
    ),
    collect((a, b) =>
      client
        .from("nutrition_goals")
        .select("*")
        .eq("owner_id", user.id)
        .order("starts_on", { ascending: false })
        .range(a, b),
    ),
    client.from("profiles").select("timezone").eq("id", user.id).maybeSingle(),
  ]);
  checkError(profile.error);
  const timezone = profile.data?.timezone ?? "Europe/Oslo";
  return {
    userId: user.id,
    timezone,
    today: localDate(new Date(), timezone),
    foods: foods.map((f) => ({
      ...f,
      favorite: favorites.some((v) => v.food_id === f.id),
    })),
    recipes: recipes.map((r) => ({
      id: r.id,
      revision: r.revision,
      name: r.name,
      instructions: r.instructions ?? "",
      servings: r.servings,
      favorite: recipeFavorites.some((f) => f.recipe_id === r.id),
      ingredients: ingredients
        .filter((i) => i.recipe_id === r.id)
        .map((i) => ({ foodId: i.food_id, grams: i.grams })),
    })),
    entries,
    goals,
  };
}
