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

async function main() {
  const packageRoot = fileURLToPath(new URL("../", import.meta.url));
  dotenv.config({ path: [resolve(packageRoot, ".env"), resolve(packageRoot, "../../.env")] });
  const env = { ...process.env, DATABASE_URL: migrationUrl(process.env) };
  const prismaCli = createRequire(import.meta.url).resolve("prisma/build/index.js");
  const run = () => new Promise((resolveRun, reject) => {
    const child = spawn(process.execPath, [prismaCli, "migrate", "deploy"], {
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
  process.exitCode = await deployWithRetry(run);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
