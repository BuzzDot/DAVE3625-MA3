import { notFound } from "next/navigation";
import { z } from "zod";
import { PrivateBoundary } from "@/components/training/private-boundary";
import { loadTrainingData } from "@/lib/training/repository";
import { WorkoutLogger } from "@/components/training/workout-logger";
async function Content({ id }: { id: string }) {
  if (!z.uuid().safeParse(id).success) notFound();
  const data = await loadTrainingData();
  const workout = data.workouts.find((w) => w.id === id);
  if (!workout) notFound();
  return <WorkoutLogger key={workout.id} initial={workout} data={data} />;
}
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <PrivateBoundary>
      <Content id={id} />
    </PrivateBoundary>
  );
}
