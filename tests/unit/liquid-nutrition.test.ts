import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { foodSchema } from "../../src/lib/nutrition/validation";
import {
  toBasisAmount,
  foodGrams,
  recipeNutrition,
  scale,
  entryUnitLabel,
} from "../../src/lib/nutrition/calculations";
import type { Food, Portion, Entry } from "../../src/lib/nutrition/types";
const choices: Portion[] = [{ id: "can", label: "Can", ml: 330 }];
test("liquid diary serving labels come from the original snapshot, with legacy-unit fallback", () => {
  assert.equal(
    entryUnitLabel({
      unit_snapshot: "volume-330",
      basis_snapshot: {
        portions: [{ id: "volume-330", label: "330 ml", ml: 330 }],
      },
    } as unknown as Entry),
    "330 ml",
  );
  assert.equal(
    entryUnitLabel({ unit_snapshot: "g", basis_snapshot: null } as Entry),
    "g",
  );
});
test("volume amounts scale within ml and never silently convert to grams", () => {
  for (const ml of [250, 330, 500])
    assert.equal(toBasisAmount(ml, "ml", "ml", choices), ml);
  assert.equal(toBasisAmount(2, "can", "ml", choices), 660);
  assert.equal(
    scale({ kcal: 46, protein: 0, carbs: 11, fat: 0 }, 250).kcal,
    115,
  );
  assert.throws(() => toBasisAmount(250, "g", "ml", choices));
  assert.throws(() => toBasisAmount(250, "ml", "g", choices));
  assert.throws(() => foodGrams({ nutrition_basis: "ml" } as Food, 100, "g"));
});
test("food validation preserves zeros and prevents mixed mass/volume serving conversions", () => {
  const doc = {
    id: randomUUID(),
    revision: 0,
    name: "Water",
    description: "",
    nutrition_basis: "ml",
    kcal_per_100g: 0,
    protein_per_100g: null,
    carbs_per_100g: 0,
    fat_per_100g: 0,
    nutrients: { sugars: { amount: 0, unit: "g" } },
    portions: choices,
  };
  assert.equal(foodSchema.parse(doc).nutrients?.sugars.amount, 0);
  for (const portions of [
    [{ id: "can", label: "Can", grams: 330 }],
    [{ id: "can", label: "Can", grams: 330, ml: 330 }],
    [{ id: "ml", label: "Base override", ml: 200 }],
  ])
    assert.equal(foodSchema.safeParse({ ...doc, portions }).success, false);
  assert.equal(
    foodSchema.safeParse({ ...doc, nutrition_basis: "g" }).success,
    false,
  );
});
test("recipe previews do not calculate a gram ingredient from volume-only nutrients", () => {
  const n = recipeNutrition(
    {
      id: "r",
      revision: 1,
      name: "Invalid recipe",
      instructions: "",
      servings: 1,
      ingredients: [{ foodId: "v", grams: 100 }],
    },
    [
      {
        id: "v",
        nutrition_basis: "ml",
        kcal_per_100g: 46,
        protein_per_100g: 0,
        carbs_per_100g: 11,
        fat_per_100g: 0,
      } as Food,
    ],
  );
  assert.equal(n.total.kcal, null);
});
