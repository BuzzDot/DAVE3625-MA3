import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  toGrams,
  scale,
  sumMacros,
  recipeNutrition,
  goalForDate,
  noonInZone,
  localDate,
} from "../../src/lib/nutrition/calculations";
import {
  normalizeFeed,
  externalFoodId,
} from "../../src/lib/nutrition/matvaretabellen";
import { foodSchema, entrySchema } from "../../src/lib/nutrition/validation";
import type { Food } from "../../src/lib/nutrition/types";
test("servings convert explicitly to grams and reject invalid quantities/units", () => {
  assert.equal(toGrams(2, "slice", [{ id: "slice", grams: 35 }]), 70);
  assert.equal(toGrams(0.5, "g", []), 0.5);
  for (const [amount, unit] of [
    [-1, "g"],
    [NaN, "g"],
    [1, "cup"],
    [1000001, "g"],
  ] as const)
    assert.throws(() => toGrams(amount, unit, []));
});
test("macros scale by edible grams without treating missing nutrients as zero", () => {
  assert.deepEqual(
    scale({ kcal: 369, protein: 14.1, carbs: 57.2, fat: 6.7 }, 50),
    { kcal: 184.5, protein: 7.05, carbs: 28.6, fat: 3.35 },
  );
  assert.deepEqual(
    sumMacros([
      { kcal: null, protein: 5, carbs: 0, fat: 1 },
      { kcal: 20, protein: 2, carbs: 4, fat: 0 },
    ]),
    { kcal: null, protein: 7, carbs: 4, fat: 1 },
  );
  assert.deepEqual(sumMacros([]), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
});
test("recipe yield and fractional servings use all ingredient quantities", () => {
  const foods = [
    {
      id: "a",
      kcal_per_100g: 400,
      protein_per_100g: 10,
      carbs_per_100g: 60,
      fat_per_100g: 5,
    },
    {
      id: "b",
      kcal_per_100g: 100,
      protein_per_100g: 20,
      carbs_per_100g: null,
      fat_per_100g: 0,
    },
  ] as Food[];
  const recipe = {
    id: "r",
    revision: 1,
    name: "Meal",
    instructions: "",
    servings: 2,
    ingredients: [
      { foodId: "a", grams: 50 },
      { foodId: "b", grams: 100 },
    ],
  };
  assert.deepEqual(recipeNutrition(recipe, foods), {
    total: { kcal: 300, protein: 25, carbs: null, fat: 2.5 },
    perServing: { kcal: 150, protein: 12.5, carbs: null, fat: 1.25 },
    grams: 150,
    servingGrams: 75,
  });
});
test("dated goals select the historical interval rather than the latest target", () => {
  const goals = [
    { starts_on: "2026-10-20", ends_on: null, kcal: 2400 },
    { starts_on: "2026-10-01", ends_on: "2026-10-19", kcal: 2000 },
  ];
  assert.equal(goalForDate(goals, "2026-10-16")?.kcal, 2000);
  assert.equal(goalForDate(goals, "2026-09-30"), undefined);
});
test("date-only logging preserves local dates across DST and extreme time zones", () => {
  for (const zone of [
    "Europe/Oslo",
    "Pacific/Kiritimati",
    "America/Los_Angeles",
  ])
    for (const date of ["2026-03-29", "2026-10-25", "2026-12-31"])
      assert.equal(localDate(new Date(noonInZone(date, zone)), zone), date);
  assert.throws(() => noonInZone("2011-12-30", "Pacific/Apia"));
});
const feed = {
  foods: [
    {
      foodId: "05.003",
      foodName: "Havregryn",
      uri: "https://www.matvaretabellen.no/havregryn/",
      calories: { quantity: 369, unit: "kcal" },
      searchKeywords: ["havre"],
      portions: [
        { id: "dl", portionName: "desiliter", quantity: 40, unit: "g" },
      ],
      constituents: [
        { nutrientId: "Protein", quantity: 14.1, unit: "g" },
        { nutrientId: "Karbo", unit: "g" },
        { nutrientId: "Fett", quantity: 0, unit: "g" },
        { nutrientId: "Fiber", quantity: 12, unit: "g" },
      ],
    },
  ],
};
test("official Norwegian normalization maps source IDs, grams, nutrients and unknowns", () => {
  const f = normalizeFeed(feed)[0];
  assert.equal(f.name, "Havregryn");
  assert.equal(f.external_id, "05.003");
  assert.equal(f.carbs_per_100g, null);
  assert.equal(f.fat_per_100g, 0);
  assert.equal(f.portions[0].grams, 40);
  assert.equal(f.nutrients.Fiber.amount, 12);
  assert.equal(f.id, externalFoodId("05.003"));
  assert.equal(normalizeFeed(feed)[0].id, f.id);
});
test("source import rejects duplicate IDs, untrusted URLs and malformed feeds", () => {
  assert.throws(() => normalizeFeed({ foods: [...feed.foods, ...feed.foods] }));
  assert.throws(() =>
    normalizeFeed({
      foods: [{ ...feed.foods[0], uri: "https://example.com" }],
    }),
  );
  assert.throws(() => normalizeFeed({ foods: [] }));
});
test("explicit null energy from the official feed remains unknown", () => {
  assert.equal(
    normalizeFeed({
      foods: [{ ...feed.foods[0], calories: { quantity: null, unit: "kcal" } }],
    })[0].kcal_per_100g,
    null,
  );
});
test("nutrition validation rejects forged ownership, fractional invalid values and missing source", () => {
  const food = {
    id: randomUUID(),
    revision: 0,
    name: "Food",
    description: "",
    kcal_per_100g: 200,
    protein_per_100g: 10,
    carbs_per_100g: null,
    fat_per_100g: 0,
    portions: [],
  };
  assert.equal(foodSchema.safeParse(food).success, true);
  assert.equal(
    foodSchema.safeParse({ ...food, owner_id: randomUUID() }).success,
    false,
  );
  assert.equal(
    foodSchema.safeParse({ ...food, protein_per_100g: 101 }).success,
    false,
  );
  assert.equal(
    entrySchema.safeParse({
      id: randomUUID(),
      revision: 0,
      foodId: null,
      recipeId: null,
      date: "2026-02-30",
      loggedAt: new Date().toISOString(),
      timezone: "Europe/Oslo",
      meal: "breakfast",
      quantity: 1,
      unit: "g",
    }).success,
    false,
  );
});
