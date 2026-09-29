import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { claimCommandQuery, completeCommandQuery, normalizeTokenCount } from "../src/lib/command-persistence";

const database = new PGlite();
const dialect = new PgDialect();
const now = "2026-09-29T12:00:00.000Z";
const stale = "2026-09-29T11:58:00.000Z";
async function execute(statement: SQL) {
  const query = dialect.sqlToQuery(statement);
  return database.query(query.sql, query.params);
}
const complete = (commandId = "first", tokensUsed: unknown = "10") => completeCommandQuery({
  commandId, missionaryId: "missionary", response: "response", tokensUsed, completedAt: now,
});
before(async () => {
  await database.exec(`
    CREATE TABLE missionaries (id text PRIMARY KEY, total_commands text NOT NULL DEFAULT '0', total_tokens text NOT NULL DEFAULT '0');
    CREATE TABLE missionary_commands (id text PRIMARY KEY, missionary_id text REFERENCES missionaries(id),
      status text DEFAULT 'pending', processing_at text, response text, tokens_used text, completed_at text);
  `);
});
beforeEach(async () => {
  await database.exec(`TRUNCATE missionary_commands, missionaries;
    INSERT INTO missionaries(id) VALUES ('missionary');
    INSERT INTO missionary_commands(id, missionary_id) VALUES ('first', 'missionary'), ('second', 'missionary');`);
});
after(async () => { await database.close(); });

test("only one overlapping worker can claim the same pending command", async () => {
  const claims = await Promise.all([execute(claimCommandQuery("first", now, stale)), execute(claimCommandQuery("first", now, stale))]);
  assert.equal(claims.reduce((sum, result) => sum + result.rows.length, 0), 1);
});

test("stale leases can be recovered, but completed commands cannot be claimed", async () => {
  await database.query("UPDATE missionary_commands SET processing_at = $1 WHERE id = 'first'", ["2026-09-29T11:00:00.000Z"]);
  assert.equal((await execute(claimCommandQuery("first", now, stale))).rows.length, 1);
  await execute(complete());
  assert.equal((await execute(claimCommandQuery("first", "2026-09-29T13:00:00.000Z", now))).rows.length, 0);
});

test("command completion counts each command once with exact large token totals", async () => {
  await database.exec("UPDATE missionaries SET total_tokens = '9007199254740993'");
  await Promise.all([execute(complete()), execute(complete()), execute(complete("second", "2"))]);
  const { rows } = await database.query("SELECT total_commands, total_tokens FROM missionaries");
  assert.deepEqual(rows, [{ total_commands: "2", total_tokens: "9007199254741005" }]);
});

test("invalid token usage and malformed historical stats do not corrupt counts", async () => {
  await database.exec("UPDATE missionaries SET total_tokens = 'NaN', total_commands = 'invalid'");
  await execute(complete("first", "-1"));
  const { rows } = await database.query("SELECT total_commands, total_tokens FROM missionaries");
  assert.deepEqual(rows, [{ total_commands: "1", total_tokens: "0" }]);
  for (const value of [null, -10, 1.5, Number.MAX_SAFE_INTEGER + 1, "1.5", "foo", {}]) {
    assert.equal(normalizeTokenCount(value), "0");
  }
});

test("failed stats persistence rolls back command completion", async () => {
  await database.exec("ALTER TABLE missionaries ADD CONSTRAINT commands_limit CHECK(total_commands = '0')");
  try {
    await assert.rejects(execute(complete()), /check constraint/);
    const { rows } = await database.query("SELECT status FROM missionary_commands WHERE id = 'first'");
    assert.deepEqual(rows, [{ status: "pending" }]);
  } finally { await database.exec("ALTER TABLE missionaries DROP CONSTRAINT commands_limit"); }
});
