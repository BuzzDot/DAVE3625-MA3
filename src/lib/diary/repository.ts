import "server-only";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkError } from "@/lib/training/repository";
import type { DiaryData } from "./domain";
async function collect<T>(
  query: (
    a: number,
    b: number,
  ) => PromiseLike<{
    data: T[] | null;
    error: { message: string; code?: string } | null;
  }>,
) {
  const rows: T[] = [];
  for (let a = 0; ; a += 500) {
    const r = await query(a, a + 499);
    checkError(r.error);
    rows.push(...(r.data ?? []));
    if (!r.data || r.data.length < 500) return rows;
  }
}
export async function loadDiaryData(): Promise<DiaryData> {
  const user = await requireUser();
  const client = await createSupabaseServerClient();
  const [metrics, observations, goals, activities, rules] = await Promise.all([
    collect((a, b) =>
      client.from("health_metrics").select("*").order("code").range(a, b),
    ),
    collect((a, b) =>
      client
        .from("health_observations")
        .select("*")
        .eq("owner_id", user.id)
        .order("id")
        .range(a, b),
    ),
    collect((a, b) =>
      client
        .from("health_goals")
        .select("*")
        .eq("owner_id", user.id)
        .order("starts_on", { ascending: false })
        .order("id")
        .range(a, b),
    ),
    collect((a, b) =>
      client
        .from("scheduled_activities")
        .select("*")
        .eq("owner_id", user.id)
        .order("scheduled_at")
        .order("id")
        .range(a, b),
    ),
    collect((a, b) =>
      client
        .from("schedule_rules")
        .select("*")
        .eq("owner_id", user.id)
        .order("id")
        .range(a, b),
    ),
  ]);
  return { metrics, observations, goals, activities, rules };
}
