// Introspects the actual migrated local PostgreSQL schema. No credentials emitted.
import pg from "pg";
import { writeFile } from "node:fs/promises";
import { format } from "prettier";
const url = process.env.DATABASE_TEST_URL;
if (!url || new URL(url).pathname !== "/form_test")
  throw new Error(
    "Run npm run db:types to generate from an isolated migrated database.",
  );
const client = new pg.Client({ connectionString: url });
await client.connect();
const scalar = (type) =>
  ({
    uuid: "string",
    text: "string",
    varchar: "string",
    timestamptz: "string",
    date: "string",
    time: "string",
    _int4: "number[]",
    timestamp: "string",
    int2: "number",
    int4: "number",
    int8: "number",
    numeric: "number",
    float4: "number",
    float8: "number",
    bool: "boolean",
    jsonb: "Json",
    json: "Json",
    void: "undefined",
  })[type] ?? "unknown";
try {
  const { rows: columns } = await client.query(
    `select table_name,column_name,udt_name,is_nullable,column_default from information_schema.columns where table_schema='public' order by table_name,ordinal_position`,
  );
  const { rows: fks } =
    await client.query(`select c.conname, t.relname as table_name, rt.relname as referenced_relation,
    array(select a.attname::text from unnest(c.conkey) with ordinality k(num,ord) join pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.num order by ord) as columns,
    array(select a.attname::text from unnest(c.confkey) with ordinality k(num,ord) join pg_attribute a on a.attrelid=c.confrelid and a.attnum=k.num order by ord) as referenced_columns,
    exists(select 1 from pg_constraint u where u.conrelid=c.conrelid and u.contype in ('u','p') and u.conkey <@ c.conkey) as is_one_to_one
    from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace n on n.oid=t.relnamespace join pg_class rt on rt.oid=c.confrelid join pg_namespace rn on rn.oid=rt.relnamespace
    where c.contype='f' and n.nspname='public' and rn.nspname='public'`);
  const tables = {};
  for (const col of columns) (tables[col.table_name] ??= []).push(col);
  let output =
    "// Generated from PostgreSQL 17 after all versioned migrations. Do not edit.\nexport type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];\nexport type Database = { public: { Tables: {\n";
  for (const [name, cols] of Object.entries(tables)) {
    output += `${JSON.stringify(name)}: {\n`;
    for (const shape of ["Row", "Insert", "Update"]) {
      output += `${shape}: {\n`;
      for (const col of cols) {
        const optional =
          shape === "Update" ||
          (shape === "Insert" &&
            (col.column_default !== null || col.is_nullable === "YES"));
        output += `${JSON.stringify(col.column_name)}${optional ? "?" : ""}: ${scalar(col.udt_name)}${col.is_nullable === "YES" ? " | null" : ""};\n`;
      }
      output += "};\n";
    }
    output += "Relationships: [";
    for (const fk of fks.filter((f) => f.table_name === name))
      output += `{ foreignKeyName: ${JSON.stringify(fk.conname)}; columns: ${JSON.stringify(fk.columns)}; isOneToOne: ${fk.is_one_to_one}; referencedRelation: ${JSON.stringify(fk.referenced_relation)}; referencedColumns: ${JSON.stringify(fk.referenced_columns)}; },`;
    output += "];\n};\n";
  }
  output += "}; Views: { [_ in never]: never }; Functions: {\n";
  const { rows: functions } = await client.query(
    `select p.proname,p.proargnames, array(select typname::text from unnest(p.proargtypes) with ordinality a(oid,ord) join pg_type t on t.oid=a.oid order by ord) as argument_types, rt.typname as result_type from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_type rt on rt.oid=p.prorettype where n.nspname='public' and rt.typname <> 'trigger'`,
  );
  for (const f of functions)
    output += `${JSON.stringify(f.proname)}: { Args: { ${f.proargnames.map((name, i) => `${JSON.stringify(name)}: ${scalar(f.argument_types[i])}`).join("; ")} }; Returns: ${scalar(f.result_type)} };\n`;
  output +=
    "}; Enums: { [_ in never]: never }; CompositeTypes: { [_ in never]: never }; }; };\n";
  await writeFile(
    "src/lib/supabase/database.types.ts",
    await format(output, { parser: "typescript" }),
  );
  console.log(
    `Generated database types for ${Object.keys(tables).length} migrated tables.`,
  );
} finally {
  await client.end();
}
