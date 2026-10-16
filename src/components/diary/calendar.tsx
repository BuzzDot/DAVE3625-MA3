"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { HealthDiary } from "./health";
import { MacroLine } from "@/components/nutrition/fields";
import {
  addDays,
  scheduleDates,
  instantInZone,
  wallTime,
  type DiaryData,
  type ScheduleInput,
  type Row,
} from "@/lib/diary/domain";
import {
  localDate,
  sumMacros,
  entryMacros,
  display,
  goalForDate,
} from "@/lib/nutrition/calculations";
import type { NutritionData } from "@/lib/nutrition/types";
import type {
  RoutineDocument,
  TrainingData,
  ActionResult,
} from "@/lib/training/types";
import {
  createSchedule,
  editSchedule,
  startScheduledWorkout,
  consumeScheduledMeal,
  removeSchedule,
} from "@/app/calendar/actions";
import { useHydrated } from "@/lib/use-hydrated";
const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export function ScheduleForm({
  date,
  timezone,
  training,
  nutrition,
  onSaved,
}: {
  date: string;
  timezone: string;
  training: TrainingData;
  nutrition: NutritionData;
  onSaved: () => void;
}) {
  const hydrated = useHydrated();
  const [kind, setKind] = useState<"workout" | "meal">("workout");
  const [preview, setPreview] = useState<ScheduleInput | null>(null);
  const [message, setMessage] = useState("");
  const [pending, start] = useTransition();
  const templates = kind === "workout" ? training.routines : nutrition.recipes;
  return (
    <Card className="p-5">
      <h2 className="text-lg font-semibold">Schedule an activity</h2>
      <p className="my-3 text-sm text-muted-foreground">
        Plan from a saved routine or recipe. Up to one year / 366 occurrences
        per series. Times use {timezone}; repeated clocks use standard time.
      </p>
      <form
        key={`${date}-${kind}`}
        onChange={() => setPreview(null)}
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          try {
            const v: ScheduleInput = {
              id: crypto.randomUUID(),
              kind,
              templateId: String(f.get("template")),
              timezone,
              start: String(f.get("start")),
              end: f.get("end") ? String(f.get("end")) : null,
              time: String(f.get("time")),
              recurring: f.get("recurring") === "on",
              weekdays: f.getAll("weekday").map(Number),
              count: Number(f.get("count")),
            };
            const dates = scheduleDates(v);
            if (!dates.length)
              throw new Error("No occurrences match these dates and weekdays.");
            dates.forEach((d) => instantInZone(d, v.time, timezone));
            setPreview(v);
            setMessage("");
          } catch (err) {
            setMessage(
              err instanceof Error ? err.message : "Check the schedule.",
            );
          }
        }}
      >
        <fieldset
          disabled={pending || !hydrated}
          className="grid gap-4 sm:grid-cols-3"
        >
          <label>
            Activity type
            <select
              value={kind}
              onChange={(e) => {
                setKind(e.target.value as typeof kind);
                setPreview(null);
              }}
            >
              <option value="workout">Workout</option>
              <option value="meal">Meal</option>
            </select>
          </label>
          <label className="sm:col-span-2">
            Saved template
            <select name="template" required>
              <option value="">Choose a template</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          {!templates.length && (
            <p className="sm:col-span-3 text-sm text-muted-foreground">
              Create a{" "}
              {kind === "workout"
                ? "routine in Workouts"
                : "recipe in Nutrition"}{" "}
              first.
            </p>
          )}
          <label>
            Start date
            <input name="start" type="date" required defaultValue={date} />
          </label>
          <label>
            Local time
            <input name="time" type="time" required defaultValue="12:00" />
          </label>
          <label>
            Maximum occurrences
            <input
              name="count"
              type="number"
              required
              min="1"
              max="366"
              defaultValue="12"
            />
          </label>
          <label className="flex min-h-11 items-center gap-2">
            <input className="w-auto" name="recurring" type="checkbox" />
            Repeat weekly
          </label>
          <label>
            End date (optional)
            <input name="end" type="date" />
          </label>
          <fieldset className="sm:col-span-3">
            <legend className="text-sm">Repeat on weekdays</legend>
            <div className="flex flex-wrap gap-2">
              {weekdays.map((d, i) => (
                <label
                  key={d}
                  className="flex min-h-11 items-center gap-2 rounded-lg border border-border px-3"
                >
                  <input
                    className="w-auto"
                    type="checkbox"
                    name="weekday"
                    value={i}
                  />
                  {d}
                </label>
              ))}
            </div>
          </fieldset>
          <Button type="submit" disabled={!templates.length}>
            Preview schedule
          </Button>
        </fieldset>
      </form>
      {preview && (
        <div className="mt-4 rounded-lg border border-primary p-4">
          <p className="font-medium">
            {scheduleDates(preview).length} planned{" "}
            {kind === "workout" ? "workouts" : "meals"}
          </p>
          <ul className="my-3 max-h-44 overflow-auto text-sm">
            {scheduleDates(preview).map((d) => (
              <li key={d}>
                {d} · {preview.time} · {timezone}
              </li>
            ))}
          </ul>
          <Button
            disabled={pending}
            onClick={() =>
              start(async () => {
                const r = await createSchedule(preview);
                setMessage(r.success ? "Schedule saved." : r.error);
                if (r.success) {
                  setPreview(null);
                  onSaved();
                }
              })
            }
          >
            {pending ? "Saving…" : "Save schedule"}
          </Button>
        </div>
      )}
      <p role="status" className="mt-3 text-sm">
        {message}
      </p>
    </Card>
  );
}
function Activity({
  activity: a,
  date,
  today,
  onSaved,
  workoutId,
}: {
  activity: Row<"scheduled_activities">;
  date: string;
  today: string;
  onSaved: () => void;
  workoutId?: string;
}) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [pending, start] = useTransition();
  const [edit, setEdit] = useState(false);
  const [message, setMessage] = useState("");
  const routine =
    a.kind === "workout"
      ? (a.template_snapshot as unknown as RoutineDocument)
      : null;
  const status =
    a.status === "planned" &&
    localDate(new Date(a.scheduled_at), a.timezone) < today
      ? "Missed (uncompleted plan)"
      : a.status;
  function run<T>(fn: () => Promise<ActionResult<T>>, done?: (v: T) => void) {
    start(async () => {
      const r = await fn();
      setMessage(r.success ? "Saved." : r.error);
      if (r.success) {
        done?.(r.data);
        setEdit(false);
        onSaved();
      }
    });
  }
  return (
    <li className="rounded-xl border border-border p-4">
      <div className="flex flex-wrap justify-between gap-2">
        <h3 className="font-semibold">{a.title}</h3>
        <span
          className={`rounded-full px-3 py-1 text-xs ${a.status === "completed" ? "bg-green-100" : a.status === "cancelled" || a.status === "skipped" ? "bg-slate-100" : "bg-amber-100"}`}
        >
          {status}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {a.kind} · {wallTime(a.scheduled_at, a.timezone)} {a.timezone}
        {a.rule_id ? " · Recurring" : ""}
        {a.is_exception ? " · Edited occurrence" : ""}
      </p>
      {a.notes && <p className="my-2 whitespace-pre-wrap text-sm">{a.notes}</p>}
      {routine && (
        <details className="my-2">
          <summary className="cursor-pointer py-3 text-sm">
            Intended exercises and sets
          </summary>
          <ul className="space-y-2 text-sm">
            {routine.exercises?.map((e) => (
              <li key={e.id}>
                {e.name}:{" "}
                {e.sets
                  .map(
                    (s) =>
                      `${s.reps} reps${s.weight !== null ? ` × ${s.weight} kg` : ""}`,
                  )
                  .join("; ")}
              </li>
            ))}
          </ul>
        </details>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {a.kind === "workout" &&
          (a.status === "planned" || a.status === "completed") && (
            <Button
              disabled={pending || !hydrated}
              onClick={() => {
                if (workoutId) router.push(`/workouts/${workoutId}`);
                else
                  run(
                    () => startScheduledWorkout(a.id),
                    (v) => router.push(`/workouts/${v.id}`),
                  );
              }}
            >
              {a.status === "completed"
                ? "Review workout"
                : workoutId
                  ? "Resume workout"
                  : "Start workout"}
            </Button>
          )}
        {a.kind === "meal" && a.status === "planned" && (
          <form
            className="flex flex-wrap items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              run(() =>
                consumeScheduledMeal({
                  id: a.id,
                  entry: crypto.randomUUID(),
                  quantity: Number(f.get("quantity")),
                  date: String(f.get("date")),
                }),
              );
            }}
          >
            <label className="max-w-32 text-xs">
              Actual servings
              <input
                name="quantity"
                required
                type="number"
                min="0.001"
                max="100000"
                step="0.001"
                defaultValue="1"
                disabled={pending || !hydrated}
              />
            </label>
            <label className="text-xs">
              Consumed date
              <input
                name="date"
                required
                type="date"
                defaultValue={date}
                disabled={pending || !hydrated}
              />
            </label>
            <Button disabled={pending || !hydrated}>Log as consumed</Button>
          </form>
        )}
        {a.status !== "completed" && !workoutId && (
          <Button
            variant="outline"
            disabled={pending || !hydrated}
            onClick={() => setEdit(!edit)}
          >
            Edit activity
          </Button>
        )}
        {a.rule_id && (
          <Button
            variant="ghost"
            disabled={pending || !hydrated}
            onClick={() => {
              if (
                window.confirm(
                  "Cancel all unrecorded occurrences of this recurring schedule, including exceptions? Completed records and started workouts are kept.",
                )
              )
                run(() => removeSchedule(a.rule_id!));
            }}
          >
            Remove recurring schedule
          </Button>
        )}
      </div>
      {edit && (
        <form
          className="mt-4"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            run(() =>
              editSchedule({
                id: a.id,
                revision: a.revision,
                date: String(f.get("date")),
                time: String(f.get("time")),
                status: String(f.get("status")),
                title: String(f.get("title")),
                notes: String(f.get("notes")),
                future: f.get("future") === "on",
              }),
            );
          }}
        >
          <fieldset disabled={pending} className="grid gap-3 sm:grid-cols-2">
            <label>
              Activity title
              <input
                name="title"
                required
                maxLength={200}
                defaultValue={a.title}
              />
            </label>
            <label>
              Activity date
              <input
                type="date"
                name="date"
                required
                defaultValue={localDate(new Date(a.scheduled_at), a.timezone)}
              />
            </label>
            <label>
              Activity time
              <input
                type="time"
                name="time"
                required
                defaultValue={wallTime(a.scheduled_at, a.timezone)}
              />
            </label>
            <label>
              Activity status
              <select name="status" defaultValue={a.status}>
                <option value="planned">Planned</option>
                <option value="skipped">Skipped</option>
                <option value="cancelled">Cancelled / removed</option>
              </select>
            </label>
            <label className="sm:col-span-2">
              Activity notes
              <textarea name="notes" maxLength={5000} defaultValue={a.notes} />
            </label>
            {a.rule_id && (
              <label className="sm:col-span-2 flex min-h-11 items-center gap-2">
                <input className="w-auto" type="checkbox" name="future" />
                Apply to this and future unedited occurrences (keeps recorded
                workouts)
              </label>
            )}
            <Button>Save activity changes</Button>
          </fieldset>
        </form>
      )}
      <p role="status" className="mt-2 text-sm">
        {message}
      </p>
    </li>
  );
}
export function CalendarWorkspace({
  diary,
  training,
  nutrition,
  initialDate,
}: {
  diary: DiaryData;
  training: TrainingData;
  nutrition: NutritionData;
  initialDate: string;
}) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [date, setDate] = useState(initialDate);
  const [view, setView] = useState("month");
  const timezone = nutrition.timezone;
  const start =
    view === "month"
      ? `${date.slice(0, 7)}-01`
      : view === "week"
        ? addDays(date, -((new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7))
        : date;
  const gridStart =
    view === "month"
      ? addDays(start, -((new Date(`${start}T12:00:00Z`).getUTCDay() + 6) % 7))
      : start;
  const dates = Array.from(
    { length: view === "month" ? 42 : view === "week" ? 7 : 1 },
    (_, i) => addDays(gridStart, i),
  );
  const activities = diary.activities.filter(
    (a) => localDate(new Date(a.scheduled_at), a.timezone) === date,
  );
  const entries = nutrition.entries.filter((e) => e.local_date === date);
  const workouts = training.workouts.filter(
    (w) =>
      w.completedAt && localDate(new Date(w.startedAt), w.timezone) === date,
  );
  const goal = goalForDate(nutrition.goals, date);
  function navigate(direction: number) {
    if (view !== "month")
      setDate(addDays(date, direction * (view === "week" ? 7 : 1)));
    else {
      const d = new Date(`${date.slice(0, 7)}-01T12:00:00Z`);
      d.setUTCMonth(d.getUTCMonth() + direction);
      setDate(d.toISOString().slice(0, 10));
    }
  }
  return (
    <div className="space-y-6">
      <Card className="p-3 sm:p-5">
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <Button
            variant="outline"
            disabled={!hydrated}
            onClick={() => navigate(-1)}
            aria-label={`Previous ${view}`}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            disabled={!hydrated}
            onClick={() => navigate(1)}
            aria-label={`Next ${view}`}
          >
            Next
          </Button>
          <Button
            variant="ghost"
            disabled={!hydrated}
            onClick={() => setDate(nutrition.today)}
          >
            Today
          </Button>
          <label>
            Date
            <input
              type="date"
              aria-label="Calendar date"
              value={date}
              disabled={!hydrated}
              onChange={(e) => {
                if (e.target.value) setDate(e.target.value);
              }}
            />
          </label>
          <label>
            View
            <select
              aria-label="Calendar view"
              value={view}
              disabled={!hydrated}
              onChange={(e) => setView(e.target.value)}
            >
              <option value="month">Month</option>
              <option value="week">Week</option>
              <option value="day">Day</option>
            </select>
          </label>
        </div>
        <h2 className="mb-4 text-lg font-semibold">
          {new Date(`${date}T12:00:00Z`).toLocaleDateString("en-GB", {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          })}
        </h2>
        <div
          className={`grid gap-1 ${view === "day" ? "grid-cols-1" : "grid-cols-7"}`}
        >
          {view !== "day" &&
            ["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <span
                key={i}
                className="text-center text-xs text-muted-foreground"
              >
                {d}
              </span>
            ))}
          {dates.map((d) => {
            const planned = diary.activities.filter(
              (a) => localDate(new Date(a.scheduled_at), a.timezone) === d,
            );
            const actual =
              nutrition.entries.some((e) => e.local_date === d) ||
              diary.observations.some((o) => o.local_date === d) ||
              training.workouts.some(
                (w) =>
                  w.completedAt &&
                  localDate(new Date(w.startedAt), w.timezone) === d,
              );
            return (
              <button
                key={d}
                aria-label={`${d}${planned.length ? `, ${planned.length} activities` : ""}${actual ? ", recorded data" : ""}`}
                aria-pressed={d === date}
                disabled={!hydrated}
                onClick={() => setDate(d)}
                className={`min-h-14 min-w-0 rounded-lg border p-1 text-center sm:min-h-20 ${d === date ? "border-primary bg-[#edf1e8]" : "border-border"} ${d.slice(0, 7) !== date.slice(0, 7) ? "text-muted-foreground" : ""}`}
              >
                <span className="text-sm">{Number(d.slice(8))}</span>
                <span className="mt-1 block text-[10px]">
                  {planned.length ? `${planned.length} plans` : ""}
                  {actual ? " ●" : ""}
                </span>
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          ● Recorded meals, workouts or health · Select any date to inspect it.
          Plans never count as completed records.
        </p>
      </Card>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-lg font-semibold">Activities · {date}</h2>
          {!activities.length && (
            <p className="my-4 text-muted-foreground">
              No scheduled activities.
            </p>
          )}
          <ul className="mt-4 space-y-3">
            {activities.map((a) => (
              <Activity
                key={`${a.id}-${a.revision}`}
                activity={a}
                date={date}
                today={nutrition.today}
                workoutId={
                  training.workouts.find((w) => w.scheduledActivityId === a.id)
                    ?.id
                }
                onSaved={() => router.refresh()}
              />
            ))}
          </ul>
        </Card>
        <Card className="p-5">
          <h2 className="text-lg font-semibold">Completed diary · {date}</h2>
          <h3 className="mt-4 font-medium">Consumed nutrition</h3>
          {entries.length ? (
            <MacroLine values={sumMacros(entries.map(entryMacros))} />
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              No consumed meals logged.
            </p>
          )}
          {goal && (
            <p className="my-2 text-xs text-muted-foreground">
              Goals: {goal.kcal} kcal · P {goal.protein_g} g · C {goal.carbs_g}{" "}
              g · F {goal.fat_g} g
            </p>
          )}
          <ul className="my-3 space-y-2 text-sm">
            {entries.map((e) => (
              <li key={e.id}>
                {e.name_snapshot} · {e.quantity} {e.unit_snapshot} ·{" "}
                {display(e.kcal_snapshot, " kcal")}
              </li>
            ))}
          </ul>
          <Link
            className="inline-flex min-h-11 items-center text-sm text-primary underline"
            href={`/nutrition?date=${date}`}
          >
            Open nutrition diary
          </Link>
          <h3 className="mt-4 font-medium">Completed workouts</h3>
          {!workouts.length && (
            <p className="mt-2 text-sm text-muted-foreground">
              No completed workouts.
            </p>
          )}
          <ul className="mt-2">
            {workouts.map((w) => (
              <li key={w.id}>
                <Link
                  className="inline-flex min-h-11 items-center text-primary underline"
                  href={`/workouts/${w.id}`}
                >
                  {w.name}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <ScheduleForm
        date={date}
        timezone={timezone}
        training={training}
        nutrition={nutrition}
        onSaved={() => router.refresh()}
      />
      <HealthDiary key={date} data={diary} date={date} timezone={timezone} />
    </div>
  );
}
