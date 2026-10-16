"use client";
import Link from "next/link";
import { useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  exerciseHistory,
  personalRecords,
  previousComparison,
} from "@/lib/training/calculations";
import { PageHeading } from "@/components/page-heading";
import { Card } from "@/components/ui/card";
import type { TrainingData } from "@/lib/training/types";
const kg = (value: number | null) =>
  value === null
    ? "—"
    : `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg`;
export function TrainingProgress({ data }: { data: TrainingData }) {
  const choices = data.exercises.filter(
    (e) =>
      !e.archived ||
      data.workouts.some((w) => w.exercises.some((s) => s.exerciseId === e.id)),
  );
  const [exerciseId, setExerciseId] = useState(
    choices.find((e) => exerciseHistory(data.workouts, e.id).length)?.id ??
      choices[0]?.id ??
      "",
  );
  const [metric, setMetric] = useState<
    "bestEstimated1RM" | "volume" | "highestWeight"
  >("bestEstimated1RM");
  const history = exerciseHistory(data.workouts, exerciseId);
  const pr = personalRecords(data.workouts, exerciseId);
  const comparison = previousComparison(
    history.at(-1)?.bestEstimated1RM ?? null,
    history.at(-2)?.bestEstimated1RM ?? null,
  );
  return (
    <>
      <PageHeading
        eyebrow="YOUR RECORDED STRENGTH"
        title="Small steps, real progress."
        description="Exercise history and records calculated from your saved workouts."
      />
      <Card className="mb-5">
        <label className="block text-xs">
          Choose an exercise
          <select
            className="mt-2"
            value={exerciseId}
            onChange={(e) => setExerciseId(e.target.value)}
          >
            {choices.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
      </Card>
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Highest weight", kg(pr.highestWeight)],
          ["Best estimated 1RM", kg(pr.estimated1RM)],
          ["Working volume", kg(pr.volume)],
          ["Recorded sessions", String(pr.sessions)],
        ].map(([title, value]) => (
          <Card key={title}>
            <p className="text-xs text-muted-foreground">{title}</p>
            <p className="mt-3 text-xl font-semibold">{value}</p>
          </Card>
        ))}
      </div>
      <Card>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <h2 className="font-semibold">Your training story</h2>
          <label className="text-xs">
            Chart metric
            <select
              className="ml-2 w-auto"
              value={metric}
              onChange={(e) => setMetric(e.target.value as typeof metric)}
            >
              <option value="bestEstimated1RM">Estimated 1RM (kg)</option>
              <option value="highestWeight">Highest weight (kg)</option>
              <option value="volume">Working volume (kg)</option>
            </select>
          </label>
        </div>
        {history.length ? (
          <>
            <div
              className="h-64 min-w-0"
              role="img"
              aria-label={`Exercise progress chart with ${history.length} recorded sessions. Values are listed in the history below.`}
            >
              <ResponsiveContainer
                width="100%"
                height="100%"
                minWidth={0}
                initialDimension={{ width: 500, height: 256 }}
              >
                <LineChart
                  data={history.map((p) => ({
                    ...p,
                    label: new Intl.DateTimeFormat("en", {
                      month: "short",
                      day: "numeric",
                      timeZone: p.timezone,
                    }).format(new Date(p.date)),
                  }))}
                >
                  <CartesianGrid vertical={false} stroke="#edf0eb" />
                  <XAxis
                    dataKey="label"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    width={45}
                    tick={{ fontSize: 10 }}
                    domain={["auto", "auto"]}
                  />
                  <Tooltip
                    formatter={(value) =>
                      kg(typeof value === "number" ? value : Number(value))
                    }
                  />
                  <Line
                    dataKey={metric}
                    name={
                      metric === "volume"
                        ? "Working volume"
                        : metric === "highestWeight"
                          ? "Highest weight"
                          : "Estimated 1RM"
                    }
                    isAnimationActive={false}
                    connectNulls={false}
                    stroke="#65836b"
                    strokeWidth={3}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-4 text-xs text-primary">
              {comparison === null
                ? "Complete two sessions with eligible sets to see a comparison."
                : `Latest estimated 1RM: ${comparison >= 0 ? "+" : ""}${comparison.toFixed(1)} kg versus the previous session.`}
            </p>
          </>
        ) : (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No completed performance for this exercise yet.{" "}
            <Link className="text-primary underline" href="/workouts">
              Log a workout
            </Link>{" "}
            to start your history.
          </p>
        )}
      </Card>
      <Card className="mt-5">
        <h2 className="mb-5 font-semibold">Exercise-specific history</h2>
        {[...history].reverse().map((point) => (
          <Link
            href={`/workouts/${point.sessionId}`}
            key={point.sessionId}
            className="block border-b border-border py-4 last:border-0"
          >
            <div className="flex flex-wrap justify-between gap-2 text-sm">
              <strong>{point.name}</strong>
              <span className="text-xs text-muted-foreground">
                {new Intl.DateTimeFormat("en", {
                  dateStyle: "medium",
                  timeZone: point.timezone,
                }).format(new Date(point.date))}
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {point.sets} working sets · {kg(point.volume)} volume ·{" "}
              {kg(point.highestWeight)} highest · {kg(point.bestEstimated1RM)}{" "}
              estimated 1RM
            </p>
          </Link>
        ))}
        {!history.length && (
          <p className="text-sm text-muted-foreground">
            Your history will appear here after you finish a workout.
          </p>
        )}
      </Card>
      <Card className="mt-5">
        <h2 className="mb-3 text-sm font-semibold">
          How these numbers are calculated
        </h2>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Only completed sets in completed workouts count. Warm-up sets are
          excluded; working, drop, and failure sets are included. Volume is
          external kg × repetitions. Highest weight uses any positive-repetition
          external-load set. Estimated 1RM uses Epley: kg × (1 + reps / 30) for
          2–12 reps; a single rep uses the actual load. Sets above 12 reps, zero
          load, and reps-only/bodyweight exercises do not produce an estimated
          1RM. Estimates are comparisons, not tested maximums. Missing
          measurements stay absent. These records cover your full saved history,
          not just the chart’s visible points.
        </p>
      </Card>
    </>
  );
}
