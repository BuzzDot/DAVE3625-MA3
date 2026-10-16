"use client";
import { Users, BookOpen, Heart, ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
export function Community() {
  return (
    <Card className="mx-auto max-w-3xl py-16 text-center">
      <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-secondary text-primary">
        <Users size={30} />
      </span>
      <p className="eyebrow mt-7">ON THE HORIZON</p>
      <h2 className="text-3xl font-semibold tracking-tight">
        A shared source of inspiration.
      </h2>
      <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">
        Discover thoughtful training programs and meal plans. Save what inspires
        you, then make an independent copy that fits your life.
      </p>
      <div className="mx-auto mt-10 grid max-w-xl gap-6 text-left sm:grid-cols-3">
        {[
          [
            BookOpen,
            "Creator programs",
            "Versioned templates with clear attribution.",
          ],
          [Heart, "Your favorites", "A personal collection of useful ideas."],
          [
            ShieldCheck,
            "Private by default",
            "Share deliberately. Keep your diary yours.",
          ],
        ].map(([Icon, title, description]) => {
          const I = Icon as typeof Heart;
          return (
            <div key={String(title)}>
              <I className="mb-3 text-primary" size={20} />
              <h3 className="text-xs font-semibold">{String(title)}</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {String(description)}
              </p>
            </div>
          );
        })}
      </div>
      <p className="mt-10 text-xs font-semibold text-primary">
        Planned · Publishing and copying are not available yet
      </p>
    </Card>
  );
}
