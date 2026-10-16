import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";
import { randomUUID } from "node:crypto";

let nativeClient;
const nativeUrl = process.env.DATABASE_TEST_URL;
if (nativeUrl && new URL(nativeUrl).pathname !== "/form_test")
  throw new Error("Database tests require the isolated form_test database.");
async function connectNative() {
  nativeClient = new pg.Client({ connectionString: nativeUrl });
  await nativeClient.connect();
}
const db = nativeUrl
  ? {
      async query(sql, args) {
        return nativeClient.query(sql, args);
      },
      async exec(sql) {
        return nativeClient.query(sql);
      },
      async close() {
        return nativeClient.end();
      },
    }
  : new PGlite();
const alice = "11111111-1111-4111-8111-111111111111";
const bob = "22222222-2222-4222-8222-222222222222";
let exercise, food, routine, session, version;
async function asUser(id) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [
    id ?? "",
  ]);
  await db.exec(id ? "set role authenticated" : "set role anon");
}
async function row(sql, params = []) {
  return (await db.query(sql, params)).rows[0];
}
before(async () => {
  if (nativeUrl) await connectNative();
  // Supabase's auth surface only; application migrations run unchanged.
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public, auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;`);
  // Match hosted Supabase's defaults, so later CREATE TABLE migrations cannot
  // accidentally retain privileges that a bare PostgreSQL cluster never grants.
  await db.exec(
    "alter default privileges in schema public grant all on tables to anon, authenticated",
  );
  await db.query("insert into auth.users values ($1), ($2)", [alice, bob]);
  for (const filename of (await readdir("supabase/migrations"))
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    if (filename === "202610160006_nutrition.sql")
      await db.query(
        "insert into public.nutrition_entries(id,owner_id,logged_at,local_date,meal_slot,name_snapshot,quantity,unit_snapshot,kcal_snapshot,protein_snapshot,carbs_snapshot,fat_snapshot) values('ab000000-0000-4000-8000-000000000001',$1,'2026-10-16T12:00:00Z','2026-10-16','lunch','Legacy manual entry',1,'plate',500,20,50,10)",
        [alice],
      );
    await db.exec(await readFile(`supabase/migrations/${filename}`, "utf8"));
  }
  await asUser(alice);
  exercise = (
    await row(
      "insert into public.exercises(owner_id,name,muscle_group) values ($1,'Bench press','chest') returning id",
      [alice],
    )
  ).id;
  food = (
    await row(
      "insert into public.foods(owner_id,name,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g) values ($1,'Oats',380,13,68,7) returning id",
      [alice],
    )
  ).id;
  routine = (
    await row(
      "insert into public.routines(owner_id,name) values ($1,'Upper body') returning id",
      [alice],
    )
  ).id;
  session = (
    await row(
      "insert into public.workout_sessions(owner_id,title_snapshot,started_at) values ($1,'Upper body',now()) returning id",
      [alice],
    )
  ).id;
});
after(async () => {
  await db.close();
});

test("health diary persists corrections, intervals, metadata and dated goals with two-user isolation", async () => {
  await asUser(alice);
  const observation = await row(
    "insert into public.health_observations(owner_id,metric_code,value,observed_at,local_date,timezone,started_at,ended_at,quality,notes) values($1,'sleep',480,'2026-10-16T06:00Z','2026-10-16','Europe/Oslo','2026-10-15T22:00Z','2026-10-16T06:00Z',4,'Rested') returning *",
    [alice],
  );
  assert.equal(Number(observation.value), 480);
  await assert.rejects(
    db.query("update public.health_observations set value=400 where id=$1", [
      observation.id,
    ]),
    /disagree/,
  );
  await db.query(
    "update public.health_observations set notes='Corrected' where id=$1",
    [observation.id],
  );
  assert.equal(
    (
      await row("select revision from public.health_observations where id=$1", [
        observation.id,
      ])
    ).revision,
    2,
  );
  await assert.rejects(
    db.query(
      "insert into public.health_observations(owner_id,metric_code,value,observed_at,local_date,timezone) values($1,'steps',1.5,'2026-10-16T12:00Z','2026-10-16','Europe/Oslo')",
      [alice],
    ),
  );
  await db.query("select public.set_health_goal('water','2026-10-01',2000)");
  await db.query("select public.set_health_goal('water','2026-10-20',3000)");
  await db.query("select public.set_health_goal('water','2026-10-10',2500)");
  assert.equal(
    String(
      (
        await row(
          "select ends_on::text from public.health_goals where metric_code='water' and starts_on='2026-10-01'",
        )
      ).ends_on,
    ),
    "2026-10-09",
  );
  await assert.rejects(
    db.query(
      "insert into public.health_goals(owner_id,metric_code,target,starts_on) values($1,'water',1000,'2026-10-12')",
      [alice],
    ),
    /overlapping/,
  );
  await asUser(bob);
  assert.equal(
    (
      await db.query("select * from public.health_observations where id=$1", [
        observation.id,
      ])
    ).rows.length,
    0,
  );
  assert.equal(
    (
      await db.query(
        "delete from public.health_observations where id=$1 returning id",
        [observation.id],
      )
    ).rows.length,
    0,
  );
  await assert.rejects(
    db.query(
      "insert into public.health_goals(owner_id,metric_code,target,starts_on) values($1,'water',2000,'2027-01-01')",
      [alice],
    ),
  );
  await asUser(alice);
  await db.query("delete from public.health_observations where id=$1", [
    observation.id,
  ]);
  assert.equal(
    (
      await db.query("select * from public.health_observations where id=$1", [
        observation.id,
      ])
    ).rows.length,
    0,
  );
});

test("calendar recurrence, DST, exceptions, snapshots, atomic workout and meal fulfillment", async () => {
  await asUser(alice);
  const routineId = randomUUID();
  // Select a real built-in strength ID rather than relying on positional catalogs.
  const ex = (
    await row(
      "select id from public.exercises where owner_id is null and tracking_type='reps_weight' order by id limit 1",
    )
  ).id;
  await db.query("select public.save_strength_routine($1::jsonb)", [
    JSON.stringify({
      id: routineId,
      revision: 0,
      name: "Calendar original",
      notes: "",
      exercises: [
        {
          exerciseId: ex,
          notes: "",
          sets: [
            {
              reps: 8,
              weight: 50,
              rpe: null,
              rir: null,
              setType: "working",
              notes: "",
            },
          ],
        },
      ],
    }),
  ]);
  const ruleId = randomUUID();
  const doc = {
    id: ruleId,
    kind: "workout",
    templateId: routineId,
    timezone: "Europe/Oslo",
    start: "2026-10-23",
    end: "2026-11-06",
    time: "09:00",
    recurring: true,
    weekdays: [5],
    count: 3,
  };
  await db.query("select public.create_schedule($1::jsonb)", [
    JSON.stringify(doc),
  ]);
  await db.query("select public.create_schedule($1::jsonb)", [
    JSON.stringify(doc),
  ]);
  const occurrences = (
    await db.query(
      "select *,scheduled_at::text from public.scheduled_activities where rule_id=$1 order by occurrence_date",
      [ruleId],
    )
  ).rows;
  assert.equal(occurrences.length, 3);
  assert.match(occurrences[0].scheduled_at, /07:00:00/);
  assert.match(occurrences[1].scheduled_at, /08:00:00/);
  assert.equal(
    (
      await db.query(
        "select * from public.workout_sessions where scheduled_activity_id=any($1::uuid[])",
        [occurrences.map((a) => a.id)],
      )
    ).rows.length,
    0,
  );
  await db.query(
    "update public.routines set name='Changed template' where id=$1",
    [routineId],
  );
  assert.equal(
    (
      await row(
        "select template_snapshot->>'name' as name from public.scheduled_activities where id=$1",
        [occurrences[0].id],
      )
    ).name,
    "Calendar original",
  );
  await db.query(
    "select public.edit_schedule($1,1,'2026-10-24','10:00','planned','Exception','note',false)",
    [occurrences[0].id],
  );
  await db.query(
    "select public.edit_schedule($1,1,'2026-10-30','11:00','planned','Future edit','',true)",
    [occurrences[1].id],
  );
  assert.equal(
    (
      await row("select title from public.scheduled_activities where id=$1", [
        occurrences[0].id,
      ])
    ).title,
    "Exception",
  );
  assert.equal(
    (
      await row("select title from public.scheduled_activities where id=$1", [
        occurrences[2].id,
      ])
    ).title,
    "Future edit",
  );
  const workout = (
    await row(
      "select public.start_scheduled_workout_at($1,now()-interval '1 second') as result",
      [occurrences[0].id],
    )
  ).result;
  assert.equal(
    (
      await row("select public.start_scheduled_workout($1) as result", [
        occurrences[0].id,
      ])
    ).result.id,
    workout.id,
  );
  const sessionRow = await row(
    "select * from public.workout_sessions where id=$1",
    [workout.id],
  );
  assert.equal(sessionRow.title_snapshot, "Calendar original");
  const slot = await row(
    "select * from public.session_exercises where session_id=$1",
    [workout.id],
  );
  const set = await row(
    "select * from public.workout_sets where session_exercise_id=$1",
    [slot.id],
  );
  await db.query("select public.save_strength_workout($1::jsonb)", [
    JSON.stringify({
      id: workout.id,
      revision: 1,
      name: sessionRow.title_snapshot,
      routineId,
      notes: "",
      timezone: "Europe/Oslo",
      startedAt: new Date(sessionRow.started_at).toISOString(),
      completedAt: new Date().toISOString(),
      exercises: [
        {
          id: slot.id,
          exerciseId: ex,
          name: slot.name_snapshot,
          trackingType: "reps_weight",
          notes: "",
          sets: [
            {
              id: set.id,
              reps: 8,
              weight: 50,
              rpe: null,
              rir: null,
              setType: "working",
              notes: "",
              completedAt: new Date().toISOString(),
            },
          ],
        },
      ],
    }),
  ]);
  assert.equal(
    (
      await row("select status from public.scheduled_activities where id=$1", [
        occurrences[0].id,
      ])
    ).status,
    "completed",
  );
  await assert.rejects(
    db.query("select public.create_schedule($1::jsonb)", [
      JSON.stringify({
        ...doc,
        id: randomUUID(),
        start: "2026-03-29",
        end: "2026-03-29",
        weekdays: [0],
        time: "02:30",
      }),
    ]),
    /does not exist/,
  );
  await asUser(bob);
  await assert.rejects(
    db.query("select public.start_scheduled_workout($1)", [occurrences[0].id]),
    /unavailable/,
  );
  assert.equal(
    (
      await db.query(
        "select * from public.scheduled_activities where rule_id=$1",
        [ruleId],
      )
    ).rows.length,
    0,
  );
  await assert.rejects(
    db.query("select public.create_schedule($1::jsonb)", [
      JSON.stringify({ ...doc, id: randomUUID() }),
    ]),
    /unavailable/,
  );
  await asUser(alice);
  const foodId = (
    await row(
      "insert into public.foods(owner_id,name,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g) values($1,'Calendar food',200,10,20,5) returning id",
      [alice],
    )
  ).id;
  const recipeId = randomUUID();
  await db.query("select public.save_nutrition_recipe($1::jsonb)", [
    JSON.stringify({
      id: recipeId,
      revision: 0,
      name: "Planned recipe",
      servings: 2,
      instructions: "",
      ingredients: [{ foodId, grams: 200 }],
    }),
  ]);
  const mealId = randomUUID();
  await db.query("select public.create_schedule($1::jsonb)", [
    JSON.stringify({
      ...doc,
      id: mealId,
      kind: "meal",
      templateId: recipeId,
      recurring: false,
      start: "2026-10-16",
      end: null,
    }),
  ]);
  await db.query("update public.foods set kcal_per_100g=900 where id=$1", [
    foodId,
  ]);
  const entryId = randomUUID();
  await db.query(
    "select public.consume_scheduled_meal($1,$2,1.5,'2026-10-16')",
    [mealId, entryId],
  );
  const entry = await row(
    "select * from public.nutrition_entries where id=$1",
    [entryId],
  );
  assert.equal(Number(entry.kcal_snapshot), 300);
  assert.equal(
    (
      await row(
        "select public.consume_scheduled_meal($1,$2,2,'2026-10-16') as id",
        [mealId, randomUUID()],
      )
    ).id,
    entryId,
  );
  await db.query("update public.nutrition_entries set quantity=2 where id=$1", [
    entryId,
  ]);
  assert.equal(
    Number(
      (
        await row(
          "select kcal_snapshot from public.nutrition_entries where id=$1",
          [entryId],
        )
      ).kcal_snapshot,
    ),
    400,
  );
  await db.query("delete from public.nutrition_entries where id=$1", [entryId]);
  assert.equal(
    (
      await row("select status from public.scheduled_activities where id=$1", [
        mealId,
      ])
    ).status,
    "planned",
  );
  await db.query("select public.delete_strength_workout($1,2)", [workout.id]);
});

test("all application tables enable RLS", async () => {
  await db.exec("reset role");
  const tables = (
    await db.query(
      "select relname, relrowsecurity from pg_class join pg_namespace on pg_namespace.oid=relnamespace where nspname='public' and relkind='r'",
    )
  ).rows;
  assert.equal(tables.length, 27);
  assert.ok(tables.every((t) => t.relrowsecurity));
});

test("favorites explicitly restrict hosted default privileges including TRUNCATE", async () => {
  await db.exec("reset role");
  for (const privilege of [
    "SELECT",
    "INSERT",
    "UPDATE",
    "DELETE",
    "TRUNCATE",
    "REFERENCES",
    "TRIGGER",
  ]) {
    const result = await row(
      "select has_table_privilege($1,$2,$3) as allowed",
      ["anon", "public.exercise_favorites", privilege],
    );
    assert.equal(result.allowed, false);
  }
  for (const privilege of ["UPDATE", "TRUNCATE", "REFERENCES", "TRIGGER"]) {
    const result = await row(
      "select has_table_privilege($1,$2,$3) as allowed",
      ["authenticated", "public.exercise_favorites", privilege],
    );
    assert.equal(result.allowed, false);
  }
  for (const privilege of ["SELECT", "INSERT", "DELETE"]) {
    const result = await row(
      "select has_table_privilege($1,$2,$3) as allowed",
      ["authenticated", "public.exercise_favorites", privilege],
    );
    assert.equal(result.allowed, true);
  }
});
test("a second user cannot read, mutate, or forge ownership of private records", async () => {
  await asUser(bob);
  assert.equal(
    (await db.query("select * from public.routines")).rows.length,
    0,
  );
  assert.equal(
    (
      await db.query(
        "update public.routines set name=$1 where id=$2 returning id",
        ["stolen", routine],
      )
    ).rows.length,
    0,
  );
  await assert.rejects(
    db.query("insert into public.routines(owner_id,name) values ($1,$2)", [
      alice,
      "forged",
    ]),
    /row-level security/,
  );
  await asUser(alice);
  assert.equal(
    (await row("select name from public.routines where id=$1", [routine])).name,
    "Upper body",
  );
});
test("composite FKs and visibility guards reject cross-owner references", async () => {
  await asUser(bob);
  await assert.rejects(
    db.query(
      "insert into public.routine_exercises(owner_id,routine_id,exercise_id,position) values ($1,$2,$3,0)",
      [bob, routine, exercise],
    ),
  );
  const ownRoutine = (
    await row(
      "insert into public.routines(owner_id,name) values ($1,'Bob routine') returning id",
      [bob],
    )
  ).id;
  await assert.rejects(
    db.query(
      "insert into public.routine_exercises(owner_id,routine_id,exercise_id,position) values ($1,$2,$3,0)",
      [bob, ownRoutine, exercise],
    ),
    /unavailable/,
  );
  await assert.rejects(
    db.query("insert into public.food_favorites values ($1,$2,now())", [
      bob,
      food,
    ]),
    /unavailable/,
  );
});
test("anonymous access is denied for private records and catalog writes", async () => {
  await asUser(null);
  await assert.rejects(
    db.query("select * from public.workout_sessions"),
    /permission denied/,
  );
  assert.equal(
    (await db.query("select * from public.exercises")).rows.length,
    20,
  );
  assert.ok(
    (await db.query("select * from public.health_metrics")).rows.length > 0,
  );
  await assert.rejects(
    db.query(
      "insert into public.exercises(name,muscle_group) values ('Forged global','chest')",
    ),
    /permission denied/,
  );
});
test("set-level history keeps stable exercise IDs and rejects invalid effort", async () => {
  await asUser(alice);
  const sx = (
    await row(
      "insert into public.session_exercises(owner_id,session_id,exercise_id,name_snapshot,tracking_type_snapshot,position) values ($1,$2,$3,'Bench press','reps_weight',0) returning id",
      [alice, session, exercise],
    )
  ).id;
  await db.query(
    "insert into public.workout_sets(owner_id,session_exercise_id,position,reps,weight_kg,rpe,rir,completed_at) values ($1,$2,0,8,60,8,2,now())",
    [alice, sx],
  );
  await assert.rejects(
    db.query(
      "insert into public.workout_sets(owner_id,session_exercise_id,position,reps,rpe) values ($1,$2,1,8,11)",
      [alice, sx],
    ),
    /check constraint/,
  );
  await db.query(
    "update public.exercises set name='Renamed bench' where id=$1",
    [exercise],
  );
  assert.equal(
    (
      await row(
        "select name_snapshot from public.session_exercises where id=$1",
        [sx],
      )
    ).name_snapshot,
    "Bench press",
  );
  await assert.rejects(
    db.query("delete from public.exercises where id=$1", [exercise]),
    /foreign key/,
  );
});
test("nutrition snapshots survive food edits", async () => {
  await asUser(alice);
  const entry = (
    await row(
      "insert into public.nutrition_entries(owner_id,food_id,logged_at,local_date,meal_slot,name_snapshot,quantity,unit_snapshot,grams_snapshot,kcal_snapshot,protein_snapshot,carbs_snapshot,fat_snapshot) values ($1,$2,'2026-10-16T12:00:00Z','2026-10-16','breakfast','Oats',50,'g',50,190,6.5,34,3.5) returning id",
      [alice, food],
    )
  ).id;
  await db.query("update public.foods set kcal_per_100g=400 where id=$1", [
    food,
  ]);
  assert.equal(
    Number(
      (
        await row(
          "select kcal_snapshot from public.nutrition_entries where id=$1",
          [entry],
        )
      ).kcal_snapshot,
    ),
    190,
  );
});
test("imports deduplicate per owner, source, external ID and metric", async () => {
  await asUser(alice);
  const sql =
    "insert into public.health_observations(owner_id,metric_code,value,observed_at,local_date,timezone,source,external_id) values ($1,'steps',7000,now(),'2026-10-16','Europe/Oslo','garmin','activity-1')";
  await db.query(sql, [alice]);
  await assert.rejects(db.query(sql, [alice]), /unique constraint/);
  await assert.rejects(
    db.query(
      "insert into public.health_observations(owner_id,metric_code,value,observed_at,local_date,timezone) values ($1,'heart_rate',500,now(),'2026-10-16','Europe/Oslo')",
      [alice],
    ),
    /accepted range/,
  );
  await asUser(bob);
  await db.query(sql, [bob]);
});
test("program drafts stay private; published versions and items are immutable", async () => {
  await asUser(alice);
  const program = (
    await row(
      "insert into public.programs(owner_id,title,kind) values ($1,'Strength basics','workout') returning id",
      [alice],
    )
  ).id;
  version = (
    await row(
      "insert into public.program_versions(owner_id,program_id,version,title_snapshot) values ($1,$2,1,'Strength basics v1') returning id",
      [alice, program],
    )
  ).id;
  await db.query(
    `insert into public.program_items(owner_id,program_version_id,day_offset,position,kind,title,template_snapshot) values ($1,$2,0,0,'workout','Upper body','{"exercises":[]}'::jsonb)`,
    [alice, version],
  );
  await asUser(bob);
  assert.equal(
    (await db.query("select * from public.program_versions")).rows.length,
    0,
  );
  await assert.rejects(
    db.query(
      "insert into public.routines(owner_id,name,source_version_id) values ($1,'Copy',$2)",
      [bob, version],
    ),
    /unavailable/,
  );
  await asUser(alice);
  await db.query(
    "update public.program_versions set visibility='public',published_at=now() where id=$1",
    [version],
  );
  await assert.rejects(
    db.query(
      "update public.program_versions set title_snapshot='Changed' where id=$1",
      [version],
    ),
    /immutable/,
  );
  await assert.rejects(
    db.query(
      "update public.program_items set title='Changed' where program_version_id=$1",
      [version],
    ),
    /immutable/,
  );
  await assert.rejects(
    db.query("delete from public.program_versions where id=$1", [version]),
    /immutable/,
  );
  await asUser(null);
  assert.equal(
    (await db.query("select * from public.program_versions")).rows.length,
    1,
  );
  assert.equal(
    (await db.query("select * from public.program_items")).rows.length,
    1,
  );
  await asUser(bob);
  const copy = (
    await row(
      "insert into public.routines(owner_id,name,source_version_id) values ($1,'My independent copy',$2) returning id",
      [bob, version],
    )
  ).id;
  await db.query(
    "update public.routines set name='My edited copy' where id=$1",
    [copy],
  );
  assert.equal(
    (
      await row(
        "select title_snapshot from public.program_versions where id=$1",
        [version],
      )
    ).title_snapshot,
    "Strength basics v1",
  );
});
test("draft deletion works and integration writes are server-only", async () => {
  await asUser(alice);
  const p = (
    await row(
      "insert into public.programs(owner_id,title,kind) values ($1,'Draft','meal') returning id",
      [alice],
    )
  ).id;
  const v = (
    await row(
      "insert into public.program_versions(owner_id,program_id,version,title_snapshot) values ($1,$2,1,'Draft') returning id",
      [alice, p],
    )
  ).id;
  assert.equal(
    (
      await db.query(
        "delete from public.program_versions where id=$1 returning id",
        [v],
      )
    ).rows.length,
    1,
  );
  await assert.rejects(
    db.query(
      "insert into public.integration_connections(owner_id,provider,external_account_id,status) values ($1,'garmin','123','active')",
      [alice],
    ),
    /permission denied/,
  );
});

const bench = "f0000000-0000-4000-8000-000000000001";
const makeSet = (overrides = {}) => ({
  id: randomUUID(),
  reps: 8,
  weight: 60,
  rpe: 8,
  rir: 2,
  setType: "working",
  notes: "",
  completedAt: "2026-10-15T16:30:00Z",
  ...overrides,
});
const makeWorkout = () => ({
  id: randomUUID(),
  revision: 0,
  name: "Persistent upper body",
  notes: "A real SQL record",
  routineId: null,
  timezone: "Europe/Oslo",
  startedAt: "2026-10-15T16:00:00Z",
  completedAt: "2026-10-15T17:00:00Z",
  exercises: [
    { id: randomUUID(), exerciseId: bench, notes: "", sets: [makeSet()] },
  ],
});
async function rpc(name, doc) {
  return (
    await row(`select public.${name}($1::jsonb) as result`, [
      JSON.stringify(doc),
    ])
  ).result;
}
let savedWorkout, savedRoutine;

test("seeded exercise IDs are stable and global catalogs remain read-only", async () => {
  await asUser(alice);
  assert.equal(
    (await row("select name from public.exercises where id=$1", [bench])).name,
    "Barbell bench press",
  );
  assert.equal(
    (
      await db.query(
        "update public.exercises set name='Hacked' where id=$1 returning id",
        [bench],
      )
    ).rows.length,
    0,
  );
  await db.query(
    "insert into public.exercise_favorites(owner_id,exercise_id) values ($1,$2)",
    [alice, bench],
  );
  await asUser(bob);
  assert.equal(
    (await db.query("select * from public.exercise_favorites")).rows.length,
    0,
  );
  await assert.rejects(
    db.query(
      "insert into public.exercise_favorites(owner_id,exercise_id) values ($1,$2)",
      [bob, exercise],
    ),
    /unavailable/,
  );
});

test("template save, duplicate, reorder and edits are transactional", async () => {
  await asUser(alice);
  const template = {
    id: randomUUID(),
    revision: 0,
    name: "Two lifts",
    notes: "Targets",
    exercises: [
      {
        id: randomUUID(),
        exerciseId: bench,
        notes: "",
        sets: [makeSet({ completedAt: null, weight: null })],
      },
      {
        id: randomUUID(),
        exerciseId: "f0000000-0000-4000-8000-000000000002",
        notes: "",
        sets: [makeSet({ completedAt: null })],
      },
    ],
  };
  const first = await rpc("save_strength_routine", template);
  assert.equal(first.revision, 1);
  template.revision = 1;
  template.exercises.reverse();
  await rpc("save_strength_routine", template);
  const slots = (
    await db.query(
      "select exercise_id from public.routine_exercises where routine_id=$1 order by position",
      [template.id],
    )
  ).rows;
  assert.equal(slots[0].exercise_id, template.exercises[0].exerciseId);
  const copy = {
    ...template,
    id: randomUUID(),
    revision: 0,
    name: "Independent copy",
  };
  await rpc("save_strength_routine", copy);
  template.name = "Edited original";
  template.revision = 2;
  await rpc("save_strength_routine", template);
  assert.equal(
    (await row("select name from public.routines where id=$1", [copy.id])).name,
    "Independent copy",
  );
  await assert.rejects(
    rpc("save_strength_routine", template),
    /changed or unavailable/,
  );
  savedRoutine = { ...template, revision: 3 };
});

test("completed workout, individual sets, edits and trusted snapshots persist", async () => {
  await asUser(alice);
  savedWorkout = makeWorkout();
  savedWorkout.routineId = savedRoutine.id;
  savedWorkout.exercises[0].exerciseId = exercise;
  savedWorkout.exercises[0].sets.unshift(
    makeSet({ setType: "warmup", weight: 20 }),
  );
  await rpc("save_strength_workout", savedWorkout);
  savedWorkout.revision = 1;
  await rpc("save_strength_routine", {
    ...savedRoutine,
    name: "Changed after workout",
    exercises: savedRoutine.exercises.map((e) => ({
      ...e,
      sets: e.sets.map((s) => ({ ...s, reps: 12, weight: 100 })),
    })),
  });
  assert.equal(
    Number(
      (
        await row("select weight_kg from public.workout_sets where id=$1", [
          savedWorkout.exercises[0].sets[1].id,
        ])
      ).weight_kg,
    ),
    60,
  );
  await db.query(
    "update public.exercises set name='Later catalog rename' where id=$1",
    [exercise],
  );
  savedWorkout.exercises[0].sets[1].weight = 65;
  await rpc("save_strength_workout", savedWorkout);
  savedWorkout.revision = 2;
  assert.equal(
    (
      await row(
        "select name_snapshot from public.session_exercises where session_id=$1",
        [savedWorkout.id],
      )
    ).name_snapshot,
    "Renamed bench",
  );
  assert.equal(
    Number(
      (
        await row("select weight_kg from public.workout_sets where id=$1", [
          savedWorkout.exercises[0].sets[1].id,
        ])
      ).weight_kg,
    ),
    65,
  );
  assert.equal(
    (
      await db.query(
        "select id from public.workout_sets where session_exercise_id=$1",
        [savedWorkout.exercises[0].id],
      )
    ).rows.length,
    2,
  );
  await assert.rejects(
    rpc("save_strength_workout", { ...savedWorkout, revision: 1 }),
    /changed or unavailable/,
  );
});

test("invalid child rows roll back entire document saves", async () => {
  await asUser(alice);
  const invalid = makeWorkout();
  invalid.exercises.push({
    id: randomUUID(),
    exerciseId: randomUUID(),
    notes: "",
    sets: [makeSet()],
  });
  await assert.rejects(rpc("save_strength_workout", invalid), /unavailable/);
  assert.equal(
    (
      await db.query("select id from public.workout_sessions where id=$1", [
        invalid.id,
      ])
    ).rows.length,
    0,
  );
  const invalidEffort = structuredClone(savedWorkout);
  invalidEffort.exercises[0].sets[1].rpe = 11;
  await assert.rejects(
    rpc("save_strength_workout", invalidEffort),
    /check constraint/,
  );
  assert.equal(
    (
      await row("select revision from public.workout_sessions where id=$1", [
        savedWorkout.id,
      ])
    ).revision,
    2,
  );
});

test("workout RPCs reject other owners and anonymous callers", async () => {
  await asUser(bob);
  assert.equal(
    (
      await db.query("select id from public.workout_sessions where id=$1", [
        savedWorkout.id,
      ])
    ).rows.length,
    0,
  );
  await assert.rejects(
    rpc("save_strength_workout", savedWorkout),
    (error) =>
      error.code === "PT409" && /changed or unavailable/.test(error.message),
  );
  await assert.rejects(
    db.query("select public.delete_strength_workout($1,$2)", [
      savedWorkout.id,
      2,
    ]),
    /changed or unavailable/,
  );
  await assert.rejects(
    rpc("save_strength_workout", { ...savedWorkout, revision: 0 }),
    /duplicate key/,
  );
  await asUser(null);
  await assert.rejects(
    rpc("save_strength_workout", makeWorkout()),
    /permission denied/,
  );
});

test("records survive a fresh database connection and a new user session", async () => {
  if (nativeUrl) {
    await nativeClient.end();
    await connectNative();
  }
  await asUser(alice);
  const history = await row(
    "select title_snapshot,revision from public.workout_sessions where id=$1",
    [savedWorkout.id],
  );
  assert.equal(history.title_snapshot, "Persistent upper body");
  assert.equal(history.revision, 2);
  assert.equal(
    (
      await db.query(
        "select id from public.workout_sets where session_exercise_id=$1",
        [savedWorkout.exercises[0].id],
      )
    ).rows.length,
    2,
  );
  await asUser(bob);
  assert.equal(
    (
      await db.query("select id from public.workout_sessions where id=$1", [
        savedWorkout.id,
      ])
    ).rows.length,
    0,
  );
});

test("only owned workouts can be deleted and child sets cascade", async () => {
  await asUser(alice);
  await db.query("select public.delete_strength_workout($1,$2)", [
    savedWorkout.id,
    2,
  ]);
  assert.equal(
    (
      await db.query(
        "select id from public.workout_sets where session_exercise_id=$1",
        [savedWorkout.exercises[0].id],
      )
    ).rows.length,
    0,
  );
});

let nutritionFood, nutritionRecipe, nutritionEntry;
test("nutrition servings are computed by SQL and corrections retain the original basis", async () => {
  await asUser(alice);
  nutritionFood = (
    await row(
      `insert into public.foods(owner_id,name,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,portions) values($1,'Snapshot bread',200,10,30,4,'[{"id":"slice","label":"slice","grams":40}]') returning id`,
      [alice],
    )
  ).id;
  nutritionEntry = {
    id: randomUUID(),
    revision: 0,
    foodId: nutritionFood,
    recipeId: null,
    date: "2026-10-16",
    loggedAt: "2026-10-16T10:00:00Z",
    timezone: "Europe/Oslo",
    meal: "breakfast",
    quantity: 2,
    unit: "slice",
  };
  await rpc("save_nutrition_entry", nutritionEntry);
  const original = await row(
    "select * from public.nutrition_entries where id=$1",
    [nutritionEntry.id],
  );
  assert.equal(Number(original.kcal_snapshot), 160);
  assert.equal(Number(original.grams_snapshot), 80);
  await db.query(
    `update public.foods set name='Changed bread',kcal_per_100g=500,portions='[{"id":"slice","label":"slice","grams":90}]' where id=$1`,
    [nutritionFood],
  );
  await rpc("save_nutrition_entry", {
    ...nutritionEntry,
    revision: 1,
    quantity: 3,
  });
  const corrected = await row(
    "select * from public.nutrition_entries where id=$1",
    [nutritionEntry.id],
  );
  assert.equal(Number(corrected.kcal_snapshot), 240);
  assert.equal(Number(corrected.grams_snapshot), 120);
  assert.equal(corrected.name_snapshot, "Snapshot bread");
  await db.query(
    "update public.nutrition_entries set kcal_snapshot=1 where id=$1",
    [nutritionEntry.id],
  );
  assert.equal(
    Number(
      (
        await row(
          "select kcal_snapshot from public.nutrition_entries where id=$1",
          [nutritionEntry.id],
        )
      ).kcal_snapshot,
    ),
    240,
  );
  await assert.rejects(
    rpc("save_nutrition_entry", {
      ...nutritionEntry,
      revision: 1,
      quantity: 3,
    }),
    (e) => e.code === "PT409",
  );
});
test("recipes log independent composition snapshots and rollback invalid children", async () => {
  await asUser(alice);
  nutritionRecipe = {
    id: randomUUID(),
    revision: 0,
    name: "Bread meal",
    servings: 2,
    instructions: "Enjoy",
    ingredients: [{ foodId: nutritionFood, grams: 100 }],
  };
  await rpc("save_nutrition_recipe", nutritionRecipe);
  const logged = {
    ...nutritionEntry,
    id: randomUUID(),
    foodId: null,
    recipeId: nutritionRecipe.id,
    quantity: 1,
    unit: "serving",
  };
  await rpc("save_nutrition_entry", logged);
  assert.equal(
    Number(
      (
        await row(
          "select kcal_snapshot from public.nutrition_entries where id=$1",
          [logged.id],
        )
      ).kcal_snapshot,
    ),
    250,
  );
  await rpc("save_nutrition_recipe", {
    ...nutritionRecipe,
    revision: 1,
    name: "Changed meal",
    servings: 4,
  });
  await rpc("save_nutrition_entry", { ...logged, revision: 1, quantity: 2 });
  const historical = await row(
    "select * from public.nutrition_entries where id=$1",
    [logged.id],
  );
  assert.equal(Number(historical.kcal_snapshot), 500);
  assert.equal(historical.name_snapshot, "Bread meal");
  assert.equal(historical.basis_snapshot.ingredients[0].name, "Changed bread");
  await assert.rejects(
    rpc("save_nutrition_recipe", {
      ...nutritionRecipe,
      revision: 2,
      ingredients: [{ foodId: nutritionFood, grams: -1 }],
    }),
  );
  assert.equal(
    (
      await row("select revision from public.recipes where id=$1", [
        nutritionRecipe.id,
      ])
    ).revision,
    2,
  );
  await db.query(
    "insert into public.recipe_favorites(owner_id,recipe_id) values($1,$2)",
    [alice, nutritionRecipe.id],
  );
  await db.query("update public.recipes set archived_at=now() where id=$1", [
    nutritionRecipe.id,
  ]);
  await rpc("save_nutrition_entry", { ...logged, revision: 2, quantity: 1 });
  assert.equal(
    Number(
      (
        await row(
          "select kcal_snapshot from public.nutrition_entries where id=$1",
          [logged.id],
        )
      ).kcal_snapshot,
    ),
    250,
  );
});
test("unknown food nutrients propagate through recipe snapshots instead of becoming zero", async () => {
  await asUser(alice);
  const unknown = (
    await row(
      "insert into public.foods(owner_id,name,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g) values($1,'Unknown food',null,5,null,0) returning id",
      [alice],
    )
  ).id;
  const recipe = {
    ...nutritionRecipe,
    id: randomUUID(),
    ingredients: [
      { foodId: nutritionFood, grams: 100 },
      { foodId: unknown, grams: 100 },
    ],
  };
  await rpc("save_nutrition_recipe", recipe);
  const id = randomUUID();
  await rpc("save_nutrition_entry", {
    ...nutritionEntry,
    id,
    recipeId: recipe.id,
    foodId: null,
    quantity: 1,
    unit: "serving",
  });
  const result = await row(
    "select * from public.nutrition_entries where id=$1",
    [id],
  );
  assert.equal(result.kcal_snapshot, null);
  assert.equal(result.carbs_snapshot, null);
  assert.equal(Number(result.protein_snapshot), 7.5);
});
test("nutrition owner isolation, serving validation and trusted-source guards fail closed", async () => {
  await asUser(bob);
  assert.equal(
    (
      await db.query("select id from public.nutrition_entries where id=$1", [
        nutritionEntry.id,
      ])
    ).rows.length,
    0,
  );
  await assert.rejects(
    rpc("save_nutrition_entry", { ...nutritionEntry, revision: 3 }),
    (e) => e.code === "PT409",
  );
  await assert.rejects(
    rpc("save_nutrition_entry", { ...nutritionEntry, id: randomUUID() }),
    /Food is unavailable/,
  );
  await assert.rejects(
    db.query(
      "insert into public.food_favorites(owner_id,food_id) values($1,$2)",
      [bob, nutritionFood],
    ),
    /Food is unavailable/,
  );
  await assert.rejects(
    db.query(
      "insert into public.recipe_favorites(owner_id,recipe_id) values($1,$2)",
      [bob, nutritionRecipe.id],
    ),
    /foreign key/,
  );
  await assert.rejects(
    db.query(
      "insert into public.foods(owner_id,name,source,external_id) values($1,'Fake trusted','matvaretabellen','fake')",
      [bob],
    ),
    /trusted external provenance/,
  );
  await asUser(alice);
  await assert.rejects(
    rpc("save_nutrition_entry", {
      ...nutritionEntry,
      id: randomUUID(),
      unit: "unsupported",
    }),
    /Serving is unavailable/,
  );
  await assert.rejects(
    rpc("save_nutrition_entry", {
      ...nutritionEntry,
      id: randomUUID(),
      date: "2026-10-17",
    }),
    /date and timezone/,
  );
  await asUser(null);
  await assert.rejects(
    rpc("save_nutrition_entry", nutritionEntry),
    /permission denied/,
  );
});
test("nutrition goal periods split atomically and preserve earlier targets", async () => {
  await asUser(alice);
  const set = async (date, kcal) =>
    db.query("select public.set_nutrition_goal($1,$2,100,250,60)", [
      date,
      kcal,
    ]);
  await set("2026-10-01", 2000);
  await set("2026-10-20", 2400);
  await set("2026-10-10", 2200);
  const { rows } = await db.query(
    "select starts_on::text,ends_on::text,kcal from public.nutrition_goals order by starts_on",
  );
  assert.equal(rows.length, 3);
  assert.equal(rows[0].ends_on, "2026-10-09");
  assert.equal(rows[1].ends_on, "2026-10-19");
  assert.equal(rows[2].ends_on, null);
  await assert.rejects(
    db.query(
      "insert into public.nutrition_goals(owner_id,starts_on,kcal,protein_g,carbs_g,fat_g) values($1,'2026-10-12',2100,100,250,60)",
      [alice],
    ),
    /overlap/,
  );
  await set("2026-10-10", 2250);
  assert.equal(
    Number(
      (
        await row(
          "select kcal from public.nutrition_goals where starts_on='2026-10-10'",
        )
      ).kcal,
    ),
    2250,
  );
});
test("legacy pre-nutrition records survive migrations and reject invented recalculation bases", async () => {
  await asUser(alice);
  const id = "ab000000-0000-4000-8000-000000000001";
  await db.query(
    `update public.nutrition_entries set basis_snapshot='{"kcal":1}',kcal_snapshot=1,meal_slot='dinner' where id=$1`,
    [id],
  );
  const old = await row("select * from public.nutrition_entries where id=$1", [
    id,
  ]);
  assert.equal(Number(old.kcal_snapshot), 500);
  assert.equal(old.basis_snapshot, null);
  assert.equal(old.meal_slot, "dinner");
  assert.equal(old.name_snapshot, "Legacy manual entry");
  await assert.rejects(
    db.query("update public.nutrition_entries set quantity=2 where id=$1", [
      id,
    ]),
    /Legacy quantity/,
  );
});
