// Explicit trusted catalog ingestion; never imported by application code.
import { normalizeFeed } from "../src/lib/nutrition/matvaretabellen.ts";
import { hostedDatabase } from "./lib/hosted-access.mjs";
process.loadEnvFile(".env.local");
const response = await fetch(
  "https://www.matvaretabellen.no/api/nb/foods.json",
  { signal: AbortSignal.timeout(30000) },
);
if (!response.ok)
  throw new Error("Official food feed is unavailable; catalog unchanged.");
const rows = normalizeFeed(await response.json());
console.log(
  `Validated ${rows.length} Norwegian foods from Matvaretabellen. Missing nutrients remain null.`,
);
if (!process.argv.includes("--apply")) {
  console.log(
    "Preview only. Use --apply to upsert by stable external source ID.",
  );
  process.exit(0);
}
let client;
try {
  client = await hostedDatabase();
  await client.query("begin");
  for (let i = 0; i < rows.length; i += 100) {
    const batch = rows.slice(i, i + 100);
    await client.query(
      `
    insert into public.foods(id,owner_id,name,description,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,portions,nutrients,source,external_id,source_url,search_keywords,imported_at)
    select id,owner_id,name,description,kcal_per_100g,protein_per_100g,carbs_per_100g,fat_per_100g,portions,nutrients,source,external_id,source_url,search_keywords,now()
    from jsonb_populate_recordset(null::public.foods,$1::jsonb)
    on conflict(source,external_id) where owner_id is null and external_id is not null do update set
    name=excluded.name,description=excluded.description,kcal_per_100g=excluded.kcal_per_100g,protein_per_100g=excluded.protein_per_100g,carbs_per_100g=excluded.carbs_per_100g,fat_per_100g=excluded.fat_per_100g,portions=excluded.portions,nutrients=excluded.nutrients,source_url=excluded.source_url,search_keywords=excluded.search_keywords,imported_at=excluded.imported_at`,
      [JSON.stringify(batch)],
    );
  }
  await client.query("commit");
  console.log(
    `Catalog cache upsert complete: ${rows.length} source IDs. No personal foods or diary snapshots modified.`,
  );
} catch (error) {
  if (client) await client.query("rollback");
  console.log(`Import failed safely (${error.code ?? error.name}).`);
  process.exitCode = 1;
} finally {
  if (client) await client.end();
}
