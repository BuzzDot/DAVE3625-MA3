import { createHash } from "node:crypto";
import { z } from "zod";
const amount = z.number().finite().nonnegative().nullish();
const constituent = z.object({
  nutrientId: z.string(),
  quantity: amount,
  unit: z.string().optional(),
  sourceId: z.string().optional(),
});
const rawFood = z.object({
  foodId: z.string().min(1),
  foodName: z.string().min(1).max(200),
  uri: z.url().refine((v) => new URL(v).hostname === "www.matvaretabellen.no"),
  calories: z
    .object({ quantity: amount, unit: z.literal("kcal").optional() })
    .optional(),
  searchKeywords: z.array(z.string()).default([]),
  constituents: z.array(constituent),
  portions: z
    .array(
      z.object({
        id: z.string(),
        portionName: z.string(),
        quantity: amount,
        unit: z.string(),
      }),
    )
    .default([]),
});
export const feedSchema = z.object({ foods: z.array(rawFood).min(1) });
export function externalFoodId(externalId: string) {
  const hex = createHash("sha256")
    .update(`form:matvaretabellen:${externalId}`)
    .digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
export function normalizeFeed(input: unknown) {
  const parsed = feedSchema.parse(input);
  const seen = new Set<string>();
  return parsed.foods.map((food) => {
    if (seen.has(food.foodId)) throw new Error("Duplicate source food ID.");
    seen.add(food.foodId);
    const macro = (id: string) => {
      const n = food.constituents.find((v) => v.nutrientId === id);
      return n?.unit === "g" && n.quantity != null ? n.quantity : null;
    };
    const nutrients = Object.fromEntries(
      food.constituents
        .filter(
          (n) =>
            n.unit &&
            ["Fiber", "Mono+Di", "Mettet", "Na", "Ca", "Fe"].includes(
              n.nutrientId,
            ),
        )
        .map((n) => [
          n.nutrientId,
          {
            amount: n.quantity ?? null,
            unit: n.unit!,
            sourceId: n.sourceId ?? null,
          },
        ]),
    );
    const portions = food.portions
      .filter(
        (p) =>
          p.unit === "g" &&
          p.quantity != null &&
          p.quantity > 0 &&
          p.id !== "g",
      )
      .map((p) => ({ id: p.id, label: p.portionName, grams: p.quantity! }));
    return {
      id: externalFoodId(food.foodId),
      owner_id: null,
      name: food.foodName,
      description: "Nutritional values per 100 g edible portion.",
      kcal_per_100g: food.calories?.quantity ?? null,
      protein_per_100g: macro("Protein"),
      carbs_per_100g: macro("Karbo"),
      fat_per_100g: macro("Fett"),
      portions: [...new Map(portions.map((p) => [p.id, p])).values()],
      nutrients,
      source: "matvaretabellen",
      external_id: food.foodId,
      source_url: food.uri,
      search_keywords: food.searchKeywords.join(" "),
    };
  });
}
