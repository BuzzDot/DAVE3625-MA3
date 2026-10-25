import { z } from "zod";
const nullable = z.number().finite().min(0).max(100).nullable();
const portionFields = {
  id: z
    .string()
    .min(1)
    .max(80)
    .refine((v) => v !== "g"),
  label: z.string().trim().min(1).max(100),
};
export const portionSchema = z.union([
  z
    .object({ ...portionFields, grams: z.number().positive().max(100000) })
    .strict(),
  z
    .object({
      ...portionFields,
      ml: z.number().positive().max(100000),
      id: portionFields.id.refine((v) => v !== "ml"),
    })
    .strict(),
]);
/* Gram and volume portions are deliberately distinct; no density is implied. */
const nutrientSchema = z.record(
  z.string().min(1).max(80),
  z
    .object({
      amount: z.number().finite().min(0).max(1000000).nullable(),
      unit: z.string().min(1).max(20),
    })
    .strict(),
);
export const foodSchema = z
  .object({
    id: z.uuid(),
    revision: z.number().int().min(0),
    name: z.string().trim().min(1).max(200),
    description: z.string().max(2000),
    nutrition_basis: z.enum(["g", "ml"]).default("g"),
    nutrients: nutrientSchema.optional(),
    kcal_per_100g: z.number().min(0).max(2000).nullable(),
    protein_per_100g: nullable,
    carbs_per_100g: nullable,
    fat_per_100g: nullable,
    portions: z
      .array(portionSchema)
      .max(30)
      .refine(
        (p) => new Set(p.map((v) => v.id)).size === p.length,
        "Serving names must be unique",
      ),
  })
  .strict()
  .refine(
    (food) =>
      food.portions.every((p) =>
        food.nutrition_basis === "ml" ? "ml" in p : "grams" in p,
      ),
    "Serving units must match the food's nutrition basis.",
  );
export const recipeSchema = z
  .object({
    id: z.uuid(),
    revision: z.number().int().min(0),
    name: z.string().trim().min(1).max(200),
    instructions: z.string().max(10000),
    servings: z.number().min(0.001).max(10000),
    ingredients: z
      .array(
        z
          .object({
            foodId: z.uuid(),
            grams: z.number().min(0.001).max(100000),
          })
          .strict(),
      )
      .min(1)
      .max(100),
  })
  .strict();
export const dateSchema = z.iso.date();
export const entrySchema = z
  .object({
    id: z.uuid(),
    revision: z.number().int().min(0),
    foodId: z.uuid().nullable(),
    recipeId: z.uuid().nullable(),
    date: dateSchema,
    loggedAt: z.iso.datetime(),
    timezone: z
      .string()
      .min(1)
      .max(100)
      .refine((v) => {
        try {
          new Intl.DateTimeFormat("en", { timeZone: v });
          return true;
        } catch {
          return false;
        }
      }),
    meal: z.enum(["breakfast", "lunch", "dinner", "snack", "other"]),
    quantity: z.number().min(0.001).max(100000),
    unit: z.string().min(1).max(80),
  })
  .strict()
  .refine(
    (v) => Boolean(v.foodId) !== Boolean(v.recipeId),
    "Select one food or recipe",
  );
export const goalSchema = z
  .object({
    date: dateSchema,
    kcal: z.number().min(1).max(20000),
    protein: z.number().min(0).max(2000),
    carbs: z.number().min(0).max(4000),
    fat: z.number().min(0).max(2000),
  })
  .strict();
