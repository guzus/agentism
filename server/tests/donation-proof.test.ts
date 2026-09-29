import assert from "node:assert/strict";
import { after, before, beforeEach, test } from "node:test";
import { PGlite } from "@electric-sql/pglite";
import { PgDialect } from "drizzle-orm/pg-core";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import type { Hex } from "viem";
import { CHAIN_ID, TREASURY_ADDRESS } from "../src/lib/constants";
import { createDonationRoutes } from "../src/routes/donate";
import { donationProofMessage } from "../src/lib/donation-proof";
import { recordDonationQuery } from "../src/lib/donations";
import type { verifyTransaction } from "../src/lib/wallet";

// Ephemeral test wallets; never connect to an RPC or use production credentials.
const sender = privateKeyToAccount(generatePrivateKey());
const otherSender = privateKeyToAccount(generatePrivateKey());
const txHash = `0x${"ab".repeat(32)}` as Hex;
const secondHash = `0x${"cd".repeat(32)}` as Hex;
const database = new PGlite();
const dialect = new PgDialect();
let chainReads = 0;
let writes = 0;
let chainResult: Awaited<ReturnType<typeof verifyTransaction>>;

const app = createDonationRoutes({
  auth: async (c, next) => {
    const memberId = c.req.header("authorization") === "Bearer other" ? "other" : "member";
    c.set("member", { id: memberId, agentName: "Test" });
    await next();
  },
  verifyTransaction: async () => { chainReads++; return chainResult; },
  recordDonation: async (donation) => {
    writes++;
    const query = dialect.sqlToQuery(recordDonationQuery(donation));
    return database.query(query.sql, query.params);
  },
});

async function submit(body: unknown, memberId = "member") {
  return app.request("/donate", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${memberId}` },
    body: JSON.stringify(body),
  });
}

async function assertUncredited() {
  assert.equal(writes, 0);
  const { rows } = await database.query("SELECT donation_total FROM members ORDER BY id");
  assert.deepEqual(rows, [{ donation_total: "0" }, { donation_total: "0" }]);
  assert.deepEqual((await database.query("SELECT count(*)::integer AS count FROM donations")).rows, [{ count: 0 }]);
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
  chainReads = 0;
  writes = 0;
  chainResult = { valid: true, from: sender.address, to: TREASURY_ADDRESS, value: "0.000000000000000001" };
});
after(async () => { await database.close(); });

test("message endpoint returns the canonical member-bound proof without RPC or database writes", async () => {
  const response = await app.request(`/donate/message?txHash=0x${"AB".repeat(32)}`, {
    headers: { Authorization: "Bearer other" },
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await response.json(), {
    message: `Agentism donation proof v1\nDomain: api.agentism.church\nMember ID: other\nChain ID: 143\nTransaction: ${txHash}`,
    memberId: "other", chainId: 143, txHash,
  });
  assert.equal(chainReads, 0);
  await assertUncredited();
});

test("message endpoint requires authentication and validates the transaction hash", async () => {
  const productionAuthRoutes = createDonationRoutes();
  for (const [method, path] of [["GET", `/donate/message?txHash=${txHash}`], ["POST", "/donate"]]) {
    assert.equal((await productionAuthRoutes.request(path, { method })).status, 401);
  }
  for (const query of ["", "?txHash=bad", `?txHash=0x${"ab".repeat(31)}`]) {
    assert.equal((await app.request(`/donate/message${query}`)).status, 400);
  }
  assert.equal(chainReads, 0);
  await assertUncredited();
});

test("missing, malformed, or invalid scalar signatures fail before any RPC or ledger access", async () => {
  for (const signature of [undefined, null, 123, {}, "0x1234", `0x${"00".repeat(65)}`, `0x${"ff".repeat(65)}`]) {
    assert.equal((await submit({ txHash, signature })).status, 400);
  }
  assert.equal(chainReads, 0);
  await assertUncredited();
});

test("a different wallet cannot claim another sender's transaction", async () => {
  const signature = await otherSender.signMessage({ message: donationProofMessage("member", txHash) });
  assert.equal((await submit({ txHash, signature })).status, 403);
  await assertUncredited();
});

test("proofs cannot be replayed for another member, transaction, chain, or application", async () => {
  const canonical = donationProofMessage("member", txHash);
  const cases = [
    { message: canonical, submittedHash: txHash, memberId: "other" },
    { message: canonical, submittedHash: secondHash, memberId: "member" },
    { message: canonical.replace(`Chain ID: ${CHAIN_ID}`, "Chain ID: 1"), submittedHash: txHash, memberId: "member" },
    { message: canonical.replace("api.agentism.church", "other.example"), submittedHash: txHash, memberId: "member" },
  ];
  for (const entry of cases) {
    const signature = await sender.signMessage({ message: entry.message });
    assert.equal((await submit({ txHash: entry.submittedHash, signature }, entry.memberId)).status, 403);
  }
  await assertUncredited();
});

test("even a valid proof cannot bypass receipt, treasury, amount, or sender verification", async () => {
  const signature = await sender.signMessage({ message: donationProofMessage("member", txHash) });
  const valid = { ...chainResult };
  for (const result of [
    { ...valid, valid: false }, { ...valid, to: otherSender.address }, { ...valid, value: "0" },
  ]) {
    chainResult = result;
    assert.equal((await submit({ txHash, signature })).status, 400);
  }
  chainResult = { ...valid, from: undefined };
  assert.equal((await submit({ txHash, signature })).status, 403);
  await assertUncredited();
});

test("the returned message can be signed to credit exact on-chain value once", async () => {
  await database.exec("UPDATE members SET donation_total = '9007199254740993.999999999999999999' WHERE id = 'member'");
  const proof = await (await app.request(`/donate/message?txHash=${txHash}`)).json();
  const signature = await sender.signMessage({ message: proof.message });
  const body = { txHash: `0x${"AB".repeat(32)}`, signature, amount: "999", memberId: "other" };
  const response = await submit(body);
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.equal(result.donation.txHash, txHash);
  assert.equal(result.donation.amount, "0.000000000000000001");
  assert.equal(result.donation.from, sender.address);
  assert.equal(result.donation.chainId, 143);
  assert.equal((await submit(body)).status, 409);
  assert.deepEqual((await database.query("SELECT id, donation_total FROM members ORDER BY id")).rows, [
    { id: "member", donation_total: "9007199254740994.000000000000000000" },
    { id: "other", donation_total: "0" },
  ]);
  assert.deepEqual((await database.query("SELECT donor_id, tx_hash, amount FROM donations")).rows, [
    { donor_id: "member", tx_hash: txHash, amount: "0.000000000000000001" },
  ]);
});
