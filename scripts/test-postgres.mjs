// Creates and stops an isolated native PostgreSQL cluster. Never uses a user's DB.
import { execFile as execFileCallback, spawn } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join, basename, dirname } from "node:path";
import { randomBytes } from "node:crypto";
import { createServer } from "node:net";
import pg from "pg";
const execFile = promisify(execFileCallback);
const directory = await mkdtemp(join(tmpdir(), "form-pg-"));
const password = randomBytes(32).toString("hex");
const passwordFile = join(directory, "password");
const data = join(directory, "data");
let started = false;
async function binary(name) {
  if (process.env.PG_BIN)
    return join(
      process.env.PG_BIN,
      process.platform === "win32" ? `${name}.exe` : name,
    );
  const { stdout } = await execFile(
    process.platform === "win32" ? "where.exe" : "which",
    [name],
  );
  return stdout.trim().split(/\r?\n/)[0];
}
async function run(command, args, env = {}) {
  const child = spawn(command, args, {
    stdio: "inherit",
    env: { ...process.env, ...env },
  });
  return new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`Command failed (${code})`)),
    );
  });
}
const pgctl = await binary("pg_ctl");
async function control(args) {
  // Windows postgres inherits pipe handles: wait for pg_ctl's exit, not pipe close.
  const child = spawn(pgctl, args, { stdio: "ignore", windowsHide: true });
  return new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`pg_ctl failed (${code})`)),
    );
  });
}
try {
  const port = await new Promise((resolve, reject) => {
    const server = createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
  await writeFile(passwordFile, password, { mode: 0o600 });
  await execFile(await binary("initdb"), [
    "-D",
    data,
    "-U",
    "form_test_admin",
    "--auth-host=scram-sha-256",
    "--auth-local=scram-sha-256",
    `--pwfile=${passwordFile}`,
    "--no-locale",
    "--encoding=UTF8",
  ]);
  await rm(passwordFile);
  await control([
    "-D",
    data,
    "-l",
    join(directory, "server.log"),
    "-o",
    `-p ${port} -h 127.0.0.1`,
    "-w",
    "start",
  ]);
  started = true;
  const url = `postgresql://form_test_admin:${password}@127.0.0.1:${port}/postgres`;
  const admin = new pg.Client({ connectionString: url });
  await admin.connect();
  await admin.query("create database form_test");
  await admin.end();
  const databaseUrl = url.replace("/postgres", "/form_test");
  console.log(
    "Isolated PostgreSQL 17 cluster started with SCRAM authentication.",
  );
  await run(process.execPath, ["--test", "tests/database.test.mjs"], {
    DATABASE_TEST_URL: databaseUrl,
  });
  if (process.argv.includes("--generate-types"))
    await run(process.execPath, ["scripts/generate-database-types.mjs"], {
      DATABASE_TEST_URL: databaseUrl,
    });
} finally {
  if (started) await control(["-D", data, "-m", "fast", "-w", "stop"]);
  // Resolve and verify the owned temporary target before recursive cleanup.
  const target = resolve(directory);
  if (
    dirname(target) !== resolve(tmpdir()) ||
    !basename(target).startsWith("form-pg-")
  )
    throw new Error("Unsafe temporary cleanup path");
  await rm(target, { recursive: true, force: true });
}
