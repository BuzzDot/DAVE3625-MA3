import Link from "next/link";
import { loadDiaryData } from "@/lib/diary/repository";
import { loadTrainingData } from "@/lib/training/repository";
import { loadNutritionData } from "@/lib/nutrition/repository";
import { CalendarWorkspace } from "./calendar";
import { HealthDiary, HealthSummary } from "./health";
import { Card } from "@/components/ui/card";
import { PageHeading } from "@/components/page-heading";
import { DailyNutritionTotals } from "@/components/nutrition/daily-totals";
import {
  entryMacros,
  sumMacros,
  goalForDate,
  localDate,
} from "@/lib/nutrition/calculations";
import { addDays, dailyMetric, wallTime } from "@/lib/diary/domain";
export async function CalendarContent({
  date,
  initialKind,
  initialTemplateId,
}: {
  date?: string;
  initialKind?: "workout" | "meal";
  initialTemplateId?: string;
}) {
  const [diary, training, nutrition] = await Promise.all([
    loadDiaryData(),
    loadTrainingData(),
    loadNutritionData({ catalog: false }),
  ]);
  return (
    <>
      <PageHeading
        eyebrow="YOUR PRIVATE DIARY"
        title="Calendar"
        description="Your plans, completed activities and health, together."
      />
      <CalendarWorkspace
        diary={diary}
        training={training}
        nutrition={nutrition}
        initialDate={date ?? nutrition.today}
        initialKind={initialKind}
        initialTemplateId={initialTemplateId}
      />
    </>
  );
}
export async function HealthContent({ date }: { date?: string }) {
  const [diary, nutrition] = await Promise.all([
    loadDiaryData(),
    loadNutritionData({ catalog: false }),
  ]);
  return (
    <>
      <PageHeading
        eyebrow="YOUR PRIVATE DIARY"
        title="Health diary"
        description="Manual measurements, dated goals and recorded history."
      >
        <Link
          className="inline-flex min-h-11 items-center text-primary underline"
          href="/calendar"
        >
          Choose a date in Calendar
        </Link>
      </PageHeading>
      <HealthDiary
        data={diary}
        date={date ?? nutrition.today}
        timezone={nutrition.timezone}
      />
    </>
  );
}
export async function DashboardContent() {
  const [diary, training, nutrition] = await Promise.all([
    loadDiaryData(),
    loadTrainingData(),
    loadNutritionData({ catalog: false }),
  ]);
  const date = nutrition.today;
  const entries = nutrition.entries.filter((e) => e.local_date === date);
  const goals = goalForDate(nutrition.goals, date);
  const totals = sumMacros(entries.map(entryMacros));
  const upcoming = diary.activities
    .filter(
      (a) =>
        a.status === "planned" &&
        localDate(new Date(a.scheduled_at), a.timezone) >= date,
    )
    .slice(0, 6);
  const recent = training.workouts.find((w) => w.completedAt);
  const next = upcoming.find((a) => a.kind === "workout");
  return (
    <div className="space-y-6">
      <PageHeading
        eyebrow="YOUR PRIVATE DIARY"
        title="Your day, in Form."
        description={`${date} · ${nutrition.timezone} · Only your recorded data.`}
      >
        <Link
          href="/calendar"
          className="inline-flex min-h-11 items-center text-primary underline"
        >
          Open calendar
        </Link>
      </PageHeading>
      <HealthSummary data={diary} date={date} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <p className="eyebrow">YOUR LIVE NUTRITION</p>
          <h2 className="mt-2 text-lg font-semibold">Today, on your plate.</h2>
          {entries.length ? (
            <DailyNutritionTotals
              className="mt-5"
              totals={totals}
              goal={goals}
            />
          ) : (
            <p className="my-4 text-muted-foreground">
              No consumed meals logged today.
            </p>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            {entries.length} consumed entries · {date}. Planned meals are
            excluded.
          </p>
          {goals && !entries.length && (
            <p className="mt-3 text-sm">
              Targets: {goals.kcal} kcal · Protein {goals.protein_g} g · Carbs{" "}
              {goals.carbs_g} g · Fat {goals.fat_g} g
            </p>
          )}
          <Link
            className="mt-3 inline-flex min-h-11 items-center text-primary underline"
            href={`/nutrition?date=${date}`}
          >
            Open nutrition diary
          </Link>
          <Link
            className="ml-4 inline-flex min-h-11 items-center text-primary underline"
            href={`/nutrition?date=${date}&view=meals`}
          >
            Choose a saved meal
          </Link>
        </Card>
        <Card>
          <h2 className="text-lg font-semibold">Your next workout</h2>
          {next ? (
            <Link
              className="mt-3 inline-flex min-h-11 items-center text-primary underline"
              href={`/calendar?date=${localDate(new Date(next.scheduled_at), next.timezone)}`}
            >
              {next.title} ·{" "}
              {localDate(new Date(next.scheduled_at), next.timezone)}
            </Link>
          ) : (
            <p className="my-4 text-muted-foreground">
              No upcoming workout scheduled.
            </p>
          )}
          {recent && (
            <p className="mt-3 text-sm">
              Most recent:{" "}
              <Link
                className="inline-flex min-h-11 items-center text-primary underline"
                href={`/workouts/${recent.id}`}
              >
                {recent.name}
              </Link>
            </p>
          )}
          <Link
            className="mt-3 flex min-h-11 items-center text-primary underline"
            href="/workouts"
          >
            Open workouts
          </Link>
        </Card>
      </div>
      <Card>
        <h2 className="text-lg font-semibold">Upcoming activities</h2>
        {!upcoming.length && (
          <p className="mt-4 text-muted-foreground">
            Your calendar is clear. Schedule a saved routine or recipe to plan
            your week.
          </p>
        )}
        <ul className="mt-3 divide-y divide-border">
          {upcoming.map((a) => (
            <li key={a.id}>
              <Link
                className="flex min-h-11 flex-wrap items-center justify-between gap-2 py-2 text-primary"
                href={`/calendar?date=${localDate(new Date(a.scheduled_at), a.timezone)}`}
              >
                <span>
                  {a.title} · {a.kind}
                </span>
                <span className="text-xs">
                  {localDate(new Date(a.scheduled_at), a.timezone)} ·{" "}
                  {wallTime(a.scheduled_at, a.timezone)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <h2 className="text-lg font-semibold">The last seven days</h2>
        <p className="my-3 text-sm text-muted-foreground">
          Missing measurements remain unlogged. Open Health for 7, 30 and 90 day
          charts.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                {["Date", "Steps", "Water (ml)", "Sleep (min)"].map((t) => (
                  <th className="p-2" key={t}>
                    {t}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 7 }, (_, i) => addDays(date, i - 6)).map(
                (d) => (
                  <tr key={d}>
                    <td className="whitespace-nowrap p-2">
                      <Link
                        className="inline-flex min-h-11 items-center text-primary underline"
                        href={`/calendar?date=${d}`}
                      >
                        {d}
                      </Link>
                    </td>
                    {["steps", "water", "sleep"].map((c) => (
                      <td className="p-2" key={c}>
                        {dailyMetric(diary, c, d) ?? "Not logged"}
                      </td>
                    ))}
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
        <Link
          className="inline-flex min-h-11 items-center text-primary underline"
          href="/health"
        >
          Log health and view trends
        </Link>
      </Card>
    </div>
  );
}
