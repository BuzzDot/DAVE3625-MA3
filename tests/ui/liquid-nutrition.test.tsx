import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { FoodEditor, LogEditor } from "../../src/components/nutrition/editors";
import type { Food, FoodInput, Entry } from "../../src/lib/nutrition/types";
afterEach(cleanup);
const food = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Energy drink",
  nutrition_basis: "ml",
  kcal_per_100g: 46,
  protein_per_100g: 0,
  carbs_per_100g: 11,
  fat_per_100g: 0,
  portions: [{ id: "can", label: "Can", ml: 250 }],
} as unknown as Food;
it("liquid logger offers milliliters, previews intake and submits an explicit volume unit", () => {
  const save = vi.fn();
  render(
    <LogEditor
      selection={{ food, meal: "snack" }}
      date="2026-10-25"
      timezone="Europe/Oslo"
      foods={[food]}
      onSave={save}
      onCancel={() => {}}
    />,
  );
  const units = screen.getByLabelText("Quantity unit");
  expect(units.textContent).toContain("milliliters (ml)");
  expect(units.textContent).not.toContain("grams (g)");
  fireEvent.change(screen.getByLabelText("Consumed quantity"), {
    target: { value: "250" },
  });
  expect(screen.getByTestId("nutrition-log-editor").textContent).toContain(
    "115 kcal",
  );
  fireEvent.click(screen.getByText("Save food entry"));
  expect(save).toHaveBeenCalledWith(
    expect.objectContaining({ quantity: 250, unit: "ml" }),
  );
});
it("old liquid entry corrections use original volume basis even if the catalog changes", () => {
  const entry = {
    food_id: food.id,
    quantity: 1,
    unit_snapshot: "can",
    name_snapshot: "Old drink",
    local_date: "2026-10-25",
    basis_snapshot: {
      basisUnit: "ml",
      kcal: 46,
      protein: 0,
      carbs: 11,
      fat: 0,
      portions: [{ id: "can", label: "Original can", ml: 250 }],
    },
  } as unknown as Entry;
  render(
    <LogEditor
      selection={{ entry, meal: "snack" }}
      date="2026-10-25"
      timezone="Europe/Oslo"
      foods={[]}
      onSave={() => {}}
      onCancel={() => {}}
    />,
  );
  fireEvent.change(screen.getByLabelText("Consumed quantity"), {
    target: { value: "2" },
  });
  expect(screen.getByTestId("nutrition-log-editor").textContent).toContain(
    "230 kcal",
  );
  expect(screen.getByLabelText("Quantity unit").textContent).toContain(
    "250 ml",
  );
});
it("changing a new food basis clears incompatible values and saved foods keep their basis", () => {
  const change = vi.fn();
  const value = {
    ...food,
    description: "",
    revision: 0,
    nutrients: { sugars: { amount: 0, unit: "g" } },
  } as unknown as FoodInput;
  const view = render(
    <FoodEditor
      value={value}
      onChange={change}
      onSave={() => {}}
      onCancel={() => {}}
    />,
  );
  expect(screen.getByLabelText("Sugars per 100 ml")).toHaveProperty(
    "value",
    "0",
  );
  fireEvent.change(screen.getByLabelText("Nutrition basis"), {
    target: { value: "g" },
  });
  expect(change).toHaveBeenCalledWith(
    expect.objectContaining({
      nutrition_basis: "g",
      kcal_per_100g: null,
      portions: [],
      nutrients: {},
    }),
  );
  view.rerender(
    <FoodEditor
      value={{ ...value, revision: 1 }}
      onChange={change}
      onSave={() => {}}
      onCancel={() => {}}
    />,
  );
  expect(screen.getByLabelText("Nutrition basis")).toHaveProperty(
    "disabled",
    true,
  );
});
