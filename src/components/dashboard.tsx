"use client";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronRight,
  Droplets,
  Dumbbell,
  Flame,
  Footprints,
  Moon,
  Plus,
  Sprout,
  Trophy,
} from "lucide-react";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActivityChart } from "@/components/charts";
import { meals } from "@/lib/demo/data";
import { PageHeading, SectionTitle } from "@/components/page-heading";
export function Dashboard() {
  const [water, setWater] = useState(1.5);
  return (
    <>
      <PageHeading
        eyebrow="FRIDAY, OCTOBER 16, 2026 · DEMO DAY"
        title="A good day to feel good."
        description="Welcome back, Jamie. Let’s build on your momentum."
      >
        <Button asChild variant="outline">
          <Link href="/calendar">
            <CalendarDays size={16} />
            Your calendar
          </Link>
        </Button>
        <Button asChild>
          <Link href="/workouts">
            <Plus size={17} />
            Log a workout
          </Link>
        </Button>
      </PageHeading>
      <div className="hero-card">
        <div className="relative z-10 max-w-lg">
          <span className="hero-label">
            <span className="h-1.5 w-1.5 rounded-full bg-[#b8c7a2]" />
            CONSISTENCY OVER PERFECTION
          </span>
          <h2 className="mt-5 text-[29px] font-medium leading-tight tracking-tight sm:text-[35px]">
            Show up for yourself.
            <br />
            The progress will follow.
          </h2>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-[#d2dbcc]">
            You’ve made time for 3 workouts this week.
            <br className="hidden sm:block" /> One more step toward a stronger
            you.
          </p>
          <Link
            href="/workouts"
            className="mt-6 inline-flex items-center gap-3 text-sm font-semibold text-white"
          >
            Let’s get moving <ArrowRight size={17} />
          </Link>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="orbit orbit-three" />
          <Sprout size={125} strokeWidth={0.7} />
          <span className="hero-art-label">GROW AT YOUR OWN PACE</span>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5">
        {[
          {
            label: "Workouts this week",
            value: "3",
            unit: "/ 4 planned",
            Icon: Dumbbell,
            tone: "sage",
            note: "One more. You’ve got this.",
            change: "+1 from last week",
          },
          {
            label: "Daily nutrition",
            value: "1,840",
            unit: "/ 2,200 kcal",
            Icon: Flame,
            tone: "peach",
            note: "360 kcal remaining",
            change: "84% of daily goal",
          },
          {
            label: "Daily steps",
            value: "7,240",
            unit: "/ 10,000",
            Icon: Footprints,
            tone: "lavender",
            note: "A little walk goes a long way.",
            change: "72% of daily goal",
          },
          {
            label: "Last night’s sleep",
            value: "7.5",
            unit: "hours",
            Icon: Moon,
            tone: "sand",
            note: "Rest is part of the work.",
            change: "+30 min from yesterday",
          },
        ].map(({ label, value, unit, Icon, tone, note, change }) => (
          <Card key={label} className="stat-card">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">
                {label}
              </p>
              <span className={`icon-tile ${tone}`}>
                <Icon size={17} />
              </span>
            </div>
            <div className="mb-3 mt-4 flex flex-wrap items-baseline gap-2">
              <strong className="text-[28px] font-semibold tracking-tight">
                {value}
              </strong>
              <span className="text-[11px] text-muted-foreground">{unit}</span>
            </div>
            <p className="text-[11px] font-medium text-primary">{change}</p>
            <p className="mt-1 text-[10px] text-muted-foreground">{note}</p>
          </Card>
        ))}
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <SectionTitle
            title="Your training rhythm"
            href="/progress"
            label="Explore progress"
          />
          <div className="mb-3 flex items-end justify-between">
            <div>
              <span className="text-[30px] font-semibold tracking-tight">
                22,500
              </span>
              <span className="ml-2 text-xs text-muted-foreground">
                kg total volume
              </span>
            </div>
            <span className="rounded-md bg-secondary px-2 py-1 text-[10px] font-medium text-primary">
              ↑ 12.4% this week
            </span>
          </div>
          <ActivityChart />
          <div className="mt-3 flex items-center gap-2 border-t border-border pt-4 text-[11px] text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-primary" />
            Training volume <span className="ml-auto">Oct 12 – 18 · Demo</span>
          </div>
        </Card>
        <Card>
          <SectionTitle title="Up next" href="/calendar" />
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            TODAY · 17:00
          </div>
          <div className="mt-4 rounded-xl bg-[#f2f4ed] p-5">
            <span className="text-[9px] font-semibold tracking-[.14em] text-primary">
              YOUR ROUTINE
            </span>
            <div className="mt-3 flex items-center justify-between">
              <h3 className="max-w-44 text-xl font-semibold leading-snug">
                Upper body
                <br />
                strength
              </h3>
              <Dumbbell size={36} strokeWidth={1.2} className="text-primary" />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              6 exercises <span className="px-2">·</span> About 55 min
            </p>
            <Button className="mt-5 w-full" asChild>
              <Link href="/workouts?routine=upper">
                Preview workout <ArrowRight size={15} />
              </Link>
            </Button>
          </div>
          <p className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground">
            <Check size={14} className="text-primary" />
            Your last session: Oct 12 · 52 min
          </p>
        </Card>
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <SectionTitle
            title="On the menu today"
            href="/nutrition"
            label="Nutrition diary"
          />
          <div className="divide-y divide-border">
            {meals.slice(0, 3).map((meal) => (
              <Link
                href="/nutrition"
                key={meal.name}
                className="flex items-center gap-3 py-3 first:pt-0"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted text-xl">
                  {meal.icon}
                </span>
                <div className="min-w-0">
                  <h3 className="text-xs font-semibold sm:text-sm">
                    {meal.name}
                  </h3>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {meal.time}
                  </p>
                </div>
                <span className="ml-auto shrink-0 text-xs font-medium">
                  {meal.calories}
                  <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                    kcal
                  </span>
                </span>
                <ChevronRight size={14} className="text-muted-foreground" />
              </Link>
            ))}
          </div>
        </Card>
        <div className="grid gap-5">
          <Card>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Droplets size={17} className="text-[#7294aa]" />
                <h2 className="text-sm font-semibold">A moment to hydrate</h2>
              </div>
              <span className="text-xs">
                <strong>{water.toFixed(2).replace(/0$/, "")}</strong>
                <span className="text-muted-foreground"> / 2.5 L</span>
              </span>
            </div>
            <div
              className="my-4 flex gap-2"
              aria-label={`${water} of 2.5 liters in demo`}
            >
              {Array.from({ length: 10 }, (_, i) => (
                <span
                  key={i}
                  className={`h-6 flex-1 rounded-md ${i < water * 4 ? "bg-[#b8d0dc]" : "bg-[#edf2f4]"}`}
                />
              ))}
            </div>
            <button
              className="flex min-h-9 items-center gap-1 text-xs font-medium text-[#587e95] disabled:opacity-50"
              disabled={water >= 2.5}
              onClick={() => setWater((v) => Math.min(2.5, v + 0.25))}
            >
              <Plus size={14} />
              {water >= 2.5 ? "Demo goal reached" : "Add 250 ml · preview only"}
            </button>
            <span className="sr-only" aria-live="polite">
              {water} liters in demo
            </span>
          </Card>
          <div className="flex items-start gap-4 rounded-2xl border border-[#e9e5d7] bg-[#f6f3e9] p-5">
            <Trophy size={25} className="shrink-0 text-[#a48d50]" />
            <div>
              <p className="text-sm font-semibold">Stronger than last time.</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                A new bench press best:{" "}
                <strong className="text-foreground">60 kg × 8</strong>. Small
                wins add up.
              </p>
              <Link
                href="/progress"
                className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[#8f7944]"
              >
                View demo records <ArrowUpRight size={12} />
              </Link>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-6 flex items-center gap-3 text-xs text-muted-foreground">
        <ArrowDown size={14} />
        <span>Every entry is a step forward. This is your space to grow.</span>
      </div>
    </>
  );
}
