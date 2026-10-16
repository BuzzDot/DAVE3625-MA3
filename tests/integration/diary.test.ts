import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/lib/supabase/database.types";
const available = Boolean(
  process.env.FORM_TEST_EMAIL && process.env.FORM_TEST_OTHER_EMAIL,
);
test(
  "hosted health persistence, goal periods, calendar recurrence and two-user RLS",
  { skip: !available ? "Requires two confirmed dedicated accounts" : false },
  async () => {
    const make = () =>
      createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } },
      );
    const a = make(),
      b = make(),
      fresh = make();
    const observation = randomUUID(),
      routine = randomUUID(),
      rule = randomUUID();
    let uid: string | undefined;
    try {
      const login = await a.auth.signInWithPassword({
        email: process.env.FORM_TEST_EMAIL!,
        password: process.env.FORM_TEST_PASSWORD!,
      });
      assert.ifError(login.error);
      uid = login.data.user!.id;
      assert.ifError(
        (
          await b.auth.signInWithPassword({
            email: process.env.FORM_TEST_OTHER_EMAIL!,
            password: process.env.FORM_TEST_OTHER_PASSWORD!,
          })
        ).error,
      );
      assert.ifError(
        (
          await a.from("health_observations").insert({
            id: observation,
            owner_id: uid,
            metric_code: "water",
            value: 250,
            local_date: "2027-02-01",
            observed_at: "2027-02-01T11:00:00Z",
            timezone: "Europe/Oslo",
            notes: "Hosted persistence",
          })
        ).error,
      );
      assert.equal(
        (await b.from("health_observations").select("id").eq("id", observation))
          .data?.length,
        0,
      );
      assert.ok(
        (
          await b.from("health_observations").insert({
            owner_id: uid,
            metric_code: "water",
            value: 200,
            local_date: "2027-02-01",
            observed_at: "2027-02-01T11:00:00Z",
            timezone: "Europe/Oslo",
          })
        ).error,
      );
      assert.ifError(
        (
          await a
            .from("health_observations")
            .update({ value: 500 })
            .eq("id", observation)
            .eq("revision", 1)
        ).error,
      );
      assert.ifError(
        (
          await fresh.auth.signInWithPassword({
            email: process.env.FORM_TEST_EMAIL!,
            password: process.env.FORM_TEST_PASSWORD!,
          })
        ).error,
      );
      const saved = await fresh
        .from("health_observations")
        .select("*")
        .eq("id", observation)
        .single();
      assert.ifError(saved.error);
      assert.equal(saved.data!.value, 500);
      assert.equal(saved.data!.revision, 2);
      assert.ifError(
        (
          await a.rpc("set_health_goal", {
            p_metric: "water",
            p_date: "2027-02-01",
            p_target: 2000,
          })
        ).error,
      );
      assert.ifError(
        (
          await a.rpc("set_health_goal", {
            p_metric: "water",
            p_date: "2027-02-10",
            p_target: 2500,
          })
        ).error,
      );
      const g = await a
        .from("health_goals")
        .select("ends_on")
        .eq("metric_code", "water")
        .eq("starts_on", "2027-02-01")
        .single();
      assert.equal(g.data?.ends_on, "2027-02-09");
      const ex = await a
        .from("exercises")
        .select("id")
        .is("owner_id", null)
        .eq("tracking_type", "reps_weight")
        .order("id")
        .limit(1)
        .single();
      assert.ifError(ex.error);
      assert.ifError(
        (
          await a.rpc("save_strength_routine", {
            p_document: {
              id: routine,
              revision: 0,
              name: `Hosted calendar ${routine}`,
              notes: "",
              exercises: [
                {
                  exerciseId: ex.data!.id,
                  notes: "",
                  sets: [
                    {
                      reps: 8,
                      weight: 40,
                      setType: "working",
                      notes: "",
                      rpe: null,
                      rir: null,
                    },
                  ],
                },
              ],
            },
          })
        ).error,
      );
      const doc = {
        id: rule,
        kind: "workout",
        templateId: routine,
        timezone: "Europe/Oslo",
        start: "2027-03-21",
        end: "2027-04-04",
        time: "09:00",
        recurring: true,
        weekdays: [0],
        count: 3,
      };
      assert.ifError(
        (await a.rpc("create_schedule", { p_document: doc })).error,
      );
      assert.ifError(
        (await a.rpc("create_schedule", { p_document: doc })).error,
      );
      const planned = await fresh
        .from("scheduled_activities")
        .select("*")
        .eq("rule_id", rule)
        .order("occurrence_date");
      assert.ifError(planned.error);
      assert.equal(planned.data!.length, 3);
      assert.equal(new Date(planned.data![0].scheduled_at).getUTCHours(), 8);
      assert.equal(new Date(planned.data![1].scheduled_at).getUTCHours(), 7);
      assert.equal(
        (await b.from("scheduled_activities").select("id").eq("rule_id", rule))
          .data?.length,
        0,
      );
      assert.ok(
        (await b.rpc("start_scheduled_workout", { p_id: planned.data![0].id }))
          .error,
      );
      const edit = await a.rpc("edit_schedule", {
        p_id: planned.data![0].id,
        p_revision: 1,
        p_date: "2027-03-22",
        p_time: "10:00",
        p_status: "planned",
        p_title: "Single exception",
        p_notes: "",
        p_future: false,
      });
      assert.ifError(edit.error);
      assert.equal(
        (
          await fresh
            .from("scheduled_activities")
            .select("is_exception")
            .eq("id", planned.data![0].id)
            .single()
        ).data?.is_exception,
        true,
      );
    } finally {
      if (uid) {
        await a.from("scheduled_activities").delete().eq("rule_id", rule);
        await a.from("schedule_rules").delete().eq("id", rule);
        await a.from("routines").delete().eq("id", routine);
        await a.from("health_observations").delete().eq("id", observation);
        await a
          .from("health_goals")
          .delete()
          .eq("metric_code", "water")
          .in("starts_on", ["2027-02-01", "2027-02-10"]);
      }
      await Promise.all([
        a.auth.signOut({ scope: "local" }),
        b.auth.signOut({ scope: "local" }),
        fresh.auth.signOut({ scope: "local" }),
      ]);
    }
  },
);
