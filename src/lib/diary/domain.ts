import { z } from "zod";
import type { Database } from "@/lib/supabase/database.types";
import { goalForDate } from "@/lib/nutrition/calculations";
export type Row<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type DiaryData = {
  metrics: Row<"health_metrics">[];
  observations: Row<"health_observations">[];
  goals: Row<"health_goals">[];
  activities: Row<"scheduled_activities">[];
  rules: Row<"schedule_rules">[];
};
export const metricNames: Record<string, string> = {
  steps: "Steps",
  water: "Water",
  sleep: "Sleep",
  weight: "Body weight",
  resting_heart_rate: "Resting heart rate",
  heart_rate: "Heart rate",
  waist: "Waist",
  chest: "Chest",
  hips: "Hips",
  arm: "Arm",
  thigh: "Thigh",
  calf: "Calf",
  measurement: "Other measurement",
};
export const timezoneSchema = z
  .string()
  .min(1)
  .max(100)
  .refine((v) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: v });
      return true;
    } catch {
      return false;
    }
  }, "Choose a valid IANA timezone");
export const observationSchema = z
  .object({
    id: z.uuid(),
    revision: z.number().int().nonnegative(),
    metric_code: z.string().min(1).max(80),
    value: z.number().finite().nonnegative().max(200000),
    observed_at: z.iso.datetime(),
    local_date: z.iso.date(),
    timezone: timezoneSchema,
    started_at: z.iso.datetime().nullable(),
    ended_at: z.iso.datetime().nullable(),
    quality: z.number().int().min(1).max(5).nullable(),
    notes: z.string().max(5000),
    measurement_label: z.string().trim().min(1).max(80).nullable(),
  })
  .strict();
export const scheduleSchema = z
  .object({
    id: z.uuid(),
    kind: z.enum(["workout", "meal"]),
    templateId: z.uuid(),
    timezone: timezoneSchema,
    start: z.iso.date(),
    end: z.iso.date().nullable(),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    recurring: z.boolean(),
    weekdays: z.array(z.number().int().min(0).max(6)).max(7),
    count: z.number().int().min(1).max(366),
  })
  .strict()
  .superRefine((v, ctx) => {
    if (v.recurring && !v.weekdays.length)
      ctx.addIssue({ code: "custom", message: "Choose at least one weekday" });
    if (v.end && (v.end < v.start || v.end > addDays(v.start, 365)))
      ctx.addIssue({
        code: "custom",
        message: "Choose an end within one year of the start",
      });
  });
export type ScheduleInput = z.infer<typeof scheduleSchema>;
export function addDays(date: string, days: number) {
  return new Date(Date.parse(`${date}T12:00:00Z`) + days * 86400000)
    .toISOString()
    .slice(0, 10);
}
export function scheduleDates(input: ScheduleInput) {
  const v = scheduleSchema.parse(input);
  const end = v.end ?? addDays(v.start, 365);
  const result: string[] = [];
  for (let d = v.start; d <= end; d = addDays(d, 1)) {
    if (
      !v.recurring ||
      v.weekdays.includes(new Date(`${d}T12:00:00Z`).getUTCDay())
    )
      result.push(d);
    if (!v.recurring || result.length >= v.count) break;
  }
  return result;
}
// Resolve a user-entered wall clock without relying on the device timezone.
// Ambiguous clocks select the later instant, matching PostgreSQL standard time.
export function instantInZone(date: string, time: string, timezone: string) {
  z.iso.date().parse(date);
  timezoneSchema.parse(timezone);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))
    throw new Error("Enter a valid time");
  const target = Date.parse(`${date}T${time}:00Z`);
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const label = `${date} ${time}`;
  const candidates: number[] = [];
  for (const shift of [-86400000, 0, 86400000]) {
    const probe = target + shift;
    const wall = formatter.format(new Date(probe));
    const offset = Date.parse(wall.replace(" ", "T") + ":00Z") - probe;
    const candidate = target - offset;
    if (formatter.format(new Date(candidate)) === label)
      candidates.push(candidate);
  }
  if (!candidates.length)
    throw new Error(
      "That local time does not exist in this timezone. Choose another time.",
    );
  return new Date(Math.max(...candidates)).toISOString();
}
export function wallTime(instant: string, timezone: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(instant));
}
export function dailyMetric(
  data: Pick<DiaryData, "metrics" | "observations">,
  code: string,
  date: string,
  label?: string,
) {
  const rows = data.observations
    .filter(
      (o) =>
        o.metric_code === code &&
        o.local_date === date &&
        (!label || o.measurement_label === label),
    )
    .sort(
      (a, b) =>
        Date.parse(a.observed_at) - Date.parse(b.observed_at) ||
        Date.parse(a.created_at ?? a.observed_at) -
          Date.parse(b.created_at ?? b.observed_at) ||
        a.id.localeCompare(b.id),
    );
  if (!rows.length) return null;
  const agg = data.metrics.find((m) => m.code === code)?.aggregation;
  if (agg === "latest") return rows.at(-1)!.value;
  const sum = rows.reduce((s, o) => s + o.value, 0);
  return agg === "average" ? sum / rows.length : sum;
}
export function healthGoal(data: DiaryData, code: string, date: string) {
  return (
    goalForDate(
      data.goals.filter((g) => g.metric_code === code),
      date,
    )?.target ?? null
  );
}
export function trend(
  data: DiaryData,
  code: string,
  date: string,
  days: number,
) {
  return Array.from({ length: days }, (_, i) => {
    const day = addDays(date, i - days + 1);
    return { date: day, value: dailyMetric(data, code, day) };
  });
}
