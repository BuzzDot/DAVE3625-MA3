import { PrivateBoundary } from "@/components/training/private-boundary";
import { loadTrainingData } from "@/lib/training/repository";
import { TrainingWorkspace } from "@/components/training/workspace";
import { dateSchema } from "@/lib/nutrition/validation";
async function Content({ date }: { date?: string }) {
  return (
    <TrainingWorkspace data={await loadTrainingData()} planningDate={date} />
  );
}
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ date?: string | string[] }>;
}) {
  const date = dateSchema.safeParse((await searchParams).date);
  return (
    <PrivateBoundary>
      <Content date={date.success ? date.data : undefined} />
    </PrivateBoundary>
  );
}
