import assert from "node:assert/strict";
import { test } from "node:test";
import { createDatabase } from "../src/lib/db";

test("hosted PostgreSQL uses verified TLS and a bounded connection pool without connecting during import", async () => {
  const { pool } = createDatabase("postgresql://test:unused@db.example.test/database");
  assert.deepEqual(pool.options.ssl, { rejectUnauthorized: true });
  assert.equal(pool.options.max, 5);
  assert.equal(pool.options.connectionTimeoutMillis, 10_000);
  assert.equal(pool.totalCount, 0);
  await pool.end();
});

test("local disposable PostgreSQL can connect without TLS", async () => {
  const { pool } = createDatabase("postgresql://test:unused@127.0.0.1:5432/database");
  assert.equal(pool.options.ssl, false);
  await pool.end();
});

test("invalid database URL errors never include credentials", () => {
  for (const url of ["invalid secret-value", "https://test:secret-value@db.example.test/database"]) {
    assert.throws(() => createDatabase(url), { message: "DATABASE_URL must be a valid PostgreSQL connection URL" });
  }
});
