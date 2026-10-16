"use client";
import { useState } from "react";
import { ArrowRight, Check, Dumbbell, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { routines } from "@/lib/demo/data";
import { Card } from "@/components/ui/card";
type DemoSet = {
  exercise: string;
  reps: number;
  weight: number;
  rpe: number;
  done: boolean;
};
export function Workouts() {
  const [query, setQuery] = useState("");
  const [session, setSession] = useState<string | null>(null);
  const [sets, setSets] = useState<DemoSet[]>([]);
  const [history, setHistory] = useState<
    { name: string; volume: number; count: number }[]
  >([]);
  const [message, setMessage] = useState("");
  function start(routine: (typeof routines)[number]) {
    setSession(routine.name);
    setMessage("");
    setSets(
      routine.exercises.flatMap((exercise) =>
        Array.from({ length: 3 }, () => ({
          exercise,
          reps: 8,
          weight: 20,
          rpe: 7,
          done: false,
        })),
      ),
    );
  }
  function update(
    index: number,
    field: "weight" | "reps" | "rpe",
    value: string,
  ) {
    const n = Number(value);
    setSets((prev) =>
      prev.map((s, i) =>
        i === index
          ? {
              ...s,
              [field]: Number.isFinite(n)
                ? Math.max(
                    0,
                    Math.min(
                      field === "rpe" ? 10 : field === "reps" ? 1000 : 2000,
                      n,
                    ),
                  )
                : 0,
            }
          : s,
      ),
    );
  }
  if (session)
    return (
      <>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow">DEMO SESSION · KG</p>
            <h2 className="text-2xl font-semibold">{session}</h2>
            <p className="mt-2 text-xs text-muted-foreground">
              Mark a set complete to include it in your demo session summary.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setSession(null);
              setMessage("Demo session discarded.");
            }}
          >
            <X size={16} />
            Discard preview
          </Button>
        </div>
        <div className="space-y-4">
          {[...new Set(sets.map((s) => s.exercise))].map((exercise) => (
            <Card key={exercise}>
              <h3 className="mb-4 font-semibold">{exercise}</h3>
              <div className="grid grid-cols-[30px_1fr_1fr_1fr_44px] gap-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                <span>Set</span>
                <span>kg</span>
                <span>Reps</span>
                <span>RPE</span>
                <span className="sr-only">Complete</span>
              </div>
              {sets.map(
                (set, i) =>
                  set.exercise === exercise && (
                    <div
                      key={i}
                      className="mt-2 grid grid-cols-[30px_1fr_1fr_1fr_44px] items-center gap-2"
                    >
                      <span className="text-xs text-muted-foreground">
                        {(i % 3) + 1}
                      </span>
                      {(["weight", "reps", "rpe"] as const).map((field) => (
                        <input
                          key={field}
                          aria-label={`${exercise} set ${(i % 3) + 1} ${field}`}
                          type="number"
                          min="0"
                          max={
                            field === "rpe"
                              ? 10
                              : field === "reps"
                                ? 1000
                                : 2000
                          }
                          step={field === "reps" ? 1 : 0.5}
                          value={set[field]}
                          onChange={(e) => update(i, field, e.target.value)}
                        />
                      ))}
                      <button
                        aria-label={`Complete ${exercise} set ${(i % 3) + 1}`}
                        aria-pressed={set.done}
                        onClick={() =>
                          setSets((prev) =>
                            prev.map((s, j) =>
                              i === j ? { ...s, done: !s.done } : s,
                            ),
                          )
                        }
                        className={`grid h-11 w-11 place-items-center rounded-lg border ${set.done ? "border-primary bg-primary text-white" : "border-border bg-muted text-muted-foreground"}`}
                      >
                        <Check size={18} />
                      </button>
                    </div>
                  ),
              )}
            </Card>
          ))}
        </div>
        <Button
          className="mt-5"
          disabled={!sets.some((s) => s.done)}
          onClick={() => {
            const completed = sets.filter((s) => s.done);
            setHistory((prev) => [
              {
                name: session,
                volume: completed.reduce((n, s) => n + s.reps * s.weight, 0),
                count: completed.length,
              },
              ...prev,
            ]);
            setSession(null);
            setMessage(
              "Demo session finished. Summary is held only on this page.",
            );
          }}
        >
          Finish demo session <ArrowRight size={16} />
        </Button>
      </>
    );
  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">
          Your routines{" "}
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            3 demo templates
          </span>
        </h2>
        <label className="relative w-full sm:w-64">
          <Search
            className="absolute left-3 top-3.5 text-muted-foreground"
            size={16}
          />
          <input
            className="pl-9"
            placeholder="Find a routine…"
            aria-label="Search routines"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {routines
          .filter((r) => r.name.toLowerCase().includes(query.toLowerCase()))
          .map((r) => (
            <Card key={r.name}>
              <span className={`icon-tile ${r.color}`}>
                <Dumbbell size={19} />
              </span>
              <p className="eyebrow mt-6">{r.category}</p>
              <h3 className="text-lg font-semibold">{r.name}</h3>
              <p className="mt-2 text-xs text-muted-foreground">{r.detail}</p>
              <ul className="my-5 space-y-2 text-xs text-muted-foreground">
                {r.exercises.slice(0, 3).map((e) => (
                  <li key={e}>{e}</li>
                ))}
                <li>+ {r.exercises.length - 3} more exercises</li>
              </ul>
              <Button className="w-full" onClick={() => start(r)}>
                Try demo session <ArrowRight size={15} />
              </Button>
            </Card>
          ))}
      </div>
      {!routines.some((r) =>
        r.name.toLowerCase().includes(query.toLowerCase()),
      ) && <Card>No routines match your search.</Card>}
      <p role="status" className="my-5 text-sm text-primary">
        {message}
      </p>
      <Card>
        <h2 className="mb-4 font-semibold">Session history</h2>
        {history.map((h, i) => (
          <div
            key={i}
            className="flex flex-wrap justify-between gap-2 border-b border-border py-3 text-sm"
          >
            <span>{h.name} · just now (demo)</span>
            <span>
              {h.count} sets · {h.volume.toLocaleString()} kg
            </span>
          </div>
        ))}
        {[
          ["Full body essentials", "Oct 15 · 46 min · 5,400 kg"],
          ["Lower body strength", "Oct 13 · 51 min · 6,100 kg"],
          ["Upper body strength", "Oct 12 · 52 min · 4,200 kg"],
        ].map(([name, detail]) => (
          <div
            key={name}
            className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-4 last:border-0"
          >
            <div className="text-sm font-medium">{name}</div>
            <span className="text-xs text-muted-foreground">{detail}</span>
          </div>
        ))}
      </Card>
    </>
  );
}
