import { PrivateBoundary } from "@/components/training/private-boundary";
import { loadNutritionData } from "@/lib/nutrition/repository";
import { NutritionWorkspace } from "@/components/nutrition/workspace";
import { dateSchema } from "@/lib/nutrition/validation";
async function Content({ date }: { date?: string }) {
  const data = await loadNutritionData();
  return <NutritionWorkspace data={data} initialDate={date} />;
}
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const parsed = dateSchema.safeParse(date);
  return (
    <PrivateBoundary>
      <Content date={parsed.success ? parsed.data : undefined} />
    </PrivateBoundary>
  );
}
