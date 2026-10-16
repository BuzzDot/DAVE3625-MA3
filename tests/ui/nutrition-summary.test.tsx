import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { NutritionRecordSummary } from "../../src/components/nutrition/record-summary";
import type { Entry } from "../../src/lib/nutrition/types";
import { LogEditor } from "../../src/components/nutrition/editors";
afterEach(cleanup);
const entries = [
  {
    id: "1",
    local_date: "2026-10-13",
    name_snapshot: "Oats meal",
    meal_slot: "lunch",
    kcal_snapshot: 184.5,
    protein_snapshot: 7.05,
    carbs_snapshot: 28.6,
    fat_snapshot: 3.35,
  },
] as Entry[];
it("server rendered calendar date is disabled until client event handling is ready", () => {
  const html = renderToString(
    <NutritionRecordSummary entries={entries} today="2026-10-16" calendar />,
  );
  expect(html).toContain('disabled=""');
});
it("changing the recorded date updates totals and links to the same private diary day", () => {
  render(
    <NutritionRecordSummary entries={entries} today="2026-10-16" calendar />,
  );
  const input = screen.getByLabelText(
    "Recorded nutrition date",
  ) as HTMLInputElement;
  expect(input.disabled).toBe(false);
  fireEvent.change(input, { target: { value: "2026-10-13" } });
  expect(screen.getByText("184.5 kcal")).toBeTruthy();
  expect(screen.getByText(/lunch.*Oats meal/)).toBeTruthy();
  expect(
    screen
      .getByRole("link", { name: "Open nutrition diary" })
      .getAttribute("href"),
  ).toBe("/nutrition?date=2026-10-13");
});
it("editing a stored offset timestamp preserves its instant in canonical UTC form", () => {
  const onSave = vi.fn();
  const entry = {
    ...entries[0],
    food_id: "food-id",
    recipe_id: null,
    local_date: "2026-10-13",
    logged_at: "2026-10-13T10:00:00+00:00",
    timezone: "Europe/Oslo",
    quantity: 50,
    unit_snapshot: "g",
    revision: 1,
    basis_snapshot: {
      kcal: 369,
      protein: 14.1,
      carbs: 57.2,
      fat: 6.7,
      portions: [],
    },
  } as Entry;
  render(
    <LogEditor
      selection={{ entry, meal: "lunch" }}
      date="2026-10-13"
      timezone="Europe/Oslo"
      foods={[]}
      onSave={onSave}
      onCancel={() => {}}
    />,
  );
  fireEvent.change(
    screen.getByRole("spinbutton", { name: "Consumed quantity" }),
    { target: { value: "60" } },
  );
  fireEvent.click(screen.getByRole("button", { name: "Save entry changes" }));
  expect(onSave).toHaveBeenCalledWith(
    expect.objectContaining({
      quantity: 60,
      date: "2026-10-13",
      loggedAt: "2026-10-13T10:00:00.000Z",
    }),
  );
});
