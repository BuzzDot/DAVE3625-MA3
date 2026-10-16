"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  checkError,
  DataError,
  loadTrainingData,
} from "@/lib/training/repository";
import {
  exerciseSchema,
  routineSchema,
  validationMessage,
  workoutSchema,
} from "@/lib/training/validation";
import { workoutFromRoutine } from "@/lib/training/documents";
import type { ActionResult, SaveResult } from "@/lib/training/types";
import type { Json } from "@/lib/supabase/database.types";
type Client = Awaited<ReturnType<typeof createSupabaseServerClient>>;
const saveResultSchema = z.object({
  id: z.uuid(),
  revision: z.number().int().positive(),
});
async function mutate<T>(
  operation: (client: Client, userId: string) => Promise<T>,
): Promise<ActionResult<T>> {
  const viewer = await getViewer();
  if (!viewer.user)
    return {
      success: false,
      error:
        viewer.status === "unconfigured"
          ? "Supabase is not configured."
          : "Your session could not be verified. Log in again before saving.",
    };
  try {
    return {
      success: true,
      data: await operation(await createSupabaseServerClient(), viewer.user.id),
    };
  } catch (error) {
    if (error instanceof z.ZodError)
      return { success: false, error: validationMessage(error) };
    if (
      error instanceof DataError &&
      ["PT409", "40001", "23505"].includes(error.code)
    )
      return {
        success: false,
        error:
          "This record changed in another tab or is unavailable. Reload before editing again. Your unsaved workout stays on this device.",
        conflict: true,
      };
    return {
      success: false,
      error:
        "The change could not be saved. Check your connection and database migrations, then retry. No demo fallback was used.",
    };
  }
}
function changed() {
  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath("/workouts");
  revalidatePath("/progress");
}
export async function saveRoutineAction(
  input: unknown,
): Promise<ActionResult<SaveResult>> {
  return mutate(async (client) => {
    const document = routineSchema.parse(input);
    const { data, error } = await client.rpc("save_strength_routine", {
      p_document: document as unknown as Json,
    });
    checkError(error);
    changed();
    return saveResultSchema.parse(data);
  });
}
export async function archiveRoutineAction(
  id: unknown,
  revision: unknown,
): Promise<ActionResult> {
  return mutate(async (client, userId) => {
    const parsed = z
      .object({ id: z.uuid(), revision: z.number().int().positive() })
      .parse({ id, revision });
    const { data, error } = await client
      .from("routines")
      .update({
        archived_at: new Date().toISOString(),
        revision: parsed.revision + 1,
      })
      .eq("id", parsed.id)
      .eq("owner_id", userId)
      .eq("revision", parsed.revision)
      .is("archived_at", null)
      .select("id")
      .maybeSingle();
    checkError(error);
    if (!data) throw new DataError("40001");
    changed();
    return undefined;
  });
}
export async function startWorkoutAction(
  routineId: unknown,
  timezone: unknown,
): Promise<ActionResult<SaveResult>> {
  return mutate(async (client) => {
    const input = z
      .object({
        routineId: z.uuid().nullable(),
        timezone: z.string().min(1).max(100),
      })
      .parse({ routineId, timezone });
    let routine = null;
    if (input.routineId) {
      const data = await loadTrainingData();
      routine = data.routines.find((r) => r.id === input.routineId) ?? null;
      if (!routine) throw new DataError("40001");
    }
    const document = workoutSchema.parse(
      workoutFromRoutine(routine, input.timezone),
    );
    const { data, error } = await client.rpc("save_strength_workout", {
      p_document: document as unknown as Json,
    });
    checkError(error);
    changed();
    return saveResultSchema.parse(data);
  });
}
export async function saveWorkoutAction(
  input: unknown,
): Promise<ActionResult<SaveResult>> {
  return mutate(async (client) => {
    const document = workoutSchema.parse(input);
    const { data, error } = await client.rpc("save_strength_workout", {
      p_document: document as unknown as Json,
    });
    checkError(error);
    // Autosaves return the revision without re-rendering/remounting a dirty editor.
    if (document.completedAt) changed();
    return saveResultSchema.parse(data);
  });
}
export async function deleteWorkoutAction(
  id: unknown,
  revision: unknown,
): Promise<ActionResult> {
  return mutate(async (client) => {
    const parsed = z
      .object({ id: z.uuid(), revision: z.number().int().positive() })
      .parse({ id, revision });
    const { error } = await client.rpc("delete_strength_workout", {
      p_id: parsed.id,
      p_revision: parsed.revision,
    });
    checkError(error);
    changed();
    return undefined;
  });
}
export async function createExerciseAction(
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  return mutate(async (client, userId) => {
    const exercise = exerciseSchema.parse(input);
    const { data, error } = await client
      .from("exercises")
      .insert({
        owner_id: userId,
        name: exercise.name,
        muscle_group: exercise.muscleGroup,
        equipment: exercise.equipment,
        tracking_type: exercise.trackingType,
      })
      .select("id")
      .single();
    checkError(error);
    if (!data) throw new DataError("unknown");
    changed();
    return { id: data.id };
  });
}
export async function favoriteExerciseAction(
  id: unknown,
  favorite: unknown,
): Promise<ActionResult> {
  return mutate(async (client, userId) => {
    const input = z
      .object({ id: z.uuid(), favorite: z.boolean() })
      .parse({ id, favorite });
    const { error } = input.favorite
      ? await client
          .from("exercise_favorites")
          .upsert(
            { owner_id: userId, exercise_id: input.id },
            { onConflict: "owner_id,exercise_id", ignoreDuplicates: true },
          )
      : await client
          .from("exercise_favorites")
          .delete()
          .eq("owner_id", userId)
          .eq("exercise_id", input.id);
    checkError(error);
    revalidatePath("/workouts");
    return undefined;
  });
}
