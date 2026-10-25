"use client";
import { useState, useTransition } from "react";
import { saveRoutineAction } from "@/app/workouts/actions";
import { routineSchema, validationMessage } from "@/lib/training/validation";
import { newSlot } from "@/lib/training/documents";
import { ExerciseEditor } from "./exercise-editor";
import { ExerciseLibrary } from "./exercise-library";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Exercise, RoutineDocument } from "@/lib/training/types";
export function RoutineEditor({
  initial,
  exercises,
  onClose,
}: {
  initial: RoutineDocument;
  exercises: Exercise[];
  onClose: () => void;
}) {
  const [document, setDocument] = useState(initial);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <fieldset
      disabled={pending}
      aria-busy={pending}
      className="min-w-0 space-y-5"
    >
      <Card>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">
            {initial.revision ? "Edit routine" : "Create routine"}
          </h2>
          <Button variant="ghost" disabled={pending} onClick={onClose}>
            Cancel editing
          </Button>
        </div>
        <label className="mt-5 block text-xs">
          Routine name
          <input
            className="mt-2"
            value={document.name}
            maxLength={200}
            onChange={(e) => setDocument({ ...document, name: e.target.value })}
          />
        </label>
        <label className="mt-4 block text-xs">
          Routine notes
          <input
            className="mt-2"
            value={document.notes}
            maxLength={5000}
            onChange={(e) =>
              setDocument({ ...document, notes: e.target.value })
            }
          />
        </label>
        <p className="mt-4 text-xs text-muted-foreground">
          These are intended sets and repetitions. Editing this template never
          changes recorded workouts. Template edits are saved when you choose
          Save routine.
        </p>
      </Card>
      <ExerciseEditor
        template
        slots={document.exercises}
        onChange={(exercises) => setDocument({ ...document, exercises })}
      />
      <ExerciseLibrary
        exercises={exercises}
        onAdd={(exercise) => {
          if (document.exercises.length < 40)
            setDocument({
              ...document,
              exercises: [...document.exercises, newSlot(exercise)],
            });
          else setError("Maximum 40 exercises per routine.");
        }}
      />
      <div className="sticky bottom-3 z-20 rounded-2xl border border-border bg-white/95 p-4 shadow-sm backdrop-blur">
        <p role="alert" className="mb-2 text-sm text-red-700">
          {error}
        </p>
        <Button
          disabled={pending}
          onClick={() => {
            const parsed = routineSchema.safeParse(document);
            if (!parsed.success) {
              setError(validationMessage(parsed.error));
              return;
            }
            setError("");
            startTransition(async () => {
              try {
                const result = await saveRoutineAction(parsed.data);
                if (!result.success) {
                  setError(result.error);
                  return;
                }
                onClose();
              } catch {
                setError(
                  "Could not confirm the save. Your edits are still here. Check your connection and retry.",
                );
              }
            });
          }}
        >
          {pending ? "Saving…" : "Save routine"}
        </Button>
      </div>
    </fieldset>
  );
}
