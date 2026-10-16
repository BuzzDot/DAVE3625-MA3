"use client";
import { useState } from "react";
import { Dumbbell, Heart, Flame } from "lucide-react";
import { ActivityChart } from "@/components/charts";
import { Card } from "@/components/ui/card";
export function Progress() {
  const [metric, setMetric] = useState<"volume" | "weight" | "calories">(
    "volume",
  );
  return (
    <>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          [
            "Training consistency",
            "3 sessions",
            "of 4 planned this week",
            Dumbbell,
          ],
          ["Body weight", "75.1 kg", "−0.3 kg this week", Heart],
          ["Bench press record", "60 kg × 8", "Demo best · Oct 15", Flame],
        ].map(([title, value, note, Icon]) => {
          const I = Icon as typeof Dumbbell;
          return (
            <Card key={String(title)}>
              <I size={20} className="mb-4 text-primary" />
              <p className="text-xs text-muted-foreground">{String(title)}</p>
              <p className="my-2 text-2xl font-semibold">{String(value)}</p>
              <p className="text-xs text-muted-foreground">{String(note)}</p>
            </Card>
          );
        })}
      </div>
      <Card>
        <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Your week in perspective</h2>
          <label className="text-xs text-muted-foreground">
            Metric
            <select
              className="ml-2 w-auto"
              value={metric}
              onChange={(e) => setMetric(e.target.value as typeof metric)}
            >
              <option value="volume">Training volume (kg)</option>
              <option value="weight">Body weight (kg)</option>
              <option value="calories">Energy (kcal)</option>
            </select>
          </label>
        </div>
        <ActivityChart metric={metric} />
        <p className="mt-5 text-xs text-muted-foreground">
          Oct 12–18, 2026 · Sample measurements. Weekend weight readings are
          absent, not zero.
        </p>
      </Card>
      <Card className="mt-6">
        <h2 className="mb-4 font-semibold">
          Daily health diary · sample readings
        </h2>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {[
            ["Steps", "7,240"],
            ["Water", "1.5 L"],
            ["Sleep", "7.5 hours"],
            ["Resting heart rate", "58 bpm"],
          ].map(([k, v]) => (
            <div key={k}>
              <p className="text-xs text-muted-foreground">{k}</p>
              <p className="mt-2 text-lg font-semibold">{v}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                Source: fictional manual entry
              </p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-xs text-muted-foreground">
          Measurement entry, custom goals, wearable imports, and calculated
          personal records will follow in later phases.
        </p>
      </Card>
    </>
  );
}
