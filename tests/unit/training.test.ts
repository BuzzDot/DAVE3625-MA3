import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  eligibleSet,
  estimated1RM,
  exerciseHistory,
  personalRecords,
  previousComparison,
  summarizeExercises,
} from "../../src/lib/training/calculations";
import {
  routineSchema,
  workoutSchema,
  exerciseSchema,
} from "../../src/lib/training/validation";
import {
  duplicateRoutine,
  moveItem,
  newSet,
  workoutFromRoutine,
} from "../../src/lib/training/documents";
import type {
  ExerciseSlot,
  RoutineDocument,
  TrainingSet,
  WorkoutDocument,
} from "../../src/lib/training/types";
const exerciseId = randomUUID();
const set = (overrides: Partial<TrainingSet> = {}): TrainingSet => ({
  id: randomUUID(),
  reps: 8,
  weight: 60,
  rpe: null,
  rir: null,
  setType: "working",
  notes: "",
  completedAt: "2026-10-15T16:30:00Z",
  ...overrides,
});
const slot = (sets: TrainingSet[] = [set()]): ExerciseSlot => ({
  id: randomUUID(),
  exerciseId,
  name: "Bench press snapshot",
  trackingType: "reps_weight",
  notes: "",
  sets,
});
const workout = (
  overrides: Partial<WorkoutDocument> = {},
): WorkoutDocument => ({
  id: randomUUID(),
  revision: 1,
  name: "Training",
  notes: "",
  routineId: null,
  timezone: "Europe/Oslo",
  startedAt: "2026-10-15T16:00:00Z",
  completedAt: "2026-10-15T17:00:00Z",
  exercises: [slot()],
  ...overrides,
});

test("Epley uses actual single-rep load and caps eligibility at 12 reps", () => {
  assert.equal(estimated1RM(100, 1), 100);
  assert.equal(estimated1RM(60, 8), 76);
  assert.equal(estimated1RM(100, 12), 140);
  for (const [weight, reps] of [
    [0, 8],
    [-10, 8],
    [100, 0],
    [100, 13],
    [100, 1.5],
    [Infinity, 8],
    [NaN, 8],
  ])
    assert.equal(estimated1RM(weight, reps), null);
});
test("warmups and unfinished sets are excluded from PRs and working volume", () => {
  const result = summarizeExercises([
    slot([
      set(),
      set({ weight: 200, setType: "warmup" }),
      set({ weight: 300, completedAt: null }),
      set({ weight: 20, reps: 15 }),
    ]),
  ]);
  assert.equal(result.highestWeight, 60);
  assert.equal(result.bestEstimated1RM, 76);
  assert.equal(result.volume, 780);
  assert.equal(result.sets, 2);
  assert.equal(eligibleSet(set({ reps: 0 })), false);
});
test("bodyweight tracking cannot produce external-load PRs even with nonzero entered load", () => {
  const e = slot();
  e.trackingType = "reps";
  const stats = summarizeExercises([e]);
  assert.equal(stats.highestWeight, null);
  assert.equal(stats.bestEstimated1RM, null);
  assert.equal(stats.volume, 0);
  assert.equal(stats.sets, 1);
});
test("drop and failure sets count when completed; zero load has no estimated maximum", () => {
  const stats = summarizeExercises([
    slot([
      set({ setType: "drop", weight: 40 }),
      set({ setType: "failure", weight: 50 }),
      set({ weight: 0 }),
    ]),
  ]);
  assert.equal(stats.volume, 720);
  assert.equal(stats.highestWeight, 50);
  assert.equal(stats.sets, 3);
  assert.equal(estimated1RM(0, 8), null);
});
test("history excludes drafts, combines duplicate exercise slots, and sorts chronologically", () => {
  const old = workout({
    startedAt: "2026-10-14T16:00:00Z",
    exercises: [slot([set({ weight: 50 })]), slot([set({ weight: 30 })])],
  });
  const newest = workout();
  const draft = workout({ completedAt: null });
  const history = exerciseHistory([newest, draft, old], exerciseId);
  assert.equal(history.length, 2);
  assert.equal(history[0].sessionId, old.id);
  assert.equal(history[0].volume, 640);
  assert.equal(exerciseHistory([newest, old], exerciseId, newest.id).length, 1);
  assert.deepEqual(personalRecords([newest, draft, old], exerciseId), {
    highestWeight: 60,
    estimated1RM: 76,
    volume: 1120,
    sessions: 2,
  });
});
test("missing PRs and previous performance remain absent rather than zero", () => {
  assert.deepEqual(personalRecords([], exerciseId), {
    highestWeight: null,
    estimated1RM: null,
    volume: 0,
    sessions: 0,
  });
  assert.equal(previousComparison(null, 10), null);
  assert.equal(previousComparison(90, 85), 5);
  assert.equal(previousComparison(70, 80), -10);
});

test("warm-up-only sessions remain in exercise history without creating a PR", () => {
  const session = workout({
    exercises: [slot([set({ setType: "warmup", weight: 100 })])],
  });
  assert.equal(exerciseHistory([session], exerciseId).length, 1);
  assert.deepEqual(personalRecords([session], exerciseId), {
    highestWeight: null,
    estimated1RM: null,
    volume: 0,
    sessions: 1,
  });
});
test("new sessions copy targets with independent IDs and no completed sets", () => {
  const routine: RoutineDocument = {
    id: randomUUID(),
    revision: 2,
    name: "Upper",
    notes: "Slow reps",
    exercises: [slot([set({ weight: null })])],
  };
  const session = workoutFromRoutine(routine, "Europe/Oslo");
  assert.equal(session.routineId, routine.id);
  assert.notEqual(session.exercises[0].id, routine.exercises[0].id);
  assert.notEqual(
    session.exercises[0].sets[0].id,
    routine.exercises[0].sets[0].id,
  );
  assert.equal(session.exercises[0].sets[0].completedAt, null);
  assert.equal(session.exercises[0].sets[0].weight, 0);
  routine.exercises[0].sets[0].reps = 15;
  assert.equal(session.exercises[0].sets[0].reps, 8);
  const copy = duplicateRoutine(routine);
  copy.exercises[0].sets[0].reps = 20;
  assert.equal(routine.exercises[0].sets[0].reps, 15);
  assert.equal(copy.revision, 0);
});
test("reordering preserves stable IDs and guards list bounds", () => {
  const a = slot(),
    b = slot();
  assert.deepEqual(
    moveItem([a, b], 0, 1).map((e) => e.id),
    [b.id, a.id],
  );
  assert.deepEqual(moveItem([a, b], 0, -1), [a, b]);
  assert.notEqual(newSet().id, newSet().id);
});
test("workout validation rejects fractional reps, negative kg, invalid effort and unknown owner fields", () => {
  for (const change of [
    { reps: 1.5 },
    { weight: -1 },
    { rpe: 11 },
    { rpe: 7.3 },
    { rir: 2.5 },
    { reps: 0 },
  ]) {
    const doc = workout();
    Object.assign(doc.exercises[0].sets[0], change);
    assert.equal(workoutSchema.safeParse(doc).success, false);
  }
  assert.equal(
    workoutSchema.safeParse({ ...workout(), owner_id: randomUUID() }).success,
    false,
  );
  assert.equal(workoutSchema.safeParse(workout()).success, true);
});
test("dates, timezone, set completion, ID uniqueness, and empty completions are validated", () => {
  for (const doc of [
    workout({ timezone: "not/a-zone" }),
    workout({ completedAt: "2026-10-14T16:00:00Z" }),
    workout({ exercises: [] }),
    workout({ startedAt: "2999-01-01T00:00:00Z", completedAt: null }),
  ])
    assert.equal(workoutSchema.safeParse(doc).success, false);
  const doc = workout();
  doc.exercises[0].sets.push(doc.exercises[0].sets[0]);
  assert.equal(workoutSchema.safeParse(doc).success, false);
  assert.equal(
    workoutSchema.safeParse(workout({ completedAt: null, exercises: [] }))
      .success,
    true,
  );
});
test("routine targets require exercises and positive integer reps but permit optional weights", () => {
  const { routineId, startedAt, completedAt, timezone, ...routine } = workout();
  void routineId;
  void startedAt;
  void completedAt;
  void timezone;
  routine.exercises[0].sets[0].weight = null;
  assert.equal(routineSchema.safeParse(routine).success, true);
  assert.equal(
    routineSchema.safeParse({ ...routine, exercises: [] }).success,
    false,
  );
  routine.exercises[0].sets[0].reps = 0;
  assert.equal(routineSchema.safeParse(routine).success, false);
});
test("custom exercise validation trims names and limits equipment and tracking types", () => {
  assert.equal(
    exerciseSchema.parse({
      name: "  My press  ",
      muscleGroup: "Chest",
      equipment: "Barbell",
      trackingType: "reps_weight",
    }).name,
    "My press",
  );
  assert.equal(
    exerciseSchema.safeParse({
      name: "",
      muscleGroup: "Chest",
      equipment: "Barbell",
      trackingType: "reps_weight",
    }).success,
    false,
  );
});
