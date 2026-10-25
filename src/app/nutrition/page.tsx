import { PrivateBoundary } from "@/components/training/private-boundary";
import { loadNutritionData } from "@/lib/nutrition/repository";
import { NutritionWorkspace } from "@/components/nutrition/workspace";
import { dateSchema } from "@/lib/nutrition/validation";
async function Content({
  date,
  savedMeals,
}: {
  date?: string;
  savedMeals: boolean;
}) {
  const data = await loadNutritionData();
  return (
    <NutritionWorkspace
      key={`${date ?? data.today}-${savedMeals}`}
      data={data}
      initialDate={date}
      initialTab={savedMeals ? "Saved meals" : "Diary"}
    />
  );
}
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ date?: string | string[]; view?: string | string[] }>;
}) {
  const { date, view } = await searchParams;
  const parsed = dateSchema.safeParse(date);
  return (
    <PrivateBoundary>
      <Content
        date={parsed.success ? parsed.data : undefined}
        savedMeals={view === "meals"}
      />
    </PrivateBoundary>
  );
}
