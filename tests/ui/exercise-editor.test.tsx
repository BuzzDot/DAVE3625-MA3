import { afterEach, describe, expect, it } from "vitest";
import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { randomUUID } from "node:crypto";
import { ExerciseEditor } from "../../src/components/training/exercise-editor";
import type { ExerciseSlot } from "../../src/lib/training/types";
const makeSlot = (name: string): ExerciseSlot => ({
  id: randomUUID(),
  exerciseId: randomUUID(),
  name,
  trackingType: "reps_weight",
  notes: "",
  sets: [
    {
      id: randomUUID(),
      reps: 8,
      weight: 60,
      rpe: null,
      rir: null,
      setType: "working",
      notes: "",
      completedAt: null,
    },
  ],
});
function Harness({ template = false }: { template?: boolean }) {
  const [slots, setSlots] = useState([
    makeSlot("Bench press"),
    makeSlot("Barbell row"),
  ]);
  return (
    <ExerciseEditor slots={slots} onChange={setSlots} template={template} />
  );
}
afterEach(cleanup);
describe("strength exercise editor", () => {
  it("records repetitions, weights, warm-up types and completed sets independently", () => {
    render(<Harness />);
    const weight = screen.getByRole("spinbutton", {
      name: "Bench press set 1 weight (kg)",
    });
    fireEvent.change(weight, { target: { value: "65" } });
    expect((weight as HTMLInputElement).value).toBe("65");
    fireEvent.change(
      screen.getByRole("combobox", { name: "Bench press set 1 type" }),
      { target: { value: "warmup" } },
    );
    expect(
      (
        screen.getByRole("combobox", {
          name: "Bench press set 1 type",
        }) as HTMLSelectElement
      ).value,
    ).toBe("warmup");
    const done = screen.getByRole("button", {
      name: "Complete Bench press set 1",
    });
    expect(done.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(done);
    expect(done.getAttribute("aria-pressed")).toBe("true");
    expect(
      screen
        .getByRole("button", { name: "Complete Barbell row set 1" })
        .getAttribute("aria-pressed"),
    ).toBe("false");
  });
  it("adds and removes sets, reorders exercises and removes exercise slots", () => {
    render(<Harness />);
    fireEvent.click(screen.getAllByRole("button", { name: "Add set" })[0]);
    expect(
      screen.getByRole("spinbutton", { name: "Bench press set 2 repetitions" }),
    ).toBeDefined();
    fireEvent.click(
      screen.getByRole("button", { name: "Remove Bench press set 2" }),
    );
    expect(
      screen.queryByRole("spinbutton", {
        name: "Bench press set 2 repetitions",
      }),
    ).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "Move Barbell row up" }),
    );
    expect(screen.getAllByRole("heading", { level: 2 })[0].textContent).toBe(
      "Barbell row",
    );
    fireEvent.click(screen.getByRole("button", { name: "Remove Bench press" }));
    expect(screen.queryByRole("heading", { name: "Bench press" })).toBeNull();
  });
  it("template editing allows optional weight and never marks planned sets as completed", () => {
    render(<Harness template />);
    expect(
      screen.queryByRole("button", { name: "Complete Bench press set 1" }),
    ).toBeNull();
    const weight = screen.getByRole("spinbutton", {
      name: "Bench press set 1 weight (kg)",
    });
    fireEvent.change(weight, { target: { value: "" } });
    expect((weight as HTMLInputElement).value).toBe("");
  });
});
