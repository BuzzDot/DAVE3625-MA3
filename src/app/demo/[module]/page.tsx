import { notFound } from "next/navigation";
import { ModulePage } from "@/components/module-page";
import { Dashboard } from "@/components/dashboard";
export const dynamicParams = false;
export function generateStaticParams() {
  return [
    { module: "dashboard" },
    { module: "calendar" },
    { module: "workouts" },
    { module: "progress" },
    { module: "nutrition" },
  ];
}
export default async function Page({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const { module } = await params;
  if (
    !["dashboard", "calendar", "workouts", "progress", "nutrition"].includes(
      module,
    )
  )
    notFound();
  if (module === "dashboard") return <Dashboard />;
  return <ModulePage module={module} />;
}
