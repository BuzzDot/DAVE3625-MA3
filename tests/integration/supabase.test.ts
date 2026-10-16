import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/lib/supabase/database.types";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const email = process.env.FORM_TEST_EMAIL;
const password = process.env.FORM_TEST_PASSWORD;
const otherEmail = process.env.FORM_TEST_OTHER_EMAIL;
const otherPassword = process.env.FORM_TEST_OTHER_PASSWORD;
const available = Boolean(
  url && key && email && password && otherEmail && otherPassword,
);
const client = () =>
  createClient<Database>(url!, key!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

test(
  "real Supabase Auth/API persistence, snapshots, favorites and two-user RLS isolation",
  {
    skip: !available
      ? "Requires configured Supabase and two confirmed test accounts."
      : false,
  },
  async () => {
    const alice = client(),
      bob = client();
    const fresh = client();
    const a = await alice.auth.signInWithPassword({
      email: email!,
      password: password!,
    });
    assert.ifError(a.error);
    assert.ok(a.data.user);
    const b = await bob.auth.signInWithPassword({
      email: otherEmail!,
      password: otherPassword!,
    });
    assert.ifError(b.error);
    assert.ok(b.data.user);
    assert.notEqual(
      a.data.user.id,
      b.data.user.id,
      "Use two distinct test accounts",
    );
    const id = randomUUID();
    const routineId = randomUUID();
    let customId: string | undefined;
    try {
      const custom = await alice
        .from("exercises")
        .insert({
          owner_id: a.data.user.id,
          name: `Integration press ${id}`,
          muscle_group: "Chest",
          equipment: "Barbell",
        })
        .select("id")
        .single();
      assert.ifError(custom.error);
      customId = custom.data!.id;
      const ex = {
        id: randomUUID(),
        exerciseId: customId,
        name: "Untrusted display name",
        trackingType: "reps_weight",
        notes: "",
        sets: [
          {
            id: randomUUID(),
            reps: 8,
            weight: 60,
            rpe: 8,
            rir: 2,
            setType: "working",
            notes: "",
            completedAt: new Date(Date.now() - 30000).toISOString(),
          },
        ],
      };
      const routine = {
        id: routineId,
        revision: 0,
        name: `Integration routine ${id}`,
        notes: "",
        exercises: [ex],
      };
      assert.ifError(
        (await alice.rpc("save_strength_routine", { p_document: routine }))
          .error,
      );
      assert.ifError(
        (
          await alice
            .from("exercise_favorites")
            .insert({ owner_id: a.data.user.id, exercise_id: customId })
        ).error,
      );
      const document = {
        id,
        revision: 0,
        routineId,
        timezone: "Europe/Oslo",
        name: `Integration workout ${id}`,
        notes: "",
        startedAt: new Date(Date.now() - 60000).toISOString(),
        completedAt: new Date().toISOString(),
        exercises: [ex],
      };
      assert.ifError(
        (await alice.rpc("save_strength_workout", { p_document: document }))
          .error,
      );
      const hidden = await bob
        .from("workout_sessions")
        .select("id")
        .eq("id", id);
      assert.ifError(hidden.error);
      assert.deepEqual(hidden.data, []);
      const mutation = await bob
        .from("workout_sessions")
        .update({ notes: "unauthorized" })
        .eq("id", id)
        .select("id");
      assert.ifError(mutation.error);
      assert.deepEqual(mutation.data, []);
      const forged = await bob.rpc("save_strength_workout", {
        p_document: { ...document, revision: 1 },
      });
      assert.equal(forged.error?.code, "PT409", JSON.stringify(forged.error));
      const leaked = await bob
        .from("exercise_favorites")
        .select("exercise_id")
        .eq("exercise_id", customId);
      assert.ifError(leaked.error);
      assert.deepEqual(leaked.data, []);
      assert.ifError(
        (
          await alice.rpc("save_strength_routine", {
            p_document: {
              ...routine,
              revision: 1,
              name: "Later template title",
            },
          })
        ).error,
      );
      assert.ifError(
        (
          await alice
            .from("exercises")
            .update({ name: "Later catalog name" })
            .eq("id", customId)
        ).error,
      );
      assert.ifError(
        (
          await fresh.auth.signInWithPassword({
            email: email!,
            password: password!,
          })
        ).error,
      );
      const record = await fresh
        .from("workout_sessions")
        .select("title_snapshot,revision")
        .eq("id", id)
        .single();
      assert.ifError(record.error);
      assert.equal(record.data!.title_snapshot, document.name);
      const snapshot = await fresh
        .from("session_exercises")
        .select("id,name_snapshot")
        .eq("session_id", id)
        .single();
      assert.ifError(snapshot.error);
      assert.equal(snapshot.data!.name_snapshot, `Integration press ${id}`);
      const stored = await fresh
        .from("workout_sets")
        .select("reps,weight_kg")
        .eq("session_exercise_id", snapshot.data!.id)
        .single();
      assert.ifError(stored.error);
      assert.equal(stored.data!.reps, 8);
      assert.equal(Number(stored.data!.weight_kg), 60);
      assert.ifError((await fresh.auth.refreshSession()).error);
      const deniedDelete = await bob.rpc("delete_strength_workout", {
        p_id: id,
        p_revision: 1,
      });
      assert.equal(deniedDelete.error?.code, "PT409");
      const edited = {
        ...document,
        revision: 1,
        exercises: [{ ...ex, sets: [{ ...ex.sets[0], reps: 10, weight: 65 }] }],
      };
      assert.ifError(
        (await alice.rpc("save_strength_workout", { p_document: edited }))
          .error,
      );
      assert.equal(
        (
          await fresh
            .from("workout_sessions")
            .select("revision")
            .eq("id", id)
            .single()
        ).data?.revision,
        2,
      );
      const corrected = await fresh
        .from("workout_sets")
        .select("reps,weight_kg")
        .eq("session_exercise_id", ex.id)
        .single();
      assert.ifError(corrected.error);
      assert.equal(corrected.data!.reps, 10);
      assert.equal(Number(corrected.data!.weight_kg), 65);
      const stale = await alice.rpc("save_strength_workout", {
        p_document: edited,
      });
      assert.equal(stale.error?.code, "PT409");
      assert.ifError(
        (
          await alice.rpc("delete_strength_workout", {
            p_id: id,
            p_revision: 2,
          })
        ).error,
      );
      assert.deepEqual(
        (await fresh.from("workout_sessions").select("id").eq("id", id)).data,
        [],
      );
      assert.deepEqual(
        (
          await fresh
            .from("workout_sets")
            .select("id")
            .eq("session_exercise_id", ex.id)
        ).data,
        [],
      );
      const anonymous = client();
      assert.ok(
        (await anonymous.rpc("save_strength_workout", { p_document: document }))
          .error,
      );
    } finally {
      // Only exact records created by this test, using the creator's session.
      const saved = await alice
        .from("workout_sessions")
        .select("revision")
        .eq("id", id)
        .maybeSingle();
      if (saved.data)
        await alice.rpc("delete_strength_workout", {
          p_id: id,
          p_revision: saved.data.revision,
        });
      await alice.from("routines").delete().eq("id", routineId);
      if (customId) {
        await alice
          .from("exercise_favorites")
          .delete()
          .eq("exercise_id", customId);
        await alice.from("exercises").delete().eq("id", customId);
      }
      await Promise.all([
        alice.auth.signOut({ scope: "local" }),
        bob.auth.signOut({ scope: "local" }),
        fresh.auth.signOut({ scope: "local" }),
      ]);
    }
  },
);
