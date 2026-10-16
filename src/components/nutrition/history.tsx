"use client";
import { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Card } from "@/components/ui/card";
import {
  display,
  sumMacros,
  entryMacros,
  goalForDate,
} from "@/lib/nutrition/calculations";
import type { Entry, Goal } from "@/lib/nutrition/types";
export function NutritionHistory({
  entries,
  goals,
  date,
}: {
  entries: Entry[];
  goals: Goal[];
  date: string;
}) {
  const [metric, setMetric] = useState<"kcal" | "protein" | "carbs" | "fat">(
    "kcal",
  );
  const dates = Array.from(
    new Set(
      entries.filter((e) => e.local_date <= date).map((e) => e.local_date),
    ),
  )
    .sort()
    .slice(-30);
  const points = dates.map((day) => {
    const goal = goalForDate(goals, day);
    return {
      date: day,
      ...sumMacros(
        entries.filter((e) => e.local_date === day).map(entryMacros),
      ),
      target: goal
        ? {
            kcal: goal.kcal,
            protein: goal.protein_g,
            carbs: goal.carbs_g,
            fat: goal.fat_g,
          }[metric]
        : null,
    };
  });
  const label = {
    kcal: "Calories (kcal)",
    protein: "Protein (g)",
    carbs: "Carbohydrates (g)",
    fat: "Fat (g)",
  }[metric];
  return (
    <Card>
      <h2 className="text-lg font-semibold">Your nutrition history</h2>
      <p className="mt-2 text-xs text-muted-foreground">
        Last 30 recorded days through {date}. Unlogged days are omitted; unknown
        values leave gaps.
      </p>
      <label className="mt-4 block max-w-xs text-xs">
        Nutrition chart metric
        <select
          className="mt-2"
          value={metric}
          onChange={(e) => setMetric(e.target.value as typeof metric)}
        >
          <option value="kcal">Calories</option>
          <option value="protein">Protein</option>
          <option value="carbs">Carbohydrates</option>
          <option value="fat">Fat</option>
        </select>
      </label>
      {points.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">
          Log your first meal to start building your history.
        </p>
      ) : (
        <>
          <div
            className="mt-6 h-64 min-w-0"
            role="img"
            aria-label={`Daily ${label} and dated targets`}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={points}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={45} />
                <Tooltip />
                <Line
                  name={label}
                  type="monotone"
                  dataKey={metric}
                  stroke="#64794e"
                  strokeWidth={2}
                  connectNulls={false}
                />
                <Line
                  name="Target"
                  dataKey="target"
                  stroke="#aaa184"
                  strokeDasharray="4 4"
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <caption className="sr-only">
                Recorded daily calories and macronutrients
              </caption>
              <thead>
                <tr>
                  {["Date", "Calories", "Protein", "Carbs", "Fat"].map((v) => (
                    <th key={v} className="p-2 font-medium">
                      {v}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...points].reverse().map((p) => (
                  <tr key={p.date} className="border-t border-border">
                    <td className="whitespace-nowrap p-2">{p.date}</td>
                    {(["kcal", "protein", "carbs", "fat"] as const).map((k) => (
                      <td className="p-2" key={k}>
                        {display(p[k], k === "kcal" ? "" : " g")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  );
}
