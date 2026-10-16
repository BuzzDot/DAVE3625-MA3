"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Star } from "lucide-react";
import {
  createExerciseAction,
  favoriteExerciseAction,
} from "@/app/workouts/actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Exercise } from "@/lib/training/types";
export function ExerciseLibrary({
  exercises,
  onAdd,
}: {
  exercises: Exercise[];
  onAdd?: (exercise: Exercise) => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState("");
  const [equipment, setEquipment] = useState("");
  const [favorites, setFavorites] = useState(false);
  const [create, setCreate] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const filtered = exercises.filter(
    (e) =>
      !e.archived &&
      e.name.toLowerCase().includes(query.toLowerCase()) &&
      (!muscle || e.muscleGroup === muscle) &&
      (!equipment || e.equipment === equipment) &&
      (!favorites || e.favorite),
  );
  return (
    <Card>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Exercise library</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Stable exercise IDs keep your history together.
          </p>
        </div>
        <Button variant="outline" onClick={() => setCreate((v) => !v)}>
          <Plus size={16} />
          {create ? "Close new exercise" : "Create exercise"}
        </Button>
      </div>
      {create && (
        <form
          className="mb-6 grid gap-3 rounded-xl bg-muted p-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            startTransition(async () => {
              const result = await createExerciseAction({
                name: form.get("name"),
                muscleGroup: form.get("muscleGroup"),
                equipment: form.get("equipment"),
                trackingType: form.get("trackingType"),
              });
              if (!result.success) {
                setError(result.error);
                return;
              }
              setError("");
              setCreate(false);
              router.refresh();
            });
          }}
        >
          <label className="text-xs">
            Exercise name
            <input className="mt-1" name="name" required maxLength={200} />
          </label>
          <label className="text-xs">
            Muscle group
            <select className="mt-1" name="muscleGroup">
              {[
                "Chest",
                "Back",
                "Legs",
                "Shoulders",
                "Arms",
                "Core",
                "Full body",
              ].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label className="text-xs">
            Equipment
            <select className="mt-1" name="equipment">
              {[
                "Barbell",
                "Dumbbell",
                "Cable",
                "Machine",
                "Bodyweight",
                "Other",
              ].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label className="text-xs">
            Tracking
            <select className="mt-1" name="trackingType">
              <option value="reps_weight">Repetitions & external weight</option>
              <option value="reps">Repetitions / bodyweight</option>
            </select>
          </label>
          <Button type="submit" disabled={pending}>
            Save custom exercise
          </Button>
        </form>
      )}
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="relative">
          <span className="sr-only">Search exercises</span>
          <Search
            size={16}
            className="absolute left-3 top-3.5 text-muted-foreground"
          />
          <input
            className="pl-9"
            placeholder="Find an exercise…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <label>
          <span className="sr-only">Filter muscle group</span>
          <select value={muscle} onChange={(e) => setMuscle(e.target.value)}>
            <option value="">All muscle groups</option>
            {[...new Set(exercises.map((e) => e.muscleGroup))]
              .sort()
              .map((v) => (
                <option key={v}>{v}</option>
              ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Filter equipment</span>
          <select
            value={equipment}
            onChange={(e) => setEquipment(e.target.value)}
          >
            <option value="">All equipment</option>
            {[...new Set(exercises.map((e) => e.equipment))].sort().map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <Button
          variant={favorites ? "default" : "outline"}
          aria-pressed={favorites}
          onClick={() => setFavorites((v) => !v)}
        >
          <Star size={15} />
          Favorites
        </Button>
      </div>
      <p role="alert" className="my-3 text-sm text-red-700">
        {error}
      </p>
      <div className="max-h-[440px] divide-y divide-border overflow-y-auto">
        {filtered.map((exercise) => (
          <div key={exercise.id} className="flex items-center gap-3 py-3">
            <button
              className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border text-primary"
              aria-label={`${exercise.favorite ? "Unfavorite" : "Favorite"} ${exercise.name}`}
              aria-pressed={exercise.favorite}
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await favoriteExerciseAction(
                    exercise.id,
                    !exercise.favorite,
                  );
                  if (!result.success) setError(result.error);
                  else {
                    setError("");
                    router.refresh();
                  }
                })
              }
            >
              <Star
                size={17}
                fill={exercise.favorite ? "currentColor" : "none"}
              />
            </button>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-medium">{exercise.name}</h3>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {exercise.muscleGroup} · {exercise.equipment}
                {exercise.custom ? " · Yours" : ""}
              </p>
            </div>
            {onAdd && (
              <Button
                variant="outline"
                aria-label={`Add ${exercise.name}`}
                onClick={() => onAdd(exercise)}
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Add</span>
              </Button>
            )}
          </div>
        ))}
        {!filtered.length && (
          <p className="py-8 text-sm text-muted-foreground">
            No exercises match. Adjust the filters or create your own.
          </p>
        )}
      </div>
      <p className="mt-4 text-[11px] text-muted-foreground">
        Dumbbell weight means the entered load, used consistently. Bodyweight
        exercises do not produce external-load PRs.
      </p>
    </Card>
  );
}
