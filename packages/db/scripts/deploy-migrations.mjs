import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import dotenv from "dotenv";

/** Only the migration child receives this URL; runtime connections stay pooled. */
export function migrationUrl(env) {
  const value = env.DIRECT_URL || env.DATABASE_URL_UNPOOLED || env.POSTGRES_URL_NON_POOLING || env.DATABASE_URL;
  if (!value) throw new Error("DATABASE_URL or a direct migration URL is required");
  let url;
  try { url = new URL(value); }
  catch { throw new Error("Invalid database connection URL"); }
  if (!/^postgres(ql)?:$/.test(url.protocol)) throw new Error("Expected a PostgreSQL connection URL");
  if (url.hostname.endsWith(".neon.tech") && url.hostname.split(".")[0].endsWith("-pooler")) {
    url.hostname = url.hostname.replace("-pooler.", ".");
    url.searchParams.delete("pgbouncer");
    return url.toString();
  }
  return value;
}

export async function deployWithRetry(run, wait = sleep, log = console.warn) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const result = await run();
    if (result.code === 0) return 0;
    // Retry contention only. SQL errors and failed migrations need intervention.
    if (attempt === 3 || !/Timed out trying to acquire a postgres advisory lock/i.test(result.output)) {
      return result.code;
    }
    log(`Migration lock is busy; retrying in 5 seconds (${attempt}/3).`);
    await wait(5_000);
  }
}

export async function deployIfPending(run, wait = sleep, log = console.warn) {
  const status = await run("status");
  if (status.code === 0) {
    log("Database migrations are current; no migration lock is needed.");
    return 0;
  }
  return deployWithRetry(() => run("deploy"), wait, log);
}

async function main() {
  const packageRoot = fileURLToPath(new URL("../", import.meta.url));
  dotenv.config({ path: [resolve(packageRoot, ".env"), resolve(packageRoot, "../../.env")] });
  const env = { ...process.env, DATABASE_URL: migrationUrl(process.env) };
  const require = createRequire(import.meta.url);
  const prismaCli = require.resolve("prisma/build/index.js");
  const run = (command) => new Promise((resolveRun, reject) => {
    const child = spawn(process.execPath, [prismaCli, "migrate", command], {
      cwd: packageRoot, env, stdio: ["inherit", "pipe", "pipe"],
    });
    let output = "";
    for (const [stream, target] of [[child.stdout, process.stdout], [child.stderr, process.stderr]]) {
      stream.on("data", (chunk) => {
        target.write(chunk);
        output = (output + chunk.toString()).slice(-65_536);
      });
    }
    child.on("error", reject);
    child.on("close", (code) => resolveRun({ code: code ?? 1, output }));
  });
  process.exitCode = await deployIfPending(run);
  if (process.exitCode !== 0) {
    // Read-only diagnostics: never terminate sessions or bypass advisory locking.
    const { PrismaClient } = require("@prisma/client");
    const db = new PrismaClient({ datasources: { db: { url: env.DATABASE_URL } } });
    try {
      const locks = await db.$queryRaw`
        SELECT a.pid, a.state, a.application_name, a.backend_start, a.xact_start,
               a.state_change, a.wait_event_type, a.wait_event,
               a.query LIKE '%pg_advisory_lock(72707369)%' AS last_query_is_migration_lock
        FROM pg_locks l JOIN pg_stat_activity a ON a.pid = l.pid
        WHERE l.locktype = 'advisory' AND l.classid = 0
          AND l.objid = 72707369 AND l.objsubid = 1 AND l.granted`;
      console.error("Migration lock holders (read-only inspection):", JSON.stringify(locks));
    } catch {
      console.error("Could not inspect migration lock holders.");
    } finally { await db.$disconnect(); }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
