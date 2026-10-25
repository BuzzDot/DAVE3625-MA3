import { CalendarContent } from "@/components/diary/pages";
import { PrivateBoundary } from "@/components/training/private-boundary";
import { z } from "zod";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    date?: string | string[];
    kind?: string | string[];
    template?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const date = z.iso.date().safeParse(params.date);
  const template = z.uuid().safeParse(params.template);
  return (
    <PrivateBoundary>
      <CalendarContent
        date={date.success ? date.data : undefined}
        initialKind={params.kind === "meal" ? "meal" : "workout"}
        initialTemplateId={template.success ? template.data : undefined}
      />
    </PrivateBoundary>
  );
}
