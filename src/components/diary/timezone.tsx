"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { saveTimezone } from "@/app/settings/actions";
import { useHydrated } from "@/lib/use-hydrated";
export function TimezoneForm({ timezone }: { timezone: string }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState("");
  return (
    <form
      className="my-5 max-w-md"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        start(async () => {
          const r = await saveTimezone(f.get("timezone"));
          setMessage(
            r.success
              ? "Timezone saved. Existing records retain their original dates and timezone."
              : r.error,
          );
          if (r.success) router.refresh();
        });
      }}
    >
      <fieldset disabled={pending || !hydrated} className="space-y-3">
        <label>
          Diary timezone
          <input
            name="timezone"
            required
            maxLength={100}
            defaultValue={timezone}
            placeholder="Europe/Oslo"
          />
        </label>
        <p className="text-xs text-muted-foreground">
          Use an IANA name such as Europe/Oslo or America/New_York. New plans
          and daily logs use this timezone. Existing records keep theirs.
        </p>
        <Button>{pending ? "Saving…" : "Save timezone"}</Button>
      </fieldset>
      <p role="status" className="mt-3 text-sm">
        {message}
      </p>
    </form>
  );
}
