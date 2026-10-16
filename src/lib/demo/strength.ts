import type { Exercise } from "@/lib/training/types";
// UI fixtures only. These objects are never inserted into production tables.
export const demoStrengthExercises: Exercise[] = [
  {
    id: "f0000000-0000-4000-8000-000000000001",
    name: "Barbell bench press",
    muscleGroup: "Chest",
    equipment: "Barbell",
    trackingType: "reps_weight",
    favorite: false,
    custom: false,
    archived: false,
  },
  {
    id: "f0000000-0000-4000-8000-000000000005",
    name: "Bent-over row",
    muscleGroup: "Back",
    equipment: "Barbell",
    trackingType: "reps_weight",
    favorite: false,
    custom: false,
    archived: false,
  },
];
