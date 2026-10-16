import { z } from "zod";
const notes = z.string().max(2000);
const effort = z.number().min(0).max(10).multipleOf(0.5).nullable();
const set = z
  .object({
    id: z.uuid(),
    reps: z.number().int().min(0).max(1000),
    weight: z.number().min(0).max(2000).nullable(),
    rpe: effort,
    rir: z.number().int().min(0).max(10).nullable(),
    setType: z.enum(["warmup", "working", "drop", "failure"]),
    notes,
    completedAt: z.iso.datetime({ offset: true }).nullable(),
  })
  .strict();
const slot = z
  .object({
    id: z.uuid(),
    exerciseId: z.uuid(),
    name: z.string().min(1).max(200),
    trackingType: z.enum(["reps_weight", "reps"]),
    notes,
    sets: z.array(set).min(1).max(30),
  })
  .strict();
const shape = {
  id: z.uuid(),
  revision: z.number().int().min(0),
  name: z.string().trim().min(1).max(200),
  notes: z.string().max(5000),
  exercises: z.array(slot).max(40),
};
function uniqueIds(exercises: z.infer<typeof slot>[]) {
  const ids = exercises.flatMap((e) => [e.id, ...e.sets.map((s) => s.id)]);
  return new Set(ids).size === ids.length;
}
export const routineSchema = z
  .object(shape)
  .strict()
  .superRefine((doc, ctx) => {
    if (!doc.exercises.length)
      ctx.addIssue({ code: "custom", message: "Add at least one exercise." });
    if (!uniqueIds(doc.exercises))
      ctx.addIssue({
        code: "custom",
        message: "Exercise and set IDs must be unique.",
      });
    for (const e of doc.exercises)
      for (const s of e.sets)
        if (s.reps < 1)
          ctx.addIssue({
            code: "custom",
            message: "Template sets need at least one repetition.",
          });
  });
export const workoutSchema = z
  .object({
    ...shape,
    routineId: z.uuid().nullable(),
    scheduledActivityId: z.uuid().nullable().optional(),
    startedAt: z.iso.datetime({ offset: true }),
    completedAt: z.iso.datetime({ offset: true }).nullable(),
    timezone: z.string().min(1).max(100),
  })
  .strict()
  .superRefine((doc, ctx) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: doc.timezone });
    } catch {
      ctx.addIssue({
        code: "custom",
        message: "Choose a valid IANA timezone.",
      });
    }
    const start = Date.parse(doc.startedAt);
    const end = doc.completedAt ? Date.parse(doc.completedAt) : null;
    if (
      start > Date.now() + 300000 ||
      (end !== null && (end < start || end > Date.now() + 300000))
    )
      ctx.addIssue({
        code: "custom",
        message: "Workout dates must be in the past, with finish after start.",
      });
    if (!uniqueIds(doc.exercises))
      ctx.addIssue({
        code: "custom",
        message: "Exercise and set IDs must be unique.",
      });
    let completed = 0;
    for (const ex of doc.exercises)
      for (const s of ex.sets) {
        if (s.weight === null)
          ctx.addIssue({
            code: "custom",
            message: "Enter a weight in kg; use 0 for bodyweight.",
          });
        if (s.completedAt) {
          completed++;
          if (s.reps < 1)
            ctx.addIssue({
              code: "custom",
              message: "Completed sets need at least one repetition.",
            });
          const date = Date.parse(s.completedAt);
          if (date < start || date > (end ?? Date.now()) + 300000)
            ctx.addIssue({
              code: "custom",
              message: "Completed set timestamps must fall within the workout.",
            });
        }
      }
    if (end !== null && !completed)
      ctx.addIssue({
        code: "custom",
        message: "Complete at least one set before finishing.",
      });
  });
export const exerciseSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    muscleGroup: z.enum([
      "Chest",
      "Back",
      "Legs",
      "Shoulders",
      "Arms",
      "Core",
      "Full body",
    ]),
    equipment: z.enum([
      "Barbell",
      "Dumbbell",
      "Cable",
      "Machine",
      "Bodyweight",
      "Other",
    ]),
    trackingType: z.enum(["reps_weight", "reps"]),
  })
  .strict();
export function validationMessage(error: z.ZodError) {
  const issue = error.issues[0];
  const labels: Record<string, string> = {
    name: "Name",
    notes: "Notes",
    reps: "Repetitions",
    weight: "Weight (kg)",
    rpe: "RPE",
    rir: "RIR",
    setType: "Set type",
    startedAt: "Start time",
    completedAt: "Finish time",
    timezone: "Timezone",
    equipment: "Equipment",
    muscleGroup: "Muscle group",
    trackingType: "Tracking type",
    id: "Record reference",
    revision: "Record version",
  };
  const parts: string[] = [];
  for (let i = 0; i < issue.path.length; i++) {
    const key = String(issue.path[i]);
    if (key === "exercises" && typeof issue.path[i + 1] === "number")
      parts.push(`Exercise ${Number(issue.path[++i]) + 1}`);
    else if (key === "sets" && typeof issue.path[i + 1] === "number")
      parts.push(`set ${Number(issue.path[++i]) + 1}`);
    else if (labels[key]) parts.push(labels[key]);
  }
  return `${parts.length ? `${parts.join(" · ")}: ` : ""}${issue.message}`;
}
