"use client";
import { LockKeyhole } from "lucide-react";
import { Card } from "@/components/ui/card";
export function Settings() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <div className="mb-5 flex items-center gap-3">
          <LockKeyhole size={20} className="text-primary" />
          <h2 className="font-semibold">Account & privacy</h2>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          You’re exploring a fictional workspace. No account is signed in, and
          no personal health data is stored.
        </p>
        <dl className="mt-6 space-y-4 text-sm">
          {[
            ["Workspace", "Demo preview"],
            ["Authentication", "Not connected"],
            ["Persistence", "Not connected"],
            ["Privacy model", "Owner-only diary; explicit public programs"],
          ].map(([k, v]) => (
            <div
              key={k}
              className="flex flex-wrap justify-between gap-2 border-b border-border pb-3"
            >
              <dt className="text-muted-foreground">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </Card>
      <Card>
        <h2 className="mb-5 font-semibold">Preview preferences</h2>
        <p className="mb-5 text-sm leading-relaxed text-muted-foreground">
          The demo uses these conventions. Editable preferences and account
          management will arrive with authentication.
        </p>
        <dl className="space-y-4 text-sm">
          {[
            ["Units", "Metric · kg, cm, liters"],
            ["Nutrition", "kcal · grams of macronutrients"],
            ["Time zone", "Europe/Oslo"],
            ["First day of week", "Monday"],
            ["Preview date", "October 16, 2026"],
          ].map(([k, v]) => (
            <div
              key={k}
              className="flex flex-wrap justify-between gap-2 border-b border-border pb-3"
            >
              <dt className="text-muted-foreground">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  );
}
