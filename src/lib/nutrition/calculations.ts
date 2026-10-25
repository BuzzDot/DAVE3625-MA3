import {
  macroKeys,
  portions,
  foodBasis,
  portionAmount,
  type Portion,
  type NutritionBasis,
  type Food,
  type Macros,
  type Recipe,
  type Entry,
} from "./types";
export const foodMacros = (f: Food): Macros => ({
  kcal: f.kcal_per_100g,
  protein: f.protein_per_100g,
  carbs: f.carbs_per_100g,
  fat: f.fat_per_100g,
});
export function toGrams(
  quantity: number,
  unit: string,
  choices: { id: string; grams?: number }[],
) {
  const factor = unit === "g" ? 1 : choices.find((p) => p.id === unit)?.grams;
  if (
    !Number.isFinite(quantity) ||
    quantity <= 0 ||
    !factor ||
    !Number.isFinite(factor) ||
    factor <= 0 ||
    quantity * factor > 1000000
  )
    throw new Error("Enter a valid quantity and supported serving.");
  return quantity * factor;
}
export function scale(values: Macros, grams: number): Macros {
  if (!Number.isFinite(grams) || grams < 0) throw new Error("Invalid weight.");
  return Object.fromEntries(
    macroKeys.map((k) => [
      k,
      values[k] === null ? null : (values[k]! * grams) / 100,
    ]),
  ) as Macros;
}
export function sumMacros(items: Macros[]): Macros {
  return Object.fromEntries(
    macroKeys.map((k) => [
      k,
      items.some((v) => v[k] === null)
        ? null
        : items.reduce((s, v) => s + v[k]!, 0),
    ]),
  ) as Macros;
}
export function recipeNutrition(recipe: Recipe, foods: Food[]) {
  const items = recipe.ingredients.map((i) => {
    const food = foods.find((f) => f.id === i.foodId);
    return food && foodBasis(food) === "g"
      ? scale(foodMacros(food), i.grams)
      : { kcal: null, protein: null, carbs: null, fat: null };
  });
  const grams = recipe.ingredients.reduce((s, i) => s + i.grams, 0);
  return {
    total: sumMacros(items),
    perServing: scale(sumMacros(items), 100 / recipe.servings),
    grams,
    servingGrams: grams / recipe.servings,
  };
}
export const entryMacros = (e: Entry): Macros => ({
  kcal: e.kcal_snapshot,
  protein: e.protein_snapshot,
  carbs: e.carbs_snapshot,
  fat: e.fat_snapshot,
});
export function entryUnitLabel(entry: Entry): string {
  const basis = entry.basis_snapshot;
  if (!basis || typeof basis !== "object" || Array.isArray(basis))
    return entry.unit_snapshot;
  return (
    portions(basis.portions ?? []).find(
      (portion) => portion.id === entry.unit_snapshot,
    )?.label ?? entry.unit_snapshot
  );
}
export function goalForDate<
  T extends { starts_on: string; ends_on: string | null },
>(goals: T[], date: string) {
  return goals.find(
    (g) => g.starts_on <= date && (!g.ends_on || g.ends_on >= date),
  );
}
export function localDate(instant: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  return ["year", "month", "day"]
    .map((k) => parts.find((p) => p.type === k)!.value)
    .join("-");
}
// Local noon avoids midnight DST transitions. Iterate the offset for the chosen
// IANA zone; reject skipped calendar dates rather than silently moving a log.
export function noonInZone(date: string, timezone: string) {
  const target = Date.parse(`${date}T12:00:00Z`);
  let ms = target;
  for (let i = 0; i < 3; i++) {
    const p = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(ms));
    const v = (k: string) => p.find((x) => x.type === k)!.value;
    ms +=
      target -
      Date.parse(
        `${v("year")}-${v("month")}-${v("day")}T${v("hour")}:${v("minute")}:${v("second")}Z`,
      );
  }
  if (localDate(new Date(ms), timezone) !== date)
    throw new Error("That date does not exist in this timezone.");
  return new Date(ms).toISOString();
}
export const display = (n: number | null, unit = "") =>
  n === null
    ? "Unknown"
    : `${new Intl.NumberFormat("en", { maximumFractionDigits: 1 }).format(n)}${unit}`;
export function foodGrams(food: Food, quantity: number, unit: string) {
  if (foodBasis(food) !== "g")
    throw new Error("A volume-only food has no verified gram conversion.");
  return toGrams(quantity, unit, portions(food.portions));
}
export function toBasisAmount(
  quantity: number,
  unit: string,
  basis: NutritionBasis,
  choices: Portion[],
) {
  const serving = choices.find((p) => p.id === unit);
  const factor =
    unit === basis ? 1 : serving ? portionAmount(serving, basis) : undefined;
  if (
    !Number.isFinite(quantity) ||
    quantity <= 0 ||
    !factor ||
    !Number.isFinite(factor) ||
    factor <= 0 ||
    quantity * factor > 1000000
  )
    throw new Error("Enter a valid quantity and supported serving.");
  return quantity * factor;
}
