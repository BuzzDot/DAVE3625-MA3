"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { scheduled } from "@/lib/demo/data";
import { Card } from "@/components/ui/card";
export function Calendar() {
  const [month, setMonth] = useState(9);
  const [selected, setSelected] = useState("2026-10-16");
  const year = 2026 + Math.floor(month / 12);
  const m = ((month % 12) + 12) % 12;
  const count = new Date(Date.UTC(year, m + 1, 0)).getUTCDate();
  const offset = (new Date(Date.UTC(year, m, 1)).getUTCDay() + 6) % 7;
  const label = new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, m, 1)));
  const events = scheduled.filter((e) => e.date === selected);
  return (
    <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
      <Card>
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{label}</h2>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              aria-label="Previous month"
              onClick={() => setMonth((v) => v - 1)}
            >
              <ChevronLeft size={18} />
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setMonth(9);
                setSelected("2026-10-16");
              }}
            >
              Demo day
            </Button>
            <Button
              variant="ghost"
              aria-label="Next month"
              onClick={() => setMonth((v) => v + 1)}
            >
              <ChevronRight size={18} />
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div
              key={d}
              className="pb-3 text-center text-[10px] text-muted-foreground"
            >
              {d}
            </div>
          ))}
          {Array.from({ length: offset }, (_, i) => (
            <div key={`blank-${i}`} />
          ))}
          {Array.from({ length: count }, (_, i) => {
            const date = `${year}-${String(m + 1).padStart(2, "0")}-${String(i + 1).padStart(2, "0")}`;
            const hasEvent = scheduled.some((e) => e.date === date);
            return (
              <button
                key={date}
                aria-label={`${date}${hasEvent ? ", has planned activity" : ""}`}
                aria-pressed={selected === date}
                onClick={() => setSelected(date)}
                className={`flex min-h-14 flex-col items-center justify-center gap-2 rounded-xl border text-xs sm:min-h-20 ${selected === date ? "border-primary bg-primary text-white" : "border-border hover:bg-muted"}`}
              >
                {i + 1}
                <span
                  className={`h-1 w-1 rounded-full ${hasEvent ? (selected === date ? "bg-white" : "bg-primary") : "bg-transparent"}`}
                />
              </button>
            );
          })}
        </div>
        <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          Workout or meal activity
        </p>
      </Card>
      <Card>
        <p className="eyebrow">YOUR DAY</p>
        <h2 className="mb-6 text-lg font-semibold">
          {new Intl.DateTimeFormat("en", {
            weekday: "long",
            month: "short",
            day: "numeric",
            timeZone: "UTC",
          }).format(new Date(`${selected}T12:00:00Z`))}
        </h2>
        {events.length ? (
          events.map((e) => (
            <div key={e.title} className="mb-4 rounded-xl bg-muted p-4">
              <p className="text-[10px] font-medium uppercase text-primary">
                {e.kind} · {e.time}
              </p>
              <h3 className="my-3 font-semibold">{e.title}</h3>
              <span className="text-xs text-muted-foreground">
                {e.status} · Demo activity
              </span>
            </div>
          ))
        ) : (
          <div className="rounded-xl bg-muted p-5">
            <p className="text-sm font-medium">A little breathing room.</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              No demo activities scheduled for this date.
            </p>
          </div>
        )}
        <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
          Scheduling, recurring plans, and linking completed records are
          planned. Browsing dates is available in this preview.
        </p>
      </Card>
    </div>
  );
}
