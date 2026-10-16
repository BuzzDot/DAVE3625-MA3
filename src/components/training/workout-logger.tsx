"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Save } from "lucide-react";
import { deleteWorkoutAction } from "@/app/workouts/actions";
import { newSlot } from "@/lib/training/documents";
import { summarizeExercises } from "@/lib/training/calculations";
import { PageHeading } from "@/components/page-heading";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExerciseEditor } from "./exercise-editor";
import { ExerciseLibrary } from "./exercise-library";
import { ConfirmDelete } from "./confirm-delete";
import { useWorkoutDraft } from "./use-workout-draft";
import type { TrainingData, WorkoutDocument } from "@/lib/training/types";
export function WorkoutLogger({
  initial,
  data,
}: {
  initial: WorkoutDocument;
  data: TrainingData;
}) {
  const router = useRouter();
  const draft = useWorkoutDraft(initial, data.userId);
  const document = draft.document;
  const [finishing, setFinishing] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleting, startTransition] = useTransition();
  const summary = summarizeExercises(document.exercises);
  function changeDate(value: string, field: "startedAt" | "completedAt") {
    const time = new Date(`${value}:00Z`);
    if (!Number.isFinite(time.getTime())) return;
    if (field === "startedAt") {
      const delta = time.getTime() - Date.parse(document.startedAt);
      draft.change({
        ...document,
        startedAt: time.toISOString(),
        completedAt: document.completedAt
          ? new Date(Date.parse(document.completedAt) + delta).toISOString()
          : null,
        exercises: document.exercises.map((e) => ({
          ...e,
          sets: e.sets.map((s) => ({
            ...s,
            completedAt: s.completedAt
              ? new Date(Date.parse(s.completedAt) + delta).toISOString()
              : null,
          })),
        })),
      });
    } else
      draft.change({
        ...document,
        completedAt: time.toISOString(),
        exercises: document.exercises.map((e) => ({
          ...e,
          sets: e.sets.map((s) => ({
            ...s,
            completedAt: s.completedAt ? time.toISOString() : null,
          })),
        })),
      });
  }
  return (
    <>
      <Link
        href="/workouts"
        className="mb-6 inline-flex min-h-11 items-center gap-2 text-xs text-primary"
      >
        <ArrowLeft size={15} />
        Back to workouts
      </Link>
      <PageHeading
        eyebrow={
          document.completedAt ? "YOUR RECORDED WORKOUT" : "ONE SET AT A TIME"
        }
        title={document.name}
        description={
          document.completedAt
            ? "Review or correct your own recorded sets. Changes autosave to your account."
            : "Your workout autosaves after you pause typing. Keep moving at your pace."
        }
      />
      <div className="mb-5 grid grid-cols-3 gap-3">
        {[
          [
            "Completed sets",
            String(
              document.exercises
                .flatMap((e) => e.sets)
                .filter((s) => s.completedAt).length,
            ),
          ],
          ["Working volume", `${summary.volume.toLocaleString()} kg`],
          ["Exercises", String(document.exercises.length)],
        ].map(([label, value]) => (
          <Card key={label} className="p-4">
            <p className="text-[10px] text-muted-foreground">{label}</p>
            <p className="mt-2 text-lg font-semibold">{value}</p>
          </Card>
        ))}
      </div>
      {draft.recovery && (
        <Card className="mb-5 border-primary">
          <h2 className="text-sm font-semibold">
            A recovery copy is available on this device.
          </h2>
          <p className="my-3 text-xs text-muted-foreground">
            {draft.recovery.baseRevision === initial.revision
              ? "Restore unsaved edits from your previous visit."
              : "This copy was based on an older server version. Restoring it will replace the current version after you review and save it."}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={draft.restoreRecovery}>Restore device copy</Button>
            <Button variant="outline" onClick={draft.discardRecovery}>
              Discard device copy
            </Button>
          </div>
        </Card>
      )}
      <fieldset disabled={finishing || deleting} className="min-w-0 space-y-5">
        <legend className="sr-only">Workout details and sets</legend>
        <Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs">
              Workout name
              <input
                className="mt-2"
                value={document.name}
                maxLength={200}
                onChange={(e) =>
                  draft.change({ ...document, name: e.target.value })
                }
              />
            </label>
            <label className="text-xs">
              Started (UTC)
              <input
                className="mt-2"
                type="datetime-local"
                value={document.startedAt.slice(0, 16)}
                onChange={(e) => changeDate(e.target.value, "startedAt")}
              />
            </label>
            {document.completedAt && (
              <label className="text-xs">
                Finished (UTC)
                <input
                  className="mt-2"
                  type="datetime-local"
                  value={document.completedAt.slice(0, 16)}
                  onChange={(e) => changeDate(e.target.value, "completedAt")}
                />
              </label>
            )}
            <label className="text-xs">
              Workout notes
              <input
                className="mt-2"
                maxLength={5000}
                value={document.notes}
                onChange={(e) =>
                  draft.change({ ...document, notes: e.target.value })
                }
              />
            </label>
          </div>
          <p className="mt-4 text-[11px] leading-relaxed text-muted-foreground">
            Workout timezone: {document.timezone}. Date corrections use
            explicitly labeled UTC fields. Unsaved recovery copies may be stored
            on this device until the server confirms a save. Only marked sets
            count toward completed performance.
          </p>
        </Card>
        <ExerciseEditor
          slots={document.exercises}
          onChange={(exercises) => draft.change({ ...document, exercises })}
          completedAt={document.completedAt}
          history={data.workouts.filter(
            (w) =>
              w.id !== document.id &&
              Date.parse(w.startedAt) < Date.parse(document.startedAt),
          )}
        />
        <ExerciseLibrary
          exercises={data.exercises}
          onAdd={(exercise) => {
            if (document.exercises.length >= 40) return;
            draft.change({
              ...document,
              exercises: [...document.exercises, newSlot(exercise)],
            });
          }}
        />
      </fieldset>
      <div className="sticky bottom-3 z-20 mt-5 rounded-2xl border border-border bg-white/95 p-4 shadow-sm backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p role="status" className="text-xs font-medium text-primary">
            {draft.status}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={finishing || deleting}
              onClick={() => void draft.persist()}
            >
              <Save size={15} />
              Save {document.completedAt ? "changes" : "draft"}
            </Button>
            {!document.completedAt && (
              <Button
                disabled={
                  finishing ||
                  deleting ||
                  !document.exercises.some((e) =>
                    e.sets.some((s) => s.completedAt),
                  )
                }
                onClick={async () => {
                  setFinishing(true);
                  try {
                    if (await draft.persist(true)) router.refresh();
                  } finally {
                    setFinishing(false);
                  }
                }}
              >
                <Check size={15} />
                {finishing ? "Finishing…" : "Finish workout"}
              </Button>
            )}
            <ConfirmDelete
              label={
                document.completedAt ? "Delete workout" : "Discard workout"
              }
              pending={deleting || finishing}
              onConfirm={() =>
                startTransition(async () => {
                  const currentRevision = await draft.prepareDelete();
                  const latest = await deleteWorkoutAction(
                    document.id,
                    currentRevision,
                  );
                  if (!latest.success) {
                    setDeleteError(latest.error);
                    return;
                  }
                  draft.discardRecovery();
                  router.push("/workouts");
                  router.refresh();
                })
              }
            />
          </div>
        </div>
        <p role="alert" className="mt-2 text-xs text-red-700">
          {draft.error || deleteError}
        </p>
        {draft.error && (
          <Link
            href="/login"
            className="mt-2 inline-block text-xs text-primary underline"
          >
            Log in if your session expired
          </Link>
        )}
      </div>
    </>
  );
}
