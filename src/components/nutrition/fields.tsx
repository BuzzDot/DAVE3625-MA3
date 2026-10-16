"use client";
import { display } from "@/lib/nutrition/calculations";
import type { Macros } from "@/lib/nutrition/types";
export const mealNames = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snacks",
  other: "Other",
};
export type Meal = keyof typeof mealNames;
export const labels = {
  kcal: "Calories",
  protein: "Protein",
  carbs: "Carbohydrates",
  fat: "Fat",
};
export function MacroLine({ values }: { values: Macros }) {
  return (
    <p className="mt-2 text-xs leading-6 text-muted-foreground">
      {display(values.kcal, " kcal")} <span aria-hidden="true"> · </span> P{" "}
      {display(values.protein, " g")} <span aria-hidden="true"> · </span> C{" "}
      {display(values.carbs, " g")} <span aria-hidden="true"> · </span> F{" "}
      {display(values.fat, " g")}
    </p>
  );
}
export function NumberField({
  label,
  value,
  onChange,
  optional = false,
  max = 100000,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
  optional?: boolean;
  max?: number;
}) {
  return (
    <label className="block text-xs">
      {label}
      <input
        className="mt-2"
        type="number"
        inputMode="decimal"
        min={0}
        max={max}
        step="0.001"
        required={!optional}
        value={value ?? ""}
        onChange={(e) =>
          onChange(e.target.value === "" ? null : Number(e.target.value))
        }
      />
    </label>
  );
}
