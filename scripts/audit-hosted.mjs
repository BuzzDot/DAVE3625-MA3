import { existsSync } from "node:fs";
import { hostedDatabase } from "./lib/hosted-access.mjs";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
let client;
try {
  client = await hostedDatabase();
  const tables = (
    await client.query(
      "select c.relname as name,c.relrowsecurity as rls from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' order by c.relname",
    )
  ).rows;
  const policies = (
    await client.query(
      "select tablename,policyname,roles,cmd from pg_policies where schemaname='public' order by tablename,policyname",
    )
  ).rows;
  const history = (
    await client.query(
      "select version,name from supabase_migrations.schema_migrations order by version",
    )
  ).rows;
  const privileges = (
    await client.query(
      "select grantee,table_name,privilege_type from information_schema.role_table_grants where table_schema='public' and grantee in ('anon','authenticated') order by table_name,grantee,privilege_type",
    )
  ).rows;
  const functions = (
    await client.query(
      "select p.proname,p.prosecdef as security_definer,has_function_privilege('anon',p.oid,'EXECUTE') as anon_execute,has_function_privilege('authenticated',p.oid,'EXECUTE') as authenticated_execute from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('save_strength_workout','save_strength_routine','delete_strength_workout','save_nutrition_recipe','save_nutrition_entry','set_nutrition_goal','recipe_nutrition_basis','set_health_goal','schedule_template','create_schedule','edit_schedule','retire_schedule','start_scheduled_workout','start_scheduled_workout_at','consume_scheduled_meal') order by p.proname",
    )
  ).rows;
  console.log(
    JSON.stringify(
      {
        verifiedTls: true,
        tables,
        policyCount: policies.length,
        migrations: history,
        favoriteGrants: privileges.filter(
          (p) => p.table_name === "exercise_favorites",
        ),
        privateAnonymousGrants: privileges.filter(
          (p) =>
            p.grantee === "anon" &&
            ![
              "exercises",
              "foods",
              "health_metrics",
              "program_versions",
              "program_items",
            ].includes(p.table_name),
        ),
        functions,
      },
      null,
      2,
    ),
  );
  if (
    tables.length !== 27 ||
    functions.length !== 15 ||
    tables.some((t) => !t.rls) ||
    functions.some(
      (f) => f.security_definer || f.anon_execute || !f.authenticated_execute,
    ) ||
    privileges.some(
      (p) =>
        p.grantee === "anon" &&
        ![
          "exercises",
          "foods",
          "health_metrics",
          "program_versions",
          "program_items",
        ].includes(p.table_name),
    ) ||
    privileges.some(
      (p) =>
        ["exercise_favorites", "recipe_favorites"].includes(p.table_name) &&
        p.grantee === "authenticated" &&
        !["SELECT", "INSERT", "DELETE"].includes(p.privilege_type),
    )
  )
    process.exitCode = 1;
} catch (error) {
  console.log(
    JSON.stringify({
      auditPassed: false,
      errorCode: error.code,
      errorType: error.name,
    }),
  );
  process.exitCode = 1;
} finally {
  if (client) await client.end();
}
