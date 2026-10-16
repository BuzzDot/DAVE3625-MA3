"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { saveWorkoutAction } from "@/app/workouts/actions";
import { workoutSchema, validationMessage } from "@/lib/training/validation";
import type { WorkoutDocument } from "@/lib/training/types";
type Recovery = { document: WorkoutDocument; baseRevision: number };
export function useWorkoutDraft(initial: WorkoutDocument, userId: string) {
  const [document, setDocument] = useState(initial);
  const [status, setStatus] = useState("Saved to your account");
  const [error, setError] = useState("");
  const [recovery, setRecovery] = useState<Recovery | null>(null);
  const key = `form:workout:${userId}:${initial.id}`;
  const latest = useRef(initial);
  const revision = useRef(initial.revision);
  const saved = useRef(JSON.stringify(initial));
  const queue = useRef<Promise<void>>(Promise.resolve());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const conflict = useRef(false);
  const persist = useCallback(
    (finish = false): Promise<boolean> => {
      if (timer.current) clearTimeout(timer.current);
      const operation = queue.current.then(async () => {
        if (conflict.current) return false;
        const snapshot = structuredClone(latest.current);
        if (finish && !snapshot.completedAt)
          snapshot.completedAt = new Date().toISOString();
        const serialized = JSON.stringify(snapshot);
        if (!finish && serialized === saved.current) return true;
        const parsed = workoutSchema.safeParse({
          ...snapshot,
          revision: revision.current,
        });
        if (!parsed.success) {
          setError(validationMessage(parsed.error));
          setStatus(`Not saved — ${validationMessage(parsed.error)}`);
          return false;
        }
        setStatus("Saving…");
        setError("");
        try {
          const result = await saveWorkoutAction(parsed.data);
          if (!result.success) {
            conflict.current = Boolean(result.conflict);
            setError(result.error);
            setStatus("Not saved — your recovery copy stays on this device");
            return false;
          }
          revision.current = result.data.revision;
          saved.current = serialized;
          if (finish) {
            latest.current = snapshot;
            setDocument(snapshot);
          }
          const dirty = JSON.stringify(latest.current) !== serialized;
          setStatus(dirty ? "Unsaved changes" : "Saved to your account");
          try {
            if (dirty)
              localStorage.setItem(
                key,
                JSON.stringify({
                  document: latest.current,
                  baseRevision: revision.current,
                }),
              );
            else localStorage.removeItem(key);
          } catch {
            /* Storage may be disabled; server save still succeeded. */
          }
          return true;
        } catch {
          setError(
            "The connection was interrupted. Your workout has not been confirmed saved. Retry, or reload to check the server version.",
          );
          setStatus("Save interrupted");
          return false;
        }
      });
      queue.current = operation.then(
        () => undefined,
        () => undefined,
      );
      return operation;
    },
    [key],
  );
  useEffect(() => {
    latest.current = document;
    if (JSON.stringify(document) === saved.current) return;
    try {
      localStorage.setItem(
        key,
        JSON.stringify({ document, baseRevision: revision.current }),
      );
    } catch {
      /* Server autosave remains available. */
    }
    timer.current = setTimeout(() => void persist(), 1200);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [document, key, persist]);
  useEffect(() => {
    const read = setTimeout(() => {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return;
        const stored = JSON.parse(raw) as Recovery;
        const parsed = workoutSchema.safeParse(stored.document);
        if (
          parsed.success &&
          parsed.data.id === initial.id &&
          Number.isInteger(stored.baseRevision)
        )
          setRecovery({ ...stored, document: parsed.data });
      } catch {
        /* Ignore damaged device recovery; never submit it. */
      }
    }, 0);
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (JSON.stringify(latest.current) !== saved.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      clearTimeout(read);
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [key, initial.id]);
  function change(next: WorkoutDocument) {
    latest.current = next;
    setDocument(next);
    setStatus("Unsaved changes");
  }
  async function prepareDelete() {
    if (timer.current) clearTimeout(timer.current);
    await queue.current;
    return revision.current;
  }
  function restoreRecovery() {
    if (!recovery) return;
    const restored = { ...recovery.document, revision: initial.revision };
    conflict.current = false;
    revision.current = initial.revision;
    change(restored);
    setRecovery(null);
  }
  function discardRecovery() {
    try {
      localStorage.removeItem(key);
    } catch {}
    setRecovery(null);
  }
  return {
    document,
    change,
    status,
    error,
    persist,
    recovery,
    restoreRecovery,
    discardRecovery,
    prepareDelete,
  };
}
