import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { DailyNutritionTotals } from "../../src/components/nutrition/daily-totals";
import type { Goal } from "../../src/lib/nutrition/types";
afterEach(cleanup);
const goal = { kcal: 2200, protein_g: 140, carbs_g: 260, fat_g: 70 } as Goal;
it("keeps actual totals above target while bounding the progress indicator", () => {
  render(
    <DailyNutritionTotals
      totals={{ kcal: 2350, protein: 100, carbs: 260, fat: 0 }}
      goal={goal}
    />,
  );
  expect(screen.getByTestId("daily-kcal").textContent).toBe("2,350");
  expect(
    screen
      .getByRole("progressbar", { name: "Calories goal progress" })
      .getAttribute("value"),
  ).toBe("2200");
  expect(screen.getByText("150 kcal above target")).toBeTruthy();
  expect(screen.getByText("40 g remaining")).toBeTruthy();
  expect(screen.getByTestId("daily-fat").textContent).toBe("0 g");
  expect(
    screen
      .getByRole("progressbar", { name: "Fat goal progress" })
      .getAttribute("value"),
  ).toBe("0");
});
it("does not invent progress for unknown nutrients or absent targets", () => {
  render(
    <DailyNutritionTotals
      totals={{ kcal: null, protein: 10, carbs: 20, fat: null }}
      goal={goal}
    />,
  );
  expect(screen.getByTestId("daily-kcal").textContent).toBe("Unknown");
  expect(
    screen.queryByRole("progressbar", { name: "Calories goal progress" }),
  ).toBeNull();
  expect(
    screen.queryByRole("progressbar", { name: "Fat goal progress" }),
  ).toBeNull();
  expect(screen.getByText(/missing data as zero/)).toBeTruthy();
  cleanup();
  render(
    <DailyNutritionTotals
      totals={{ kcal: 100, protein: 10, carbs: 20, fat: 0 }}
    />,
  );
  expect(screen.getAllByText("No target set")).toHaveLength(4);
  expect(screen.queryByRole("progressbar")).toBeNull();
});
