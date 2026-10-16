"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Copy, Dumbbell, Plus } from "lucide-react";
import {
  archiveRoutineAction,
  saveRoutineAction,
  startWorkoutAction,
} from "@/app/workouts/actions";
import { emptyRoutine, duplicateRoutine } from "@/lib/training/documents";
import { summarizeExercises } from "@/lib/training/calculations";
import { PageHeading } from "@/components/page-heading";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExerciseLibrary } from "./exercise-library";
import { RoutineEditor } from "./routine-editor";
import { ConfirmDelete } from "./confirm-delete";
import type { RoutineDocument, TrainingData } from "@/lib/training/types";
export function TrainingWorkspace({ data }: { data: TrainingData }) {
  const router = useRouter();
  const [tab, setTab] = useState<"routines" | "library" | "history">(
    "routines",
  );
  const [editor, setEditor] = useState<RoutineDocument | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  function start(routineId: string | null) {
    startTransition(async () => {
      const result = await startWorkoutAction(
        routineId,
        Intl.DateTimeFormat().resolvedOptions().timeZone,
      );
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.push(`/workouts/${result.data.id}`);
    });
  }
  const drafts = data.workouts.filter((w) => !w.completedAt);
  const completed = data.workouts.filter((w) => w.completedAt);
  return (
    <>
      <PageHeading
        eyebrow="YOUR PRIVATE TRAINING DIARY"
        title="Your next strong chapter."
        description="Plan your training. Record every set. Keep the progress."
      >
        <Button onClick={() => start(null)} disabled={pending}>
          <Plus size={16} />
          {pending ? "Working…" : "Start empty workout"}
        </Button>
      </PageHeading>
      <p className="mb-6 rounded-xl bg-secondary px-4 py-3 text-xs text-primary">
        Live workout module · Your account’s Supabase data · Kilograms by
        default
      </p>
      <p role="alert" className="my-3 text-sm text-red-700">
        {error}
      </p>
      {drafts.length > 0 && (
        <Card className="mb-6">
          <h2 className="mb-4 text-sm font-semibold">
            Pick up where you left off
          </h2>
          <div className="space-y-3">
            {drafts.map((d) => (
              <Link
                key={d.id}
                href={`/workouts/${d.id}`}
                className="flex items-center justify-between gap-3 rounded-xl bg-muted p-4"
              >
                <span className="text-sm">
                  <strong>{d.name}</strong>
                  <span className="ml-2 text-xs text-muted-foreground">
                    Draft ·{" "}
                    {new Intl.DateTimeFormat("en", {
                      dateStyle: "medium",
                      timeZone: d.timezone,
                    }).format(new Date(d.startedAt))}
                  </span>
                </span>
                <ArrowRight size={16} />
              </Link>
            ))}
          </div>
        </Card>
      )}
      <nav aria-label="Workout sections" className="mb-6 flex flex-wrap gap-2">
        {(["routines", "library", "history"] as const).map((value) => (
          <Button
            key={value}
            variant={tab === value ? "default" : "outline"}
            aria-pressed={tab === value}
            onClick={() => {
              setEditor(null);
              setTab(value);
            }}
          >
            {value === "routines"
              ? "Your routines"
              : value === "library"
                ? "Exercise library"
                : "Workout history"}
          </Button>
        ))}
      </nav>
      {tab === "routines" &&
        (editor ? (
          <RoutineEditor
            key={editor.id}
            initial={editor}
            exercises={data.exercises}
            onClose={() => {
              setEditor(null);
              router.refresh();
            }}
          />
        ) : (
          <>
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="font-semibold">Reusable routines</h2>
              <Button
                variant="outline"
                onClick={() => setEditor(emptyRoutine())}
              >
                <Plus size={15} />
                Create routine
              </Button>
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              {data.routines.map((r) => (
                <Card key={r.id}>
                  <span className="icon-tile sage">
                    <Dumbbell size={19} />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold">{r.name}</h3>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {r.exercises.length} exercises ·{" "}
                    {r.exercises.reduce((n, e) => n + e.sets.length, 0)}{" "}
                    intended sets
                  </p>
                  {r.notes && (
                    <p className="mt-3 text-xs text-muted-foreground">
                      {r.notes}
                    </p>
                  )}
                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button disabled={pending} onClick={() => start(r.id)}>
                      Start workout <ArrowRight size={15} />
                    </Button>
                    <Button
                      variant="outline"
                      disabled={pending}
                      onClick={() => setEditor(r)}
                    >
                      Edit routine
                    </Button>
                    <Button
                      variant="ghost"
                      disabled={pending}
                      aria-label={`Duplicate ${r.name}`}
                      onClick={() =>
                        startTransition(async () => {
                          const result = await saveRoutineAction(
                            duplicateRoutine(r),
                          );
                          if (!result.success) setError(result.error);
                          else router.refresh();
                        })
                      }
                    >
                      <Copy size={15} />
                      Duplicate
                    </Button>
                    <ConfirmDelete
                      label="Delete routine"
                      pending={pending}
                      onConfirm={() =>
                        startTransition(async () => {
                          const result = await archiveRoutineAction(
                            r.id,
                            r.revision,
                          );
                          if (!result.success) setError(result.error);
                          else router.refresh();
                        })
                      }
                    />
                  </div>
                </Card>
              ))}
            </div>
            {!data.routines.length && (
              <Card className="py-12 text-center">
                <Dumbbell size={30} className="mx-auto mb-4 text-primary" />
                <h3 className="font-semibold">Build your first routine.</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Choose your exercises and target sets, then use them whenever
                  you train.
                </p>
              </Card>
            )}
            <p className="mt-4 text-xs text-muted-foreground">
              Deleted routines are archived so completed workouts and planned
              activities retain their history.
            </p>
          </>
        ))}
      {tab === "library" && <ExerciseLibrary exercises={data.exercises} />}{" "}
      {tab === "history" && (
        <Card>
          <h2 className="mb-5 font-semibold">Completed workouts</h2>
          {completed.length ? (
            completed.map((w) => (
              <Link
                href={`/workouts/${w.id}`}
                key={w.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-4 last:border-0"
              >
                <div>
                  <h3 className="text-sm font-semibold">{w.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Intl.DateTimeFormat("en", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: w.timezone,
                    }).format(new Date(w.startedAt))}
                  </p>
                </div>
                <span className="flex items-center gap-3 text-xs text-muted-foreground">
                  {summarizeExercises(w.exercises).volume.toLocaleString()} kg{" "}
                  <ArrowRight size={16} />
                </span>
              </Link>
            ))
          ) : (
            <p className="py-8 text-sm text-muted-foreground">
              Your first completed workout will appear here. Drafts stay above
              until you finish them.
            </p>
          )}
        </Card>
      )}
    </>
  );
}
