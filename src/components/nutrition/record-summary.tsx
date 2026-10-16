"use client";
import Link from "next/link";
import { useState } from "react";
import { useHydrated } from "@/lib/use-hydrated";
import { Card } from "@/components/ui/card";
import { sumMacros, entryMacros, display } from "@/lib/nutrition/calculations";
import type { Entry } from "@/lib/nutrition/types";
export function NutritionRecordSummary({
  entries,
  today,
  calendar = false,
}: {
  entries: Entry[];
  today: string;
  calendar?: boolean;
}) {
  const [date, setDate] = useState(today);
  const hydrated = useHydrated();
  const selected = entries.filter((e) => e.local_date === date);
  const total = sumMacros(selected.map(entryMacros));
  return (
    <Card className="mb-6 border-primary bg-[#f2f5ee]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow">YOUR LIVE NUTRITION</p>
          <h2 className="mt-2 text-lg font-semibold">
            {calendar ? "Recorded meals by date" : "Today, on your plate."}
          </h2>
        </div>
        {calendar && (
          <label className="text-xs">
            Recorded nutrition date
            <input
              className="mt-2"
              type="date"
              disabled={!hydrated}
              value={date}
              onChange={(e) => {
                if (e.target.value) setDate(e.target.value);
              }}
            />
          </label>
        )}
        <Link
          href={`/nutrition?date=${date}`}
          className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline"
        >
          Open nutrition diary
        </Link>
      </div>
      <p className="mt-4 text-xl font-semibold">
        {display(total.kcal, " kcal")}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Protein {display(total.protein, " g")} · Carbs{" "}
        {display(total.carbs, " g")} · Fat {display(total.fat, " g")}
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        {selected.length} consumed entries · {date}. Planned meals are excluded.
      </p>
      {calendar && (
        <ul className="mt-3 space-y-2 text-sm">
          {selected.map((e) => (
            <li key={e.id}>
              {e.meal_slot} · {e.name_snapshot} ·{" "}
              {display(e.kcal_snapshot, " kcal")}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
