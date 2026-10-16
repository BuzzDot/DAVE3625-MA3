"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkError, DataError } from "@/lib/training/repository";
import {
  observationSchema,
  scheduleSchema,
  scheduleDates,
  instantInZone,
} from "@/lib/diary/domain";
import type { ActionResult } from "@/lib/training/types";
type Client = Awaited<ReturnType<typeof createSupabaseServerClient>>;
async function change<T>(
  fn: (client: Client, uid: string) => Promise<T>,
): Promise<ActionResult<T>> {
  const viewer = await getViewer();
  if (!viewer.user)
    return { success: false, error: "Log in again before saving your diary." };
  try {
    const data = await fn(await createSupabaseServerClient(), viewer.user.id);
    for (const path of [
      "/",
      "/calendar",
      "/health",
      "/workouts",
      "/nutrition",
      "/progress",
    ])
      revalidatePath(path);
    return { success: true, data };
  } catch (e) {
    return {
      success: false,
      error:
        e instanceof z.ZodError
          ? (e.issues[0]?.message ?? "Check the entered values.")
          : e instanceof DataError && ["PT409", "23505"].includes(e.code)
            ? "This record changed or was already saved. Reload before trying again."
            : "Could not save. Check the values, connection and migrations, then retry.",
    };
  }
}
export async function saveObservation(input: unknown) {
  return change(async (client, uid) => {
    const { revision, ...v } = observationSchema.parse(input);
    if (revision === 0)
      checkError(
        (
          await client
            .from("health_observations")
            .insert({ ...v, owner_id: uid })
        ).error,
      );
    else {
      const r = await client
        .from("health_observations")
        .update(v)
        .eq("id", v.id)
        .eq("owner_id", uid)
        .eq("revision", revision)
        .select("id")
        .maybeSingle();
      checkError(r.error);
      if (!r.data) throw new DataError("PT409");
    }
  });
}
export async function deleteObservation(id: string, revision: number) {
  return change(async (client, uid) => {
    z.uuid().parse(id);
    z.number().int().positive().parse(revision);
    const r = await client
      .from("health_observations")
      .delete()
      .eq("id", id)
      .eq("owner_id", uid)
      .eq("revision", revision)
      .select("id")
      .maybeSingle();
    checkError(r.error);
    if (!r.data) throw new DataError("PT409");
  });
}
export async function setHealthGoal(input: unknown) {
  return change(async (client) => {
    const v = z
      .object({
        metric: z.enum(["steps", "water", "sleep", "weight"]),
        date: z.iso.date(),
        target: z.number().positive().max(200000),
      })
      .strict()
      .parse(input);
    checkError(
      (
        await client.rpc("set_health_goal", {
          p_metric: v.metric,
          p_date: v.date,
          p_target: v.target,
        })
      ).error,
    );
  });
}
export async function createSchedule(input: unknown) {
  return change(async (client) => {
    const v = scheduleSchema.parse(input);
    const dates = scheduleDates(v);
    if (!dates.length) throw new Error("No dates");
    for (const d of dates) instantInZone(d, v.time, v.timezone);
    const r = await client.rpc("create_schedule", { p_document: v });
    checkError(r.error);
    return r.data;
  });
}
export async function editSchedule(input: unknown) {
  return change(async (client) => {
    const v = z
      .object({
        id: z.uuid(),
        revision: z.number().int().positive(),
        date: z.iso.date(),
        time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
        status: z.enum(["planned", "cancelled", "skipped"]),
        title: z.string().trim().min(1).max(200),
        notes: z.string().max(5000),
        future: z.boolean(),
      })
      .strict()
      .parse(input);
    checkError(
      (
        await client.rpc("edit_schedule", {
          p_id: v.id,
          p_revision: v.revision,
          p_date: v.date,
          p_time: v.time,
          p_status: v.status,
          p_title: v.title,
          p_notes: v.notes,
          p_future: v.future,
        })
      ).error,
    );
  });
}
export async function startScheduledWorkout(id: string) {
  return change(async (client) => {
    z.uuid().parse(id);
    const r = await client.rpc("start_scheduled_workout_at", {
      p_id: id,
      p_started_at: new Date().toISOString(),
    });
    checkError(r.error);
    return z.object({ id: z.uuid() }).parse(r.data);
  });
}
export async function removeSchedule(rule: string) {
  return change(async (client) => {
    z.uuid().parse(rule);
    checkError((await client.rpc("retire_schedule", { p_rule: rule })).error);
  });
}
export async function consumeScheduledMeal(input: unknown) {
  return change(async (client) => {
    const v = z
      .object({
        id: z.uuid(),
        entry: z.uuid(),
        quantity: z.number().min(0.001).max(100000),
        date: z.iso.date(),
      })
      .strict()
      .parse(input);
    const r = await client.rpc("consume_scheduled_meal", {
      p_id: v.id,
      p_entry: v.entry,
      p_quantity: v.quantity,
      p_date: v.date,
    });
    checkError(r.error);
    return r.data;
  });
}
