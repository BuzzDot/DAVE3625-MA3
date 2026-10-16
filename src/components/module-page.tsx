"use client";
import { PageHeading } from "@/components/page-heading";
import { Workouts } from "@/components/modules/workouts";
import { Nutrition } from "@/components/modules/nutrition";
import { Calendar } from "@/components/modules/calendar";
import { Progress } from "@/components/modules/progress";
import { Community } from "@/components/modules/community";
import { Settings } from "@/components/modules/settings";
const headings: Record<string, [string, string, string]> = {
  workouts: [
    "MOVE WITH INTENTION",
    "Your next strong chapter.",
    "Your routines, your pace. Make every rep count.",
  ],
  nutrition: [
    "FUEL YOUR EVERYDAY",
    "Good food. Good energy.",
    "A little awareness goes a long way.",
  ],
  calendar: [
    "MAKE TIME FOR YOU",
    "A little structure. A lot of possibility.",
    "Give your good habits a place in your week.",
  ],
  progress: [
    "LOOK HOW FAR YOU’VE COME",
    "Small steps, real progress.",
    "Find the patterns behind your everyday effort.",
  ],
  community: [
    "STRONGER, TOGETHER",
    "Good things grow together.",
    "A future space for shared ideas and fresh inspiration.",
  ],
  settings: [
    "YOUR SPACE, YOUR WAY",
    "Make yourself at home.",
    "A clear view of your workspace and what’s coming next.",
  ],
};
function DemoNotice() {
  return (
    <p className="mb-6 rounded-xl border border-border bg-white px-4 py-3 text-xs leading-relaxed text-muted-foreground">
      <strong className="text-primary">Interactive demo.</strong> All records
      are fictional. Changes stay in memory and reset when you leave or refresh.
      This preview does not write to the database. Your private workout diary is
      a separate, authenticated module.
    </p>
  );
}
export function ModulePage({ module }: { module: string }) {
  const [eyebrow, title, description] = headings[module];
  return (
    <>
      <PageHeading eyebrow={eyebrow} title={title} description={description} />
      <DemoNotice />
      {module === "workouts" ? (
        <Workouts />
      ) : module === "nutrition" ? (
        <Nutrition />
      ) : module === "calendar" ? (
        <Calendar />
      ) : module === "progress" ? (
        <Progress />
      ) : module === "community" ? (
        <Community />
      ) : (
        <Settings />
      )}
    </>
  );
}
