import { test } from "node:test";
import assert from "node:assert/strict";
import { migrationUrl, deployWithRetry } from "./deploy-migrations.mjs";

const pooled = "postgresql://user:p%40ss@ep-example-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&pgbouncer=true&schema=public";

test("Neon migrations bypass the pooler while preserving credentials and connection options", () => {
  const env = { DATABASE_URL: pooled };
  const direct = new URL(migrationUrl(env));
  assert.equal(direct.hostname, "ep-example.c-2.us-east-1.aws.neon.tech");
  assert.equal(direct.password, "p%40ss");
  assert.equal(direct.pathname, "/neondb");
  assert.equal(direct.searchParams.get("schema"), "public");
  assert.equal(direct.searchParams.get("sslmode"), "require");
  assert.equal(direct.searchParams.has("pgbouncer"), false);
  assert.equal(env.DATABASE_URL, pooled);
});

test("explicit migration URLs take precedence over the runtime URL", () => {
  for (const key of ["DIRECT_URL", "DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING"]) {
    const direct = "postgresql://user:password@direct.example.test/db";
    assert.equal(migrationUrl({ DATABASE_URL: pooled, [key]: direct }), direct);
  }
  assert.equal(migrationUrl({ DIRECT_URL: "postgresql://first/db", DATABASE_URL_UNPOOLED: "postgresql://second/db" }), "postgresql://first/db");
});

test("local and other database providers are unchanged", () => {
  for (const url of ["postgresql://localhost:5432/carebora?schema=public", "postgres://user@other-pooler.example.test/db"]) {
    assert.equal(migrationUrl({ DATABASE_URL: url }), url);
  }
});

test("missing or invalid connection strings fail without exposing credentials", () => {
  assert.throws(() => migrationUrl({}), /required/);
  assert.throws(() => migrationUrl({ DATABASE_URL: "secret-password" }), { message: "Invalid database connection URL" });
  assert.throws(() => migrationUrl({ DATABASE_URL: "https://example.test" }), /PostgreSQL/);
});

test("lock contention is retried and a later success permits the build", async () => {
  let attempts = 0;
  const delays = [];
  const code = await deployWithRetry(async () => ++attempts < 3
    ? { code: 1, output: "P1002: Timed out trying to acquire a postgres advisory lock" }
    : { code: 0, output: "Migrations applied" }, async (ms) => delays.push(ms), () => {});
  assert.equal(code, 0);
  assert.equal(attempts, 3);
  assert.deepEqual(delays, [5_000, 5_000]);
});

test("persistent lock contention fails after three attempts", async () => {
  let attempts = 0;
  const code = await deployWithRetry(async () => {
    attempts++;
    return { code: 1, output: "Timed out trying to acquire a postgres advisory lock" };
  }, async () => {}, () => {});
  assert.equal(code, 1);
  assert.equal(attempts, 3);
});

test("SQL and migration errors fail immediately without retrying", async () => {
  let attempts = 0;
  const code = await deployWithRetry(async () => {
    attempts++;
    return { code: 2, output: "P3018: A migration failed to apply" };
  }, async () => assert.fail("must not wait"));
  assert.equal(code, 2);
  assert.equal(attempts, 1);
});
