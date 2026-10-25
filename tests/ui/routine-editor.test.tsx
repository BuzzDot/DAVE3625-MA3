import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { emptyRoutine, newSlot } from "../../src/lib/training/documents";
import type {
  Exercise,
  ActionResult,
  SaveResult,
} from "../../src/lib/training/types";

const { save } = vi.hoisted(() => ({ save: vi.fn() }));
vi.mock("@/app/workouts/actions", () => ({ saveRoutineAction: save }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
import { RoutineEditor } from "../../src/components/training/routine-editor";

const exercise: Exercise = {
  id: "f0000000-0000-4000-8000-000000000001",
  name: "Bench press",
  muscleGroup: "Chest",
  equipment: "Barbell",
  trackingType: "reps_weight",
  custom: false,
  archived: false,
  favorite: false,
};
function setup() {
  const initial = { ...emptyRoutine(), exercises: [newSlot(exercise)] };
  const close = vi.fn();
  render(
    <RoutineEditor initial={initial} exercises={[exercise]} onClose={close} />,
  );
  return { initial, close };
}
beforeEach(() => save.mockReset());
afterEach(cleanup);

it("keeps edits after a transport failure and closes only after an acknowledged retry", async () => {
  let rejectSave!: (error: Error) => void;
  save.mockImplementationOnce(
    () =>
      new Promise((_, reject) => {
        rejectSave = reject;
      }),
  );
  const { initial, close } = setup();
  const name = screen.getByLabelText("Routine name");
  fireEvent.change(name, { target: { value: "Edited routine" } });
  fireEvent.change(screen.getByLabelText("Routine notes"), {
    target: { value: "Keep my notes" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save routine" }));
  await waitFor(() =>
    expect((name.closest("fieldset") as HTMLFieldSetElement).disabled).toBe(
      true,
    ),
  );
  expect(close).not.toHaveBeenCalled();
  await act(async () => rejectSave(new Error("Network unavailable")));
  expect(
    screen.getByText(/Your edits are still here/).getAttribute("role"),
  ).toBe("alert");
  expect((name as HTMLInputElement).value).toBe("Edited routine");
  expect(
    (screen.getByLabelText("Routine notes") as HTMLInputElement).value,
  ).toBe("Keep my notes");
  expect((name.closest("fieldset") as HTMLFieldSetElement).disabled).toBe(
    false,
  );
  expect(close).not.toHaveBeenCalled();
  save.mockResolvedValueOnce({
    success: true,
    data: { id: initial.id, revision: 1 },
  } satisfies ActionResult<SaveResult>);
  fireEvent.click(screen.getByRole("button", { name: "Save routine" }));
  await waitFor(() => expect(close).toHaveBeenCalledOnce());
  expect(save.mock.calls[1][0]).toMatchObject({
    id: initial.id,
    name: "Edited routine",
    notes: "Keep my notes",
  });
});

it("shows a rejected server save without closing or clearing the draft", async () => {
  save.mockResolvedValueOnce({
    success: false,
    conflict: true,
    error: "This record changed in another tab. Reload before editing again.",
  });
  const { close } = setup();
  fireEvent.change(screen.getByLabelText("Routine name"), {
    target: { value: "Unsaved correction" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save routine" }));
  await waitFor(() =>
    expect(screen.getByText(/another tab/).getAttribute("role")).toBe("alert"),
  );
  expect(
    (screen.getByLabelText("Routine name") as HTMLInputElement).value,
  ).toBe("Unsaved correction");
  expect(close).not.toHaveBeenCalled();
});
