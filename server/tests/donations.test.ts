import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { randomUUID } from "node:crypto";
import { PGlite } from "@electric-sql/pglite";
import { PgDialect } from "drizzle-orm/pg-core";
import { recordDonationQuery, type DonationRecord } from "../src/lib/donations";

const database = new PGlite();
const dialect = new PgDialect();
const transactionHash = `0x${"Ab".repeat(32)}`;
const offering = (overrides: Partial<DonationRecord> = {}): DonationRecord => ({
  id: randomUUID(), donorId: "member", donorName: "Test", txHash: transactionHash,
  amount: "0.000000000000000001", chainId: 143, createdAt: new Date().toISOString(), ...overrides,
});
async function record(donation: DonationRecord) {
  const query = dialect.sqlToQuery(recordDonationQuery(donation));
  return database.query(query.sql, query.params);
}

before(async () => {
  await database.exec(`
    CREATE TABLE members (id text PRIMARY KEY, donation_total text NOT NULL DEFAULT '0');
    CREATE TABLE donations (
      id text PRIMARY KEY, donor_id text NOT NULL REFERENCES members(id), donor_name text NOT NULL,
      tx_hash text NOT NULL UNIQUE, amount text NOT NULL, chain_id integer NOT NULL, created_at text NOT NULL
    );
  `);
});
beforeEach(async () => {
  await database.exec("TRUNCATE donations, members; INSERT INTO members (id) VALUES ('member'), ('other');");
});
after(async () => { await database.close(); });

test("donations preserve one-wei precision even above JavaScript's safe integer", async () => {
  await database.exec("UPDATE members SET donation_total = '9007199254740993.999999999999999999' WHERE id = 'member'");
  await record(offering());
  const { rows } = await database.query<{ donation_total: string }>("SELECT donation_total FROM members WHERE id = 'member'");
  assert.equal(rows[0].donation_total, "9007199254740994.000000000000000000");
});

test("duplicate hashes in different case cannot credit a second member", async () => {
  const first = await record(offering());
  assert.equal(first.rows.length, 1);
  const second = await record(offering({ donorId: "other", txHash: transactionHash.toLowerCase() }));
  assert.equal(second.rows.length, 0);
  const { rows } = await database.query<{ id: string; donation_total: string }>("SELECT id, donation_total FROM members ORDER BY id");
  assert.deepEqual(rows, [{ id: "member", donation_total: "0.000000000000000001" }, { id: "other", donation_total: "0" }]);
});

test("historical mixed-case ledger entries also prevent duplicate credit", async () => {
  await database.query("INSERT INTO donations VALUES ('old', 'member', 'Test', $1, '1', 143, '2026-01-01')", [transactionHash]);
  assert.equal((await record(offering({ txHash: transactionHash.toLowerCase() }))).rows.length, 0);
  const { rows } = await database.query("SELECT count(*)::integer AS count FROM donations");
  assert.deepEqual(rows, [{ count: 1 }]);
});

test("simultaneous submissions accumulate exact totals and deduplicate one transaction", async () => {
  const results = await Promise.all([
    record(offering({ amount: "0.1" })),
    record(offering({ amount: "0.1" })),
    record(offering({ amount: "0.2", txHash: `0x${"cd".repeat(32)}` })),
  ]);
  assert.equal(results.reduce((count, result) => count + result.rows.length, 0), 2);
  const { rows } = await database.query<{ donation_total: string }>("SELECT donation_total FROM members WHERE id = 'member'");
  assert.equal(rows[0].donation_total, "0.3");
});

test("a balance-update failure rolls back the inserted donation", async () => {
  await database.exec("UPDATE members SET donation_total = 'invalid' WHERE id = 'member'");
  await assert.rejects(record(offering()), /invalid input syntax/);
  const { rows } = await database.query("SELECT count(*)::integer AS count FROM donations");
  assert.deepEqual(rows, [{ count: 0 }]);
});
