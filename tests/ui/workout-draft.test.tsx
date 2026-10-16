import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { randomUUID } from "node:crypto";
const { save } = vi.hoisted(() => ({ save: vi.fn() }));
vi.mock("@/app/workouts/actions", () => ({ saveWorkoutAction: save }));
import { useWorkoutDraft } from "../../src/components/training/use-workout-draft";
import type {
  WorkoutDocument,
  ActionResult,
  SaveResult,
} from "../../src/lib/training/types";
function initial(): WorkoutDocument {
  return {
    id: randomUUID(),
    revision: 1,
    name: "Upper body",
    notes: "",
    routineId: null,
    timezone: "Europe/Oslo",
    startedAt: "2026-10-15T16:00:00Z",
    completedAt: null,
    exercises: [
      {
        id: randomUUID(),
        exerciseId: randomUUID(),
        name: "Bench press",
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
            completedAt: "2026-10-15T16:30:00Z",
          },
        ],
      },
    ],
  };
}
const userId = randomUUID();
async function tick(ms = 1300) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}
beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  save.mockReset();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
describe("workout draft synchronization (mocked transport, not Supabase integration)", () => {
  it("does not save initial data and confirms autosave only after the server acknowledges", async () => {
    const doc = initial();
    let resolve!: (value: ActionResult<SaveResult>) => void;
    save.mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    const { result } = renderHook(() => useWorkoutDraft(doc, userId));
    await tick();
    expect(save).not.toHaveBeenCalled();
    act(() => result.current.change({ ...doc, notes: "Hard session" }));
    await tick();
    expect(result.current.status).toBe("Saving…");
    expect(save).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolve({ success: true, data: { id: doc.id, revision: 2 } });
    });
    expect(result.current.status).toBe("Saved to your account");
    expect(localStorage.getItem(`form:workout:${userId}:${doc.id}`)).toBeNull();
  });
  it("serializes overlapping edits and uses the acknowledged revision for the next save", async () => {
    const doc = initial();
    let resolveFirst!: (value: ActionResult<SaveResult>) => void;
    save
      .mockImplementationOnce(
        () =>
          new Promise((r) => {
            resolveFirst = r;
          }),
      )
      .mockResolvedValue({ success: true, data: { id: doc.id, revision: 3 } });
    const { result } = renderHook(() => useWorkoutDraft(doc, userId));
    await tick(0);
    act(() => result.current.change({ ...doc, notes: "First change" }));
    await tick();
    act(() => result.current.change({ ...doc, notes: "Second change" }));
    await tick();
    expect(save).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolveFirst({ success: true, data: { id: doc.id, revision: 2 } });
    });
    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[1][0].revision).toBe(2);
    expect(save.mock.calls[1][0].notes).toBe("Second change");
    expect(result.current.status).toBe("Saved to your account");
  });
  it("never silently retries over a conflicting remote revision", async () => {
    const doc = initial();
    save.mockResolvedValue({
      success: false,
      error: "Conflict — reload",
      conflict: true,
    });
    const { result } = renderHook(() => useWorkoutDraft(doc, userId));
    await tick(0);
    act(() => result.current.change({ ...doc, notes: "New notes" }));
    await tick();
    expect(result.current.error).toContain("Conflict");
    act(() => result.current.change({ ...doc, notes: "Another change" }));
    await tick();
    expect(save).toHaveBeenCalledTimes(1);
    expect(
      localStorage.getItem(`form:workout:${userId}:${doc.id}`),
    ).not.toBeNull();
  });
  it("offers device recovery without uploading it until the user restores it", async () => {
    const doc = initial();
    doc.revision = 4;
    const recovery = { ...doc, notes: "Recovered notes" };
    localStorage.setItem(
      `form:workout:${userId}:${doc.id}`,
      JSON.stringify({ document: recovery, baseRevision: 3 }),
    );
    save.mockResolvedValue({
      success: true,
      data: { id: doc.id, revision: 5 },
    });
    const { result } = renderHook(() => useWorkoutDraft(doc, userId));
    await tick();
    expect(result.current.recovery?.baseRevision).toBe(3);
    expect(result.current.document.notes).toBe("");
    expect(save).not.toHaveBeenCalled();
    act(() => result.current.restoreRecovery());
    await tick();
    expect(save.mock.calls[0][0].notes).toBe("Recovered notes");
    expect(save.mock.calls[0][0].revision).toBe(4);
  });
  it("prepares deletion with the latest persisted revision rather than page-load revision", async () => {
    const doc = initial();
    save.mockResolvedValue({
      success: true,
      data: { id: doc.id, revision: 2 },
    });
    const { result } = renderHook(() => useWorkoutDraft(doc, userId));
    await tick(0);
    act(() => result.current.change({ ...doc, notes: "Saved later" }));
    await tick();
    let revision = 0;
    await act(async () => {
      revision = await result.current.prepareDelete();
    });
    expect(revision).toBe(2);
  });
  it("validates before sending and preserves an invalid edit for correction", async () => {
    const doc = initial();
    const { result } = renderHook(() => useWorkoutDraft(doc, userId));
    await tick(0);
    act(() => result.current.change({ ...doc, name: "" }));
    await tick();
    expect(save).not.toHaveBeenCalled();
    expect(result.current.status).toContain("Not saved");
    expect(result.current.error).not.toBe("");
  });
  it("marks completion only after the completed record has been saved", async () => {
    const doc = initial();
    let resolve!: (value: ActionResult<SaveResult>) => void;
    save.mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    const { result } = renderHook(() => useWorkoutDraft(doc, userId));
    await tick(0);
    let completion!: Promise<boolean>;
    act(() => {
      completion = result.current.persist(true);
    });
    await tick(0);
    expect(result.current.document.completedAt).toBeNull();
    await act(async () => {
      resolve({ success: true, data: { id: doc.id, revision: 2 } });
      await completion;
    });
    expect(result.current.document.completedAt).not.toBeNull();
    expect(result.current.status).toBe("Saved to your account");
  });
});
