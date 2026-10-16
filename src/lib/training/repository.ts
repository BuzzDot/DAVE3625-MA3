import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import type { Database } from "@/lib/supabase/database.types";
import type { ExerciseSlot, SetType, TrainingData, TrainingSet } from "./types";
type Row<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export class DataError extends Error {
  constructor(
    public code: string,
    message = "The database request failed.",
  ) {
    super(message);
  }
}
export function checkError(error: { code?: string; message: string } | null) {
  if (error) throw new DataError(error.code ?? "unknown");
}
async function collect<T>(
  page: (
    from: number,
    to: number,
  ) => PromiseLike<{
    data: T[] | null;
    error: { code?: string; message: string } | null;
  }>,
) {
  const rows: T[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await page(from, from + 499);
    checkError(error);
    rows.push(...(data ?? []));
    if (!data || data.length < 500) break;
  }
  return rows;
}
function performedSet(s: Row<"workout_sets">): TrainingSet {
  return {
    id: s.id,
    reps: s.reps ?? 0,
    weight: s.weight_kg,
    rpe: s.rpe,
    rir: s.rir,
    setType: s.set_type as SetType,
    notes: s.notes ?? "",
    completedAt: s.completed_at,
  };
}
export async function loadTrainingData(): Promise<TrainingData> {
  const user = await requireUser();
  const client = await createSupabaseServerClient();
  const [
    catalog,
    favorites,
    routines,
    routineExercises,
    routineSets,
    sessions,
    sessionExercises,
    sets,
  ] = await Promise.all([
    collect((a, b) =>
      client.from("exercises").select("*").order("id").range(a, b),
    ),
    collect((a, b) =>
      client
        .from("exercise_favorites")
        .select("*")
        .eq("owner_id", user.id)
        .order("exercise_id")
        .range(a, b),
    ),
    collect((a, b) =>
      client
        .from("routines")
        .select("*")
        .eq("owner_id", user.id)
        .is("archived_at", null)
        .order("id")
        .range(a, b),
    ),
    collect((a, b) =>
      client
        .from("routine_exercises")
        .select("*")
        .eq("owner_id", user.id)
        .order("id")
        .range(a, b),
    ),
    collect((a, b) =>
      client
        .from("routine_sets")
        .select("*")
        .eq("owner_id", user.id)
        .order("id")
        .range(a, b),
    ),
    collect((a, b) =>
      client
        .from("workout_sessions")
        .select("*")
        .eq("owner_id", user.id)
        .order("id")
        .range(a, b),
    ),
    collect((a, b) =>
      client
        .from("session_exercises")
        .select("*")
        .eq("owner_id", user.id)
        .order("id")
        .range(a, b),
    ),
    collect((a, b) =>
      client
        .from("workout_sets")
        .select("*")
        .eq("owner_id", user.id)
        .order("id")
        .range(a, b),
    ),
  ]);
  const exercises: TrainingData["exercises"] = catalog
    .filter(
      (e) => e.tracking_type === "reps_weight" || e.tracking_type === "reps",
    )
    .map((e) => ({
      id: e.id,
      name: e.name,
      muscleGroup: e.muscle_group,
      equipment: e.equipment ?? "Other",
      trackingType: e.tracking_type as "reps_weight" | "reps",
      custom: e.owner_id !== null,
      favorite: favorites.some((f) => f.exercise_id === e.id),
      archived: e.archived_at !== null,
    }));
  const exerciseMap = new Map(exercises.map((e) => [e.id, e]));
  return {
    userId: user.id,
    exercises,
    routines: routines.map((r) => ({
      id: r.id,
      revision: r.revision,
      name: r.name,
      notes: r.notes ?? "",
      exercises: routineExercises
        .filter((e) => e.routine_id === r.id)
        .sort((a, b) => a.position - b.position)
        .flatMap((e) => {
          const catalogExercise = exerciseMap.get(e.exercise_id);
          if (!catalogExercise) return [];
          return [
            {
              id: e.id,
              exerciseId: e.exercise_id,
              name: catalogExercise.name,
              trackingType: catalogExercise.trackingType,
              notes: e.notes ?? "",
              sets: routineSets
                .filter((s) => s.routine_exercise_id === e.id)
                .sort((a, b) => a.position - b.position)
                .map((s) => ({
                  id: s.id,
                  reps: s.target_reps ?? 8,
                  weight: s.target_weight_kg,
                  rpe: s.target_rpe,
                  rir: s.target_rir,
                  setType: s.set_type as SetType,
                  notes: s.notes ?? "",
                  completedAt: null,
                })),
            },
          ];
        }),
    })),
    workouts: sessions
      .sort(
        (a, b) =>
          Date.parse(b.started_at) - Date.parse(a.started_at) ||
          b.id.localeCompare(a.id),
      )
      .map((w) => ({
        id: w.id,
        revision: w.revision,
        name: w.title_snapshot,
        notes: w.notes ?? "",
        routineId: w.routine_id,
        scheduledActivityId: w.scheduled_activity_id,
        startedAt: w.started_at,
        completedAt: w.completed_at,
        timezone: w.timezone,
        exercises: sessionExercises
          .filter(
            (e) =>
              e.session_id === w.id &&
              (e.tracking_type_snapshot === "reps_weight" ||
                e.tracking_type_snapshot === "reps"),
          )
          .sort((a, b) => a.position - b.position)
          .map((e) => ({
            id: e.id,
            exerciseId: e.exercise_id,
            name: e.name_snapshot,
            trackingType:
              e.tracking_type_snapshot as ExerciseSlot["trackingType"],
            notes: e.notes ?? "",
            sets: sets
              .filter((s) => s.session_exercise_id === e.id)
              .sort((a, b) => a.position - b.position)
              .map(performedSet),
          })),
      })),
  };
}
