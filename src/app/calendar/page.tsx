import { CalendarContent } from "@/components/diary/pages";
import { PrivateBoundary } from "@/components/training/private-boundary";
import { z } from "zod";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const date = z.iso.date().safeParse(params.date);
  return (
    <PrivateBoundary>
      <CalendarContent date={date.success ? date.data : undefined} />
    </PrivateBoundary>
  );
}
