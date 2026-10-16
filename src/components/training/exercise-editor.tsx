"use client";
import { ArrowDown, ArrowUp, Check, Plus, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { moveItem, newSet } from "@/lib/training/documents";
import { exerciseHistory } from "@/lib/training/calculations";
import type {
  ExerciseSlot,
  TrainingSet,
  WorkoutDocument,
} from "@/lib/training/types";
export function ExerciseEditor({
  slots,
  onChange,
  template = false,
  history = [],
  completedAt = null,
}: {
  slots: ExerciseSlot[];
  onChange: (slots: ExerciseSlot[]) => void;
  template?: boolean;
  history?: WorkoutDocument[];
  completedAt?: string | null;
}) {
  function updateSlot(index: number, change: Partial<ExerciseSlot>) {
    onChange(slots.map((e, i) => (i === index ? { ...e, ...change } : e)));
  }
  function updateSet(
    exIndex: number,
    setIndex: number,
    change: Partial<TrainingSet>,
  ) {
    updateSlot(exIndex, {
      sets: slots[exIndex].sets.map((s, i) =>
        i === setIndex ? { ...s, ...change } : s,
      ),
    });
  }
  return (
    <div className="space-y-5">
      {slots.map((exercise, index) => {
        const previous = exerciseHistory(history, exercise.exerciseId).at(-1);
        return (
          <Card key={exercise.id} data-testid="exercise-slot">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="eyebrow">EXERCISE {index + 1}</p>
                <h2 className="text-lg font-semibold">{exercise.name}</h2>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  aria-label={`Move ${exercise.name} up`}
                  disabled={index === 0}
                  onClick={() => onChange(moveItem(slots, index, -1))}
                >
                  <ArrowUp size={17} />
                </Button>
                <Button
                  variant="ghost"
                  aria-label={`Move ${exercise.name} down`}
                  disabled={index === slots.length - 1}
                  onClick={() => onChange(moveItem(slots, index, 1))}
                >
                  <ArrowDown size={17} />
                </Button>
                <Button
                  variant="ghost"
                  aria-label={`Remove ${exercise.name}`}
                  onClick={() => onChange(slots.filter((_, i) => i !== index))}
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
            {!template && (
              <div className="mb-4 rounded-lg bg-secondary px-3 py-2 text-xs text-primary">
                {previous ? (
                  <>
                    Previously ·{" "}
                    {new Intl.DateTimeFormat("en", {
                      month: "short",
                      day: "numeric",
                      timeZone: previous.timezone,
                    }).format(new Date(previous.date))}{" "}
                    ·{" "}
                    {previous.exercises
                      .flatMap((e) => e.sets)
                      .filter((s) => s.completedAt)
                      .map(
                        (s) =>
                          `${s.weight ?? 0} kg × ${s.reps}${s.setType === "warmup" ? " (warm-up)" : ""}`,
                      )
                      .join(" / ")}
                  </>
                ) : (
                  "Your first recorded performance for this exercise."
                )}
              </div>
            )}
            <div className="grid grid-cols-[24px_minmax(0,1fr)_minmax(0,1fr)_44px_44px] items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              <span>Set</span>
              <span>kg{template ? " (optional)" : ""}</span>
              <span>Reps</span>
              <span>{template ? "" : "Done"}</span>
              <span className="sr-only">Remove</span>
            </div>
            {exercise.sets.map((set, i) => (
              <div
                key={set.id}
                className="mt-3 rounded-xl border border-border bg-background/50 p-2 sm:p-3"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <select
                    className="min-h-9 w-auto max-w-40 py-1 text-xs"
                    aria-label={`${exercise.name} set ${i + 1} type`}
                    value={set.setType}
                    onChange={(e) =>
                      updateSet(index, i, {
                        setType: e.target.value as TrainingSet["setType"],
                      })
                    }
                  >
                    {["working", "warmup", "drop", "failure"].map((type) => (
                      <option key={type} value={type}>
                        {type === "warmup"
                          ? "Warm-up"
                          : type[0].toUpperCase() + type.slice(1)}{" "}
                        set
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-muted-foreground">
                    {exercise.trackingType === "reps"
                      ? "Bodyweight · use 0 kg"
                      : ""}
                  </span>
                </div>
                <div className="grid grid-cols-[24px_minmax(0,1fr)_minmax(0,1fr)_44px_44px] items-center gap-2">
                  <span className="text-xs text-muted-foreground">{i + 1}</span>
                  <input
                    aria-label={`${exercise.name} set ${i + 1} weight (kg)`}
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={2000}
                    step={0.25}
                    value={set.weight ?? ""}
                    placeholder={template ? "Optional" : "0"}
                    onChange={(e) =>
                      updateSet(index, i, {
                        weight:
                          e.target.value === "" && template
                            ? null
                            : Number(e.target.value),
                      })
                    }
                  />
                  <input
                    aria-label={`${exercise.name} set ${i + 1} repetitions`}
                    type="number"
                    inputMode="numeric"
                    min={template ? 1 : 0}
                    max={1000}
                    step={1}
                    value={set.reps}
                    onChange={(e) =>
                      updateSet(index, i, { reps: Number(e.target.value) })
                    }
                  />
                  {template ? (
                    <span />
                  ) : (
                    <button
                      className={`grid h-11 w-11 place-items-center rounded-lg border ${set.completedAt ? "border-primary bg-primary text-white" : "border-border bg-white text-muted-foreground"}`}
                      aria-label={`Complete ${exercise.name} set ${i + 1}`}
                      aria-pressed={Boolean(set.completedAt)}
                      onClick={() =>
                        updateSet(index, i, {
                          completedAt: set.completedAt
                            ? null
                            : (completedAt ?? new Date().toISOString()),
                        })
                      }
                    >
                      <Check size={18} />
                    </button>
                  )}
                  <button
                    className="grid h-11 w-11 place-items-center rounded-lg text-muted-foreground disabled:opacity-30"
                    aria-label={`Remove ${exercise.name} set ${i + 1}`}
                    disabled={exercise.sets.length <= 1}
                    onClick={() =>
                      updateSlot(index, {
                        sets: exercise.sets.filter((_, j) => j !== i),
                      })
                    }
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
                <details className="mt-3">
                  <summary className="min-h-11 text-[11px] text-muted-foreground">
                    Effort & set notes
                  </summary>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <label className="text-xs">
                      RPE (0–10)
                      <input
                        className="mt-1"
                        aria-label={`${exercise.name} set ${i + 1} RPE`}
                        type="number"
                        min={0}
                        max={10}
                        step={0.5}
                        value={set.rpe ?? ""}
                        placeholder="Optional"
                        onChange={(e) =>
                          updateSet(index, i, {
                            rpe:
                              e.target.value === ""
                                ? null
                                : Number(e.target.value),
                          })
                        }
                      />
                    </label>
                    <label className="text-xs">
                      RIR (0–10)
                      <input
                        className="mt-1"
                        aria-label={`${exercise.name} set ${i + 1} RIR`}
                        type="number"
                        min={0}
                        max={10}
                        step={1}
                        value={set.rir ?? ""}
                        placeholder="Optional"
                        onChange={(e) =>
                          updateSet(index, i, {
                            rir:
                              e.target.value === ""
                                ? null
                                : Number(e.target.value),
                          })
                        }
                      />
                    </label>
                    <label className="col-span-2 text-xs">
                      Set notes
                      <input
                        className="mt-1"
                        aria-label={`${exercise.name} set ${i + 1} notes`}
                        maxLength={2000}
                        value={set.notes}
                        onChange={(e) =>
                          updateSet(index, i, { notes: e.target.value })
                        }
                      />
                    </label>
                  </div>
                </details>
              </div>
            ))}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <Button
                variant="outline"
                disabled={exercise.sets.length >= 30}
                onClick={() =>
                  updateSlot(index, {
                    sets: [
                      ...exercise.sets,
                      newSet({
                        ...exercise.sets.at(-1),
                        id: crypto.randomUUID(),
                        completedAt: null,
                      }),
                    ],
                  })
                }
              >
                <Plus size={15} />
                Add set
              </Button>
              <label className="w-full text-xs text-muted-foreground sm:w-auto">
                Exercise notes
                <input
                  className="mt-1"
                  aria-label={`${exercise.name} exercise notes`}
                  maxLength={2000}
                  value={exercise.notes}
                  onChange={(e) => updateSlot(index, { notes: e.target.value })}
                />
              </label>
            </div>
          </Card>
        );
      })}
      {!slots.length && (
        <Card className="py-10 text-center">
          <h2 className="font-semibold">Start with one movement.</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Add an exercise from your library below.
          </p>
        </Card>
      )}
    </div>
  );
}
