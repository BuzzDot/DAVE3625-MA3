"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  dailyMetric,
  healthGoal,
  instantInZone,
  metricNames,
  trend,
  wallTime,
  type DiaryData,
  type Row,
} from "@/lib/diary/domain";
import { display, localDate } from "@/lib/nutrition/calculations";
import {
  saveObservation,
  deleteObservation,
  setHealthGoal,
} from "@/app/calendar/actions";
import { useHydrated } from "@/lib/use-hydrated";
export function HealthSummary({
  data,
  date,
}: {
  data: DiaryData;
  date: string;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {["steps", "water", "sleep", "weight", "resting_heart_rate"].map(
        (code) => {
          const metric = data.metrics.find((m) => m.code === code);
          const actual = dailyMetric(data, code, date);
          const target = healthGoal(data, code, date);
          return (
            <Card key={code} className="p-5">
              <p className="text-sm text-muted-foreground">
                {metricNames[code]}
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {actual === null
                  ? "Not logged"
                  : display(actual, ` ${metric?.unit ?? ""}`)}
              </p>
              {target !== null && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {code === "weight" ? "Target" : "Daily goal"}:{" "}
                  {display(target, ` ${metric?.unit ?? ""}`)}
                  {actual !== null && code !== "weight"
                    ? ` · ${Math.round((actual / target) * 100)}%`
                    : ""}
                </p>
              )}
            </Card>
          );
        },
      )}
    </div>
  );
}
export function HealthDiary({
  data,
  date,
  timezone,
}: {
  data: DiaryData;
  date: string;
  timezone: string;
}) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState("");
  const [newId, setNewId] = useState(() => crypto.randomUUID());
  const [editing, setEditing] = useState<Row<"health_observations"> | null>(
    null,
  );
  const [metric, setMetric] = useState("water");
  const [chart, setChart] = useState("steps");
  const [range, setRange] = useState(7);
  function run(fn: () => ReturnType<typeof saveObservation>) {
    start(async () => {
      const result = await fn();
      setMessage(result.success ? "Saved to your diary." : result.error);
      if (result.success) {
        setNewId(crypto.randomUUID());
        setEditing(null);
        router.refresh();
      }
    });
  }
  const rows = data.observations
    .filter((o) => o.local_date === date)
    .sort((a, b) => b.observed_at.localeCompare(a.observed_at));
  const m = data.metrics.find((m) => m.code === metric);
  return (
    <div className="space-y-6">
      <HealthSummary data={data} date={date} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="p-5">
          <h2 className="text-lg font-semibold">
            {editing ? "Edit measurement" : "Log health"}
          </h2>
          <p className="my-3 text-sm text-muted-foreground">
            Steps are a daily total (latest entry wins). Water and sleep add
            individual entries. Sleep belongs to the date you wake up. Times use{" "}
            {timezone}.
          </p>
          <form
            key={editing?.id ?? `new-${date}`}
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              try {
                const code = String(f.get("metric"));
                const observed = instantInZone(
                  date,
                  String(f.get("time")),
                  timezone,
                );
                const hasInterval = code === "sleep" && !!f.get("sleepStart");
                if (
                  (!hasInterval && !f.get("value")) ||
                  (code === "sleep" &&
                    Boolean(f.get("sleepStart")) !== Boolean(f.get("sleepEnd")))
                )
                  throw new Error(
                    "Enter a value or both sleep start and end times.",
                  );
                const started = hasInterval
                  ? String(f.get("sleepStart"))
                  : null;
                const ended = hasInterval ? String(f.get("sleepEnd")) : null;
                const parseWall = (v: string) =>
                  instantInZone(v.slice(0, 10), v.slice(11, 16), timezone);
                const startAt = started ? parseWall(started) : null;
                const endAt = ended ? parseWall(ended) : null;
                run(() =>
                  saveObservation({
                    id: editing?.id ?? newId,
                    revision: editing?.revision ?? 0,
                    metric_code: code,
                    value:
                      hasInterval && startAt && endAt
                        ? (Date.parse(endAt) - Date.parse(startAt)) / 60000
                        : Number(f.get("value")),
                    observed_at: endAt ?? observed,
                    local_date: date,
                    timezone,
                    started_at: startAt,
                    ended_at: endAt,
                    quality:
                      code === "sleep" && f.get("quality")
                        ? Number(f.get("quality"))
                        : null,
                    measurement_label:
                      code === "measurement" ? String(f.get("label")) : null,
                    notes: String(f.get("notes")),
                  }),
                );
              } catch (err) {
                setMessage(
                  err instanceof Error ? err.message : "Check the values.",
                );
              }
            }}
          >
            <fieldset
              disabled={pending || !hydrated}
              className="grid gap-4 sm:grid-cols-2"
            >
              <label>
                Metric
                <select
                  name="metric"
                  value={metric}
                  onChange={(e) => setMetric(e.target.value)}
                >
                  {data.metrics.map((m) => (
                    <option key={m.code} value={m.code}>
                      {metricNames[m.code] ?? m.code} ({m.unit})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Value ({m?.unit})
                <input
                  name="value"
                  type="number"
                  required={metric !== "sleep"}
                  min={m?.minimum ?? 0}
                  max={m?.maximum}
                  step={metric === "steps" ? "1" : "0.001"}
                  defaultValue={editing?.value ?? ""}
                />
              </label>
              <label>
                Time
                <input
                  name="time"
                  type="time"
                  required
                  defaultValue={
                    editing ? wallTime(editing.observed_at, timezone) : "12:00"
                  }
                />
              </label>
              {metric === "measurement" && (
                <label>
                  Measurement name
                  <input
                    name="label"
                    required
                    maxLength={80}
                    defaultValue={editing?.measurement_label ?? ""}
                  />
                </label>
              )}
              {metric === "sleep" && (
                <>
                  <label>
                    Sleep start (optional)
                    <input
                      name="sleepStart"
                      type="datetime-local"
                      defaultValue={
                        editing?.started_at
                          ? `${localDate(new Date(editing.started_at), timezone)}T${wallTime(editing.started_at, timezone)}`
                          : ""
                      }
                    />
                  </label>
                  <label>
                    Sleep end (with start)
                    <input
                      name="sleepEnd"
                      type="datetime-local"
                      defaultValue={
                        editing?.ended_at
                          ? `${localDate(new Date(editing.ended_at), timezone)}T${wallTime(editing.ended_at, timezone)}`
                          : ""
                      }
                    />
                  </label>
                  <label>
                    Quality (optional)
                    <select
                      name="quality"
                      defaultValue={editing?.quality ?? ""}
                    >
                      <option value="">Not rated</option>
                      {[1, 2, 3, 4, 5].map((v) => (
                        <option key={v} value={v}>
                          {v} / 5
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className="text-xs text-muted-foreground">
                    If both sleep times are provided, their elapsed duration
                    replaces Value. Enter Value in minutes for duration-only
                    logs.
                  </p>
                </>
              )}
              <label className="sm:col-span-2">
                Notes
                <textarea
                  name="notes"
                  maxLength={5000}
                  defaultValue={editing?.notes ?? ""}
                />
              </label>
              <Button type="submit">
                {pending ? "Saving…" : "Save measurement"}
              </Button>
              {editing && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditing(null);
                    setMetric("water");
                  }}
                >
                  Cancel edit
                </Button>
              )}
            </fieldset>
          </form>
          <p role="status" className="mt-3 text-sm">
            {message}
          </p>
        </Card>
        <Card className="p-5">
          <h2 className="text-lg font-semibold">Measurements · {date}</h2>
          {!rows.length && (
            <p className="mt-4 text-muted-foreground">
              No measurements logged for this date.
            </p>
          )}
          <ul className="divide-y divide-border">
            {rows.map((o) => (
              <li key={o.id} className="py-4">
                <p className="font-medium">
                  {metricNames[o.metric_code]}
                  {o.measurement_label ? ` · ${o.measurement_label}` : ""}:{" "}
                  {display(
                    o.value,
                    ` ${data.metrics.find((m) => m.code === o.metric_code)?.unit ?? ""}`,
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {wallTime(o.observed_at, o.timezone)} · {o.source}
                  {o.quality ? ` · Quality ${o.quality}/5` : ""}
                </p>
                {o.started_at && o.ended_at && (
                  <p className="text-xs">
                    {localDate(new Date(o.started_at), o.timezone)}{" "}
                    {wallTime(o.started_at, o.timezone)} →{" "}
                    {wallTime(o.ended_at, o.timezone)}
                  </p>
                )}
                {o.notes && (
                  <p className="my-2 whitespace-pre-wrap text-sm">{o.notes}</p>
                )}
                <div className="mt-2 flex gap-2">
                  <Button
                    variant="outline"
                    disabled={pending}
                    onClick={() => {
                      setEditing(o);
                      setMetric(o.metric_code);
                    }}
                  >
                    Edit measurement
                  </Button>
                  <Button
                    variant="ghost"
                    disabled={pending}
                    onClick={() => {
                      if (window.confirm("Delete this measurement?"))
                        run(() => deleteObservation(o.id, o.revision));
                    }}
                  >
                    Delete measurement
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <Card className="p-5">
        <h2 className="text-lg font-semibold">Health goals</h2>
        <p className="my-3 text-sm text-muted-foreground">
          A goal takes effect on its selected date. Earlier targets remain in
          history. Weight is a target value, without a score.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            run(() =>
              setHealthGoal({
                metric: String(f.get("metric")),
                date: String(f.get("date")),
                target: Number(f.get("target")),
              }),
            );
          }}
        >
          <fieldset
            disabled={pending || !hydrated}
            className="grid items-end gap-4 sm:grid-cols-4"
          >
            <label>
              Goal metric
              <select name="metric">
                {["steps", "water", "sleep", "weight"].map((code) => (
                  <option key={code} value={code}>
                    {metricNames[code]} (
                    {data.metrics.find((m) => m.code === code)?.unit})
                  </option>
                ))}
              </select>
            </label>
            <label>
              Effective date
              <input name="date" type="date" required defaultValue={date} />
            </label>
            <label>
              Target
              <input
                name="target"
                type="number"
                required
                min="0.001"
                step="0.001"
                max="200000"
              />
            </label>
            <Button>Save health goal</Button>
          </fieldset>
        </form>
        <ul className="mt-4 text-sm">
          {data.goals.map((g) => (
            <li key={g.id}>
              {metricNames[g.metric_code]}: {g.target}{" "}
              {data.metrics.find((m) => m.code === g.metric_code)?.unit} ·{" "}
              {g.starts_on}–{g.ends_on ?? "ongoing"}
            </li>
          ))}
        </ul>
      </Card>
      <Card className="p-5">
        <h2 className="text-lg font-semibold">Health history</h2>
        <div className="my-4 flex flex-wrap gap-4">
          <label>
            History metric
            <select value={chart} onChange={(e) => setChart(e.target.value)}>
              {data.metrics
                .filter((m) => m.code !== "measurement")
                .map((m) => (
                  <option key={m.code} value={m.code}>
                    {metricNames[m.code]}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Time range
            <select
              value={range}
              onChange={(e) => setRange(Number(e.target.value))}
            >
              {[7, 30, 90].map((n) => (
                <option key={n} value={n}>
                  {n} days
                </option>
              ))}
            </select>
          </label>
        </div>
        <div
          role="img"
          aria-label={`${metricNames[chart]} over ${range} days; gaps mean not logged`}
          className="h-64 min-w-0"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend(data, chart, date, range)}>
              <XAxis dataKey="date" tick={{ fontSize: 10 }} minTickGap={35} />
              <YAxis width={45} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line
                dataKey="value"
                name={data.metrics.find((m) => m.code === chart)?.unit}
                stroke="#56735c"
                connectNulls={false}
                dot={range <= 30}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-muted-foreground">
          Gaps mean not logged. Zero appears only for a recorded zero. Resting
          heart rate is a measurement, without a performance score.
        </p>
        <details className="mt-3">
          <summary className="cursor-pointer py-3">View chart values</summary>
          <ul className="grid gap-1 text-sm sm:grid-cols-3">
            {trend(data, chart, date, range).map((p) => (
              <li key={p.date}>
                {p.date}: {p.value === null ? "Not logged" : display(p.value)}
              </li>
            ))}
          </ul>
        </details>
      </Card>
    </div>
  );
}
