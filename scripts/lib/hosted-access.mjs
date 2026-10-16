// Verification tooling only. This module is never imported by application code.
// CLI credentials remain in process memory and are never printed or persisted.
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";
import { X509Certificate } from "node:crypto";
import pg from "pg";
const exec = promisify(execFile);
export async function cli(args) {
  try {
    return await exec("supabase", args, {
      windowsHide: true,
      timeout: 60000,
      maxBuffer: 8 * 1024 * 1024,
    });
  } catch {
    throw new Error(
      "Supabase CLI operation failed. Check CLI authorization and project linkage.",
    );
  }
}
export async function target() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("Supabase URL is not configured.");
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || !parsed.hostname.endsWith(".supabase.co"))
    throw new Error(
      "This verification tool requires an HTTPS hosted Supabase project.",
    );
  const ref = parsed.hostname.split(".")[0];
  const linked = (await readFile("supabase/.temp/project-ref", "utf8")).trim();
  if (ref !== linked)
    throw new Error(
      "The linked project does not match the application configuration.",
    );
  return { url, ref };
}
export async function hostedDatabase() {
  await target();
  const response = await fetch(
    "https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt",
    { signal: AbortSignal.timeout(15000) },
  );
  if (!response.ok) throw new Error("Could not download the Supabase root CA.");
  const ca = await response.text();
  const certificate = new X509Certificate(ca);
  if (!certificate.ca || !certificate.subject.includes("Supabase"))
    throw new Error("Unexpected database CA.");
  const { stdout } = await cli([
    "db",
    "dump",
    "--linked",
    "--schema",
    "public",
    "--dry-run",
  ]);
  const credentials = {};
  for (const line of stdout.split(/\r?\n/)) {
    const m = line.match(/^export (PG[A-Z_]+)="([^"\r\n]*)"$/);
    if (m) credentials[m[1]] = m[2];
  }
  if (!credentials.PGHOST || !credentials.PGPASSWORD)
    throw new Error("CLI temporary login credentials are unavailable.");
  const client = new pg.Client({
    host: credentials.PGHOST,
    port: Number(credentials.PGPORT || 5432),
    user: credentials.PGUSER,
    password: credentials.PGPASSWORD,
    database: credentials.PGDATABASE || "postgres",
    ssl: { ca, rejectUnauthorized: true },
    connectionTimeoutMillis: 15000,
  });
  await client.connect();
  // Supabase's short-lived CLI login role requires the same role switch as CLI commands.
  await client.query("set role postgres");
  return client;
}
export async function hostedAdminKey() {
  const { ref } = await target();
  const { stdout } = await cli([
    "projects",
    "api-keys",
    "--project-ref",
    ref,
    "--output",
    "json",
  ]);
  const keys = JSON.parse(stdout);
  const key = keys.find((k) => k.name === "service_role")?.api_key;
  if (!key)
    throw new Error(
      "A temporary server-side verification credential could not be obtained.",
    );
  return key;
}
