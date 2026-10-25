"use client";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  recipeNutrition,
  foodMacros,
  toBasisAmount,
  scale,
  display,
  noonInZone,
} from "@/lib/nutrition/calculations";
import {
  macroKeys,
  portions,
  foodBasis,
  portionAmount,
  type Portion,
  type Food,
  type FoodInput,
  type Recipe,
  type Entry,
  type EntryInput,
  type Macros,
  type NutritionData,
} from "@/lib/nutrition/types";
import { FoodSearch } from "./food-library";
import { MacroLine, NumberField, mealNames, labels, type Meal } from "./fields";
export function FoodEditor({
  value,
  onChange,
  onCancel,
  onSave,
}: {
  value: FoodInput;
  onChange: (f: FoodInput) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const baseUnit = foodBasis(value);
  return (
    <Card className="border-primary">
      <h2 className="mb-4 text-lg font-semibold">
        {value.revision ? "Edit food" : "Create food"}
      </h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave();
        }}
        className="space-y-4"
      >
        <label className="block text-xs">
          Food name
          <input
            className="mt-2"
            required
            maxLength={200}
            value={value.name}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
          />
        </label>
        <label className="block text-xs">
          Description
          <textarea
            className="mt-2"
            maxLength={2000}
            value={value.description}
            onChange={(e) =>
              onChange({ ...value, description: e.target.value })
            }
          />
        </label>
        <label className="block text-xs">
          Nutrition basis
          <select
            className="mt-2"
            value={baseUnit}
            disabled={value.revision > 0}
            onChange={(e) =>
              onChange({
                ...value,
                nutrition_basis: e.target.value as "g" | "ml",
                kcal_per_100g: null,
                protein_per_100g: null,
                carbs_per_100g: null,
                fat_per_100g: null,
                nutrients: {},
                portions: [],
              })
            }
          >
            <option value="g">Per 100 grams (g)</option>
            <option value="ml">Per 100 milliliters (ml)</option>
          </select>
        </label>
        <p className="text-xs text-muted-foreground">
          Per 100 {baseUnit}. Changing basis clears values; saved foods keep
          their basis. Leave unknown values blank; enter 0 only when the value
          is known to be zero.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {(["kcal", "protein", "carbs", "fat"] as const).map((k) => {
            const field = `${k}_per_100g` as
              | "kcal_per_100g"
              | "protein_per_100g"
              | "carbs_per_100g"
              | "fat_per_100g";
            return (
              <NumberField
                key={k}
                label={`${labels[k]} per 100 ${baseUnit}`}
                value={value[field]}
                optional
                max={k === "kcal" ? 2000 : 100}
                onChange={(v) => onChange({ ...value, [field]: v })}
              />
            );
          })}
        </div>
        {value.nutrients?.sugars && (
          <NumberField
            label={`Sugars per 100 ${baseUnit}`}
            optional
            max={100}
            value={value.nutrients.sugars.amount}
            onChange={(amount) =>
              onChange({
                ...value,
                nutrients: {
                  ...value.nutrients,
                  sugars: { amount, unit: "g" },
                },
              })
            }
          />
        )}
        <h3 className="text-sm font-semibold">Serving units</h3>
        {value.portions.map((p, i) => (
          <div key={p.id} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <label className="text-xs">
              Serving name
              <input
                className="mt-2"
                required
                maxLength={100}
                value={p.label}
                onChange={(e) =>
                  onChange({
                    ...value,
                    portions: value.portions.map((v, j) =>
                      j === i ? { ...v, label: e.target.value } : v,
                    ),
                  })
                }
              />
            </label>
            <NumberField
              label={`Serving ${i + 1} ${baseUnit === "ml" ? "milliliters" : "grams"}`}
              value={portionAmount(p, baseUnit) ?? null}
              onChange={(grams) =>
                onChange({
                  ...value,
                  portions: value.portions.map((v, j) =>
                    j === i
                      ? {
                          id: v.id,
                          label: v.label,
                          ...(baseUnit === "ml"
                            ? { ml: grams ?? 0 }
                            : { grams: grams ?? 0 }),
                        }
                      : v,
                  ),
                })
              }
            />
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                onChange({
                  ...value,
                  portions: value.portions.filter((_, j) => j !== i),
                })
              }
            >
              Remove serving
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          disabled={value.portions.length >= 30}
          onClick={() =>
            onChange({
              ...value,
              portions: [
                ...value.portions,
                {
                  id: crypto.randomUUID(),
                  label: "serving",
                  ...(baseUnit === "ml" ? { ml: 100 } : { grams: 100 }),
                },
              ],
            })
          }
        >
          Add serving unit
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button type="submit">Save food</Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel food editing
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function RecipeEditor({
  value,
  foods,
  onChange,
  onCancel,
  onSave,
}: {
  value: Recipe;
  foods: Food[];
  onChange: (r: Recipe) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  const nutrition = recipeNutrition(value, foods);
  return (
    <Card className="border-primary">
      <h2 className="mb-4 text-lg font-semibold">Recipe editor</h2>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSave();
        }}
      >
        <label className="block text-xs">
          Recipe name
          <input
            className="mt-2"
            required
            maxLength={200}
            value={value.name}
            onChange={(e) => onChange({ ...value, name: e.target.value })}
          />
        </label>
        <NumberField
          label="Recipe servings"
          value={value.servings}
          max={10000}
          onChange={(v) => onChange({ ...value, servings: v ?? 0 })}
        />
        <label className="block text-xs">
          Instructions
          <textarea
            className="mt-2"
            maxLength={10000}
            value={value.instructions}
            onChange={(e) =>
              onChange({ ...value, instructions: e.target.value })
            }
          />
        </label>
        {value.ingredients.map((ingredient, i) => (
          <div key={i} className="grid items-end gap-2 sm:grid-cols-[1fr_auto]">
            <NumberField
              label={`${foods.find((f) => f.id === ingredient.foodId)?.name ?? "Unavailable food"} ingredient ${i + 1} grams`}
              value={ingredient.grams}
              onChange={(grams) =>
                onChange({
                  ...value,
                  ingredients: value.ingredients.map((v, j) =>
                    j === i ? { ...v, grams: grams ?? 0 } : v,
                  ),
                })
              }
            />
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                onChange({
                  ...value,
                  ingredients: value.ingredients.filter((_, j) => j !== i),
                })
              }
            >
              Remove ingredient {i + 1}
            </Button>
          </div>
        ))}
        <p className="text-xs">
          Whole recipe · {display(nutrition.grams, " g")}
        </p>
        <MacroLine values={nutrition.total} />
        <p className="text-xs">Per serving</p>
        <MacroLine values={nutrition.perServing} />
        <div className="flex flex-wrap gap-2">
          <Button
            type="submit"
            disabled={!value.ingredients.length || value.servings <= 0}
          >
            Save recipe
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel recipe editing
          </Button>
        </div>
      </form>
      <div className="mt-6">
        <h3 className="mb-3 text-sm font-semibold">Add ingredients</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Recipes require gram-based ingredients. Volume-only foods can be
          logged directly in milliliters.
        </p>
        <FoodSearch
          foods={foods.filter((f) => !f.archived_at && foodBasis(f) === "g")}
          chooseLabel="Add ingredient"
          onChoose={(food) => {
            if (value.ingredients.length < 100)
              onChange({
                ...value,
                ingredients: [
                  ...value.ingredients,
                  { foodId: food.id, grams: 100 },
                ],
              });
          }}
        />
      </div>
    </Card>
  );
}

export function LogEditor({
  selection,
  date,
  timezone,
  foods,
  onCancel,
  onSave,
}: {
  selection: { food?: Food; recipe?: Recipe; entry?: Entry; meal: Meal };
  date: string;
  timezone: string;
  foods: Food[];
  onCancel: () => void;
  onSave: (e: EntryInput) => void;
}) {
  const { food, recipe, entry } = selection;
  const [quantity, setQuantity] = useState<number | null>(
    entry?.quantity ?? (recipe ? 1 : 100),
  );
  const [unit, setUnit] = useState(
    entry?.unit_snapshot ?? (recipe ? "serving" : food ? foodBasis(food) : "g"),
  );
  const [meal, setMeal] = useState(selection.meal);
  const [entryDate, setEntryDate] = useState(entry?.local_date ?? date);
  const [error, setError] = useState("");
  const basis = entry?.basis_snapshot as {
    portions?: Portion[];
    basisUnit?: "g" | "ml";
    kcal: number | null;
    protein: number | null;
    carbs: number | null;
    fat: number | null;
  } | null;
  const choices =
    basis?.portions ??
    (food
      ? portions(food.portions)
      : recipe
        ? [
            {
              id: "serving",
              label: "serving",
              grams: recipeNutrition(recipe, foods).servingGrams,
            },
          ]
        : []);
  const baseUnit = basis?.basisUnit ?? (food ? foodBasis(food) : "g");
  const conversion =
    unit === baseUnit
      ? 1
      : choices.find((p) => p.id === unit)
        ? (portionAmount(
            choices.find((p) => p.id === unit)!,
            baseUnit,
          ) ?? 0)
        : 0;
  let preview: Macros = { kcal: null, protein: null, carbs: null, fat: null };
  if (quantity !== null && quantity > 0) {
    if (entry && basis) preview = scale(basis, quantity * conversion);
    else if (food) {
      try {
        preview = scale(
          foodMacros(food),
          toBasisAmount(quantity, unit, baseUnit, choices),
        );
      } catch {}
    } else if (recipe) {
      const n = recipeNutrition(recipe, foods);
      preview = scale(n.total, ((quantity * conversion) / n.grams) * 100);
    }
  }
  const name = entry?.name_snapshot ?? food?.name ?? recipe?.name;
  return (
    <Card className="border-primary" data-testid="nutrition-log-editor">
      <h2 className="mb-4 text-lg font-semibold">
        {entry ? "Edit logged food" : "Log food"} · {name}
      </h2>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          try {
            if (!quantity || quantity <= 0)
              throw new Error("Enter a positive quantity.");
            onSave({
              id: entry?.id ?? crypto.randomUUID(),
              revision: entry?.revision ?? 0,
              foodId: entry?.food_id ?? food?.id ?? null,
              recipeId: entry?.recipe_id ?? recipe?.id ?? null,
              quantity,
              unit,
              date: entryDate,
              loggedAt:
                entry && entry.local_date === entryDate
                  ? new Date(entry.logged_at).toISOString()
                  : noonInZone(entryDate, entry?.timezone ?? timezone),
              timezone: entry?.timezone ?? timezone,
              meal,
            });
          } catch (err) {
            setError(
              err instanceof Error ? err.message : "Check quantity and date.",
            );
          }
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <NumberField
            label="Consumed quantity"
            value={quantity}
            onChange={setQuantity}
          />
          <label className="text-xs">
            Quantity unit
            <select
              className="mt-2"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            >
              <option value={baseUnit}>
                {baseUnit === "ml" ? "milliliters (ml)" : "grams (g)"}
              </option>
              {choices.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label} (
                  {display(portionAmount(p, baseUnit) ?? null, ` ${baseUnit}`)})
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs">
            Meal category
            <select
              className="mt-2"
              value={meal}
              onChange={(e) => setMeal(e.target.value as Meal)}
            >
              {Object.entries(mealNames).map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs">
            Consumed date
            <input
              className="mt-2"
              type="date"
              required
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
            />
          </label>
        </div>
        <p className="text-xs text-muted-foreground">
          {display(
            quantity === null ? null : quantity * conversion,
            ` ${baseUnit}`,
          )}{" "}
          ·{" "}
          {entry
            ? "Uses the original nutritional snapshot."
            : "Values are confirmed by the database when saved."}
        </p>
        <MacroLine values={preview} />
        <p role="alert" className="text-xs text-red-700">
          {error}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button type="submit">
            {entry ? "Save entry changes" : "Save food entry"}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel logging
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function GoalEditor({
  date,
  goal,
  onSave,
}: {
  date: string;
  goal: NutritionData["goals"][number] | undefined;
  onSave: (values: {
    date: string;
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
  }) => void;
}) {
  const [values, setValues] = useState({
    kcal: goal?.kcal ?? null,
    protein: goal?.protein_g ?? null,
    carbs: goal?.carbs_g ?? null,
    fat: goal?.fat_g ?? null,
  });
  return (
    <Card>
      <h2 className="text-lg font-semibold">Daily nutrition goals</h2>
      <p className="my-3 text-xs leading-6 text-muted-foreground">
        Applies from {date} until the next goal period. Earlier targets stay in
        history. Choose another diary date to set a future or past period.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (macroKeys.every((k) => values[k] !== null))
            onSave({ date, ...values } as {
              date: string;
              kcal: number;
              protein: number;
              carbs: number;
              fat: number;
            });
        }}
        className="space-y-4"
      >
        <div className="grid grid-cols-2 gap-4">
          {macroKeys.map((k) => (
            <NumberField
              key={k}
              label={`${labels[k]} target${k === "kcal" ? " (kcal)" : " (g)"}`}
              value={values[k]}
              max={k === "kcal" ? 20000 : k === "carbs" ? 4000 : 2000}
              onChange={(v) => setValues({ ...values, [k]: v })}
            />
          ))}
        </div>
        <Button type="submit">Save nutrition goals</Button>
      </form>
    </Card>
  );
}
