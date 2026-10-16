export type SetType = "warmup" | "working" | "drop" | "failure";
export type StrengthTracking = "reps_weight" | "reps";
export type TrainingSet = {
  id: string;
  reps: number;
  weight: number | null;
  rpe: number | null;
  rir: number | null;
  setType: SetType;
  notes: string;
  completedAt: string | null;
};
export type ExerciseSlot = {
  id: string;
  exerciseId: string;
  name: string;
  trackingType: StrengthTracking;
  notes: string;
  sets: TrainingSet[];
};
export type RoutineDocument = {
  id: string;
  revision: number;
  name: string;
  notes: string;
  exercises: ExerciseSlot[];
};
export type WorkoutDocument = RoutineDocument & {
  scheduledActivityId?: string | null;
  routineId: string | null;
  startedAt: string;
  completedAt: string | null;
  timezone: string;
};
export type Exercise = {
  id: string;
  name: string;
  muscleGroup: string;
  equipment: string;
  trackingType: StrengthTracking;
  custom: boolean;
  favorite: boolean;
  archived: boolean;
};
export type TrainingData = {
  userId: string;
  exercises: Exercise[];
  routines: RoutineDocument[];
  workouts: WorkoutDocument[];
};
export type SaveResult = { id: string; revision: number };
export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string; conflict?: boolean };
