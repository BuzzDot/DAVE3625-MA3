"use client";
import { useState } from "react";
import Link from "next/link";
import { ExerciseEditor } from "./exercise-editor";
import { newSlot } from "@/lib/training/documents";
import { summarizeExercises } from "@/lib/training/calculations";
import { PageHeading } from "@/components/page-heading";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { demoStrengthExercises } from "@/lib/demo/strength";
const [bench, row] = demoStrengthExercises;
export function LoggerControlsDemo() {
  const [slots, setSlots] = useState(() => [newSlot(bench)]);
  const stats = summarizeExercises(slots);
  return (
    <>
      <PageHeading
        eyebrow="EXPLICIT DEMO · FICTIONAL DATA"
        title="Try the logging controls."
        description="These are the same exercise controls used in your private diary."
      />
      <Card className="mb-5">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Control preview only. Changes stay in memory and reset on refresh.
          Authentication, autosave, and persistent saves are not simulated here.{" "}
          <Link href="/workouts" className="text-primary underline">
            Open the private workout diary
          </Link>{" "}
          after configuring Supabase.
        </p>
        <p className="mt-4 text-xs text-primary" role="status">
          Preview working volume: {stats.volume.toLocaleString()} kg
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={slots.length >= 4}
            onClick={() => setSlots([...slots, newSlot(row)])}
          >
            Add demo row exercise
          </Button>
          <Button variant="ghost" onClick={() => setSlots([newSlot(bench)])}>
            Reset control preview
          </Button>
        </div>
      </Card>
      <ExerciseEditor slots={slots} onChange={setSlots} />
    </>
  );
}
