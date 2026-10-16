"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
export function ConfirmDelete({
  label,
  onConfirm,
  pending = false,
}: {
  label: string;
  onConfirm: () => void;
  pending?: boolean;
}) {
  const [confirm, setConfirm] = useState(false);
  return confirm ? (
    <span className="inline-flex flex-wrap items-center gap-2">
      <Button
        disabled={pending}
        className="bg-red-700 text-white hover:bg-red-800"
        onClick={onConfirm}
      >
        Confirm {label.toLowerCase()}
      </Button>
      <Button
        variant="ghost"
        disabled={pending}
        onClick={() => setConfirm(false)}
      >
        Keep it
      </Button>
    </span>
  ) : (
    <Button variant="ghost" disabled={pending} onClick={() => setConfirm(true)}>
      {label}
    </Button>
  );
}
