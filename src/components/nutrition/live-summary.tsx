import { getViewer } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkError } from "@/lib/training/repository";
import { localDate } from "@/lib/nutrition/calculations";
import { NutritionRecordSummary } from "./record-summary";
import type { Entry } from "@/lib/nutrition/types";
export async function LiveNutritionSummary({
  calendar = false,
}: {
  calendar?: boolean;
}) {
  const viewer = await getViewer();
  if (!viewer.user) return null;
  let summary: { entries: Entry[]; today: string } | null = null;
  try {
    const client = await createSupabaseServerClient();
    const profile = await client
      .from("profiles")
      .select("timezone")
      .eq("id", viewer.user.id)
      .maybeSingle();
    checkError(profile.error);
    const today = localDate(
      new Date(),
      profile.data?.timezone ?? "Europe/Oslo",
    );
    const entries: Entry[] = [];
    for (let a = 0; ; a += 500) {
      let query = client
        .from("nutrition_entries")
        .select("*")
        .eq("owner_id", viewer.user.id)
        .order("id")
        .range(a, a + 499);
      if (!calendar) query = query.eq("local_date", today);
      const result = await query;
      checkError(result.error);
      entries.push(...(result.data ?? []));
      if (!result.data || result.data.length < 500) break;
    }
    summary = { entries, today };
  } catch {}
  return summary ? (
    <NutritionRecordSummary
      entries={summary.entries}
      today={summary.today}
      calendar={calendar}
    />
  ) : (
    <p
      role="alert"
      className="mb-5 rounded-xl border border-border p-4 text-sm"
    >
      Your live nutrition summary could not load. Open the nutrition diary to
      retry.
    </p>
  );
}
