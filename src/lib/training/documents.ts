import type {
  Exercise,
  ExerciseSlot,
  RoutineDocument,
  TrainingSet,
  WorkoutDocument,
} from "./types";
export function newSet(overrides: Partial<TrainingSet> = {}): TrainingSet {
  return {
    id: crypto.randomUUID(),
    reps: 8,
    weight: 0,
    rpe: null,
    rir: null,
    setType: "working",
    notes: "",
    completedAt: null,
    ...overrides,
  };
}
export function newSlot(exercise: Exercise): ExerciseSlot {
  return {
    id: crypto.randomUUID(),
    exerciseId: exercise.id,
    name: exercise.name,
    trackingType: exercise.trackingType,
    notes: "",
    sets: [newSet(), newSet(), newSet()],
  };
}
export function emptyRoutine(): RoutineDocument {
  return {
    id: crypto.randomUUID(),
    revision: 0,
    name: "New routine",
    notes: "",
    exercises: [],
  };
}
export function workoutFromRoutine(
  routine: RoutineDocument | null,
  timezone: string,
): WorkoutDocument {
  return {
    id: crypto.randomUUID(),
    revision: 0,
    name: routine?.name ?? "Strength workout",
    notes: routine?.notes ?? "",
    routineId: routine?.id ?? null,
    startedAt: new Date().toISOString(),
    completedAt: null,
    timezone,
    exercises:
      routine?.exercises.map((e) => ({
        ...e,
        id: crypto.randomUUID(),
        sets: e.sets.map((s) => ({
          ...s,
          id: crypto.randomUUID(),
          weight: s.weight ?? 0,
          completedAt: null,
        })),
      })) ?? [],
  };
}
export function duplicateRoutine(routine: RoutineDocument): RoutineDocument {
  return {
    ...routine,
    id: crypto.randomUUID(),
    revision: 0,
    name: `${routine.name.slice(0, 193)} (copy)`,
    exercises: routine.exercises.map((e) => ({
      ...e,
      id: crypto.randomUUID(),
      sets: e.sets.map((s) => ({ ...s, id: crypto.randomUUID() })),
    })),
  };
}
export function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const next = index + direction;
  if (next < 0 || next >= items.length) return items;
  const result = [...items];
  [result[index], result[next]] = [result[next], result[index]];
  return result;
}
