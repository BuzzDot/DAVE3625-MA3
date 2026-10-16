import { z } from "zod";
const nullable = z.number().finite().min(0).max(100).nullable();
export const portionSchema = z
  .object({
    id: z
      .string()
      .min(1)
      .max(80)
      .refine((v) => v !== "g"),
    label: z.string().trim().min(1).max(100),
    grams: z.number().positive().max(100000),
  })
  .strict();
export const foodSchema = z
  .object({
    id: z.uuid(),
    revision: z.number().int().min(0),
    name: z.string().trim().min(1).max(200),
    description: z.string().max(2000),
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
  .strict();
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
