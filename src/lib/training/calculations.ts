import type { ExerciseSlot, TrainingSet, WorkoutDocument } from "./types";
// Completed non-warmup sets only. Epley applies to external-load sets with 1–12 reps.
// A single rep is the actual load; higher-rep estimates are intentionally excluded.
export function estimated1RM(weight: number, reps: number): number | null {
  if (
    !Number.isFinite(weight) ||
    weight <= 0 ||
    !Number.isInteger(reps) ||
    reps < 1 ||
    reps > 12
  )
    return null;
  return reps === 1 ? weight : weight * (1 + reps / 30);
}
export function eligibleSet(set: TrainingSet) {
  return (
    Boolean(set.completedAt) &&
    set.setType !== "warmup" &&
    Number.isInteger(set.reps) &&
    set.reps > 0 &&
    Number.isFinite(set.weight) &&
    (set.weight ?? -1) >= 0
  );
}
export function summarizeExercises(exercises: ExerciseSlot[]) {
  let volume = 0;
  let highestWeight: number | null = null;
  let bestEstimated1RM: number | null = null;
  let sets = 0;
  for (const exercise of exercises)
    for (const set of exercise.sets) {
      if (!eligibleSet(set)) continue;
      sets++;
      if (exercise.trackingType !== "reps_weight") continue;
      const weight = set.weight ?? 0;
      volume += weight * set.reps;
      if (weight > 0) highestWeight = Math.max(highestWeight ?? 0, weight);
      const estimate = estimated1RM(weight, set.reps);
      if (estimate !== null)
        bestEstimated1RM = Math.max(bestEstimated1RM ?? 0, estimate);
    }
  return { volume, highestWeight, bestEstimated1RM, sets };
}
export function exerciseHistory(
  workouts: WorkoutDocument[],
  exerciseId: string,
  excludeSessionId?: string,
) {
  return workouts
    .filter(
      (w) =>
        w.completedAt &&
        w.id !== excludeSessionId &&
        w.exercises.some((e) => e.exerciseId === exerciseId),
    )
    .map((w) => {
      const exercises = w.exercises.filter((e) => e.exerciseId === exerciseId);
      return {
        sessionId: w.id,
        name: w.name,
        date: w.startedAt,
        timezone: w.timezone,
        ...summarizeExercises(exercises),
        exercises,
      };
    })
    .filter((point) =>
      point.exercises.some((exercise) =>
        exercise.sets.some((set) => set.completedAt),
      ),
    )
    .sort(
      (a, b) =>
        Date.parse(a.date) - Date.parse(b.date) ||
        a.sessionId.localeCompare(b.sessionId),
    );
}
export function personalRecords(
  workouts: WorkoutDocument[],
  exerciseId: string,
) {
  const history = exerciseHistory(workouts, exerciseId);
  const max = (values: (number | null)[]) => {
    const valid = values.filter((v): v is number => v !== null);
    return valid.length ? Math.max(...valid) : null;
  };
  return {
    highestWeight: max(history.map((p) => p.highestWeight)),
    estimated1RM: max(history.map((p) => p.bestEstimated1RM)),
    volume: history.reduce((sum, p) => sum + p.volume, 0),
    sessions: history.length,
  };
}
export function previousComparison(
  current: number | null,
  previous: number | null,
) {
  return current === null || previous === null ? null : current - previous;
}
