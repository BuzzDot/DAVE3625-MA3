"use client";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { meals } from "@/lib/demo/data";
import { Card } from "@/components/ui/card";
export function Nutrition() {
  const [entries, setEntries] = useState(meals);
  const [form, setForm] = useState(false);
  const [error, setError] = useState("");
  const totals = entries.reduce(
    (n, m) => ({
      calories: n.calories + m.calories,
      protein: n.protein + m.protein,
      carbs: n.carbs + m.carbs,
      fat: n.fat + m.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {(
          [
            ["Energy", totals.calories, "kcal", 2200],
            ["Protein", totals.protein, "g", 150],
            ["Carbohydrates", totals.carbs, "g", 275],
            ["Fat", totals.fat, "g", 75],
          ] as const
        ).map(([name, value, unit, goal]) => (
          <Card key={name}>
            <p className="text-xs text-muted-foreground">{name}</p>
            <p className="my-3 text-2xl font-semibold">
              {value}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                / {goal} {unit}
              </span>
            </p>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${Math.min(100, (value / goal) * 100)}%` }}
              />
            </div>
          </Card>
        ))}
      </div>
      <Card>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-semibold">Friday’s food diary</h2>
          <Button variant="outline" onClick={() => setForm(!form)}>
            {form ? <X size={15} /> : <Plus size={15} />}{" "}
            {form ? "Close" : "Try an entry"}
          </Button>
        </div>
        {form && (
          <form
            className="mb-6 rounded-xl bg-muted p-4"
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              const name = String(data.get("name") || "").trim();
              const values = ["calories", "protein", "carbs", "fat"].map(
                (key) => Number(data.get(key)),
              );
              if (!name || values.some((n) => !Number.isFinite(n) || n < 0)) {
                setError("Enter a food name and valid nonnegative amounts.");
                return;
              }
              setEntries((prev) => [
                ...prev,
                {
                  name,
                  time: "Manual entry · demo serving",
                  calories: values[0],
                  protein: values[1],
                  carbs: values[2],
                  fat: values[3],
                  icon: "🍴",
                },
              ]);
              setError("");
              setForm(false);
            }}
          >
            <p className="mb-4 text-xs text-muted-foreground">
              Enter totals for one serving. Demo only; no food database lookup.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs">
                Food name
                <input
                  name="name"
                  required
                  maxLength={100}
                  className="mt-1"
                  placeholder="e.g. Apple"
                />
              </label>
              {["calories", "protein", "carbs", "fat"].map((k) => (
                <label key={k} className="text-xs capitalize">
                  {k} ({k === "calories" ? "kcal" : "g"})
                  <input
                    name={k}
                    type="number"
                    min="0"
                    max="10000"
                    step="0.1"
                    required
                    defaultValue="0"
                    className="mt-1"
                  />
                </label>
              ))}
            </div>
            <p role="alert" className="my-2 text-xs text-red-700">
              {error}
            </p>
            <Button type="submit">Add demo entry</Button>
          </form>
        )}
        <div className="divide-y divide-border">
          {entries.map((meal, i) => (
            <div key={i} className="flex flex-wrap items-center gap-4 py-5">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-muted text-2xl">
                {meal.icon}
              </span>
              <div className="flex-1">
                <h3 className="text-sm font-semibold">{meal.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {meal.time}
                </p>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  P {meal.protein} g · C {meal.carbs} g · F {meal.fat} g
                </p>
              </div>
              <span className="text-sm font-semibold">
                {meal.calories}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  kcal
                </span>
              </span>
            </div>
          ))}
        </div>
      </Card>
      <p className="mt-4 text-xs text-muted-foreground">
        Library, favorites, recipe editing, serving conversion, and
        Matvaretabellen integration are planned.
      </p>
    </>
  );
}
