import type { Database, Json } from "@/lib/supabase/database.types";
export type Food = Database["public"]["Tables"]["foods"]["Row"] & {
  favorite?: boolean;
};
export type Entry = Database["public"]["Tables"]["nutrition_entries"]["Row"];
export type Goal = Database["public"]["Tables"]["nutrition_goals"]["Row"];
export type Portion = { id: string; label: string; grams: number };
export type Macros = {
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
};
export type Recipe = {
  id: string;
  revision: number;
  name: string;
  servings: number;
  instructions: string;
  favorite?: boolean;
  ingredients: { foodId: string; grams: number }[];
};
export type NutritionData = {
  foods: Food[];
  entries: Entry[];
  recipes: Recipe[];
  goals: Goal[];
  today: string;
  timezone: string;
  userId: string;
};
export type FoodInput = {
  id: string;
  revision: number;
  name: string;
  description: string;
  kcal_per_100g: number | null;
  protein_per_100g: number | null;
  carbs_per_100g: number | null;
  fat_per_100g: number | null;
  portions: Portion[];
};
export type EntryInput = {
  id: string;
  revision: number;
  foodId: string | null;
  recipeId: string | null;
  quantity: number;
  unit: string;
  date: string;
  loggedAt: string;
  timezone: string;
  meal: string;
};
export type Result = { success: true } | { success: false; error: string };
export type NutrientMap = Record<
  string,
  { amount: number | null; unit: string }
>;
export const macroKeys = ["kcal", "protein", "carbs", "fat"] as const;
export const macroLabels = {
  kcal: "Calories",
  protein: "Protein",
  carbs: "Carbohydrates",
  fat: "Fat",
};
export function portions(value: Json): Portion[] {
  return Array.isArray(value)
    ? value.filter(
        (p): p is Portion =>
          !!p &&
          typeof p === "object" &&
          !Array.isArray(p) &&
          typeof p.id === "string" &&
          typeof p.label === "string" &&
          typeof p.grams === "number",
      )
    : [];
}
