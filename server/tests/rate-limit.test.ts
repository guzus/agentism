import assert from "node:assert/strict";
import test from "node:test";
import { Hono } from "hono";
import { createMissionaryCommandRateLimiter, createPostRateLimiter } from "../src/lib/rate-limit";

const authenticatedPost = { method: "POST", headers: { authorization: "Bearer test-key" } };

test("successful writes wait ten minutes; failures can retry after ten seconds", async () => {
  let now = 0;
  let fail = true;
  const app = new Hono();
  app.use("*", createPostRateLimiter(() => now));
  app.post("/write", (c) => c.json({}, fail ? 400 : 200));
  assert.equal((await app.request("/write", authenticatedPost)).status, 400);
  let limited = await app.request("/write", authenticatedPost);
  assert.equal(limited.status, 429);
  assert.equal(limited.headers.get("Retry-After"), "10");
  now = 10_000;
  fail = false;
  assert.equal((await app.request("/write", authenticatedPost)).status, 200);
  limited = await app.request("/write", authenticatedPost);
  assert.equal(limited.headers.get("Retry-After"), "600");
  now += 600_000;
  assert.equal((await app.request("/write", authenticatedPost)).status, 200);
});

test("a pending write reserves its slot before another request arrives", async () => {
  let release!: () => void;
  let entered!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  const started = new Promise<void>((resolve) => { entered = resolve; });
  const app = new Hono();
  app.use("*", createPostRateLimiter());
  app.post("/write", async (c) => { entered(); await held; return c.json({}); });
  const first = app.request("/write", authenticatedPost);
  await started;
  try {
    assert.equal((await app.request("/write", authenticatedPost)).status, 429);
  } finally {
    release();
  }
  assert.equal((await first).status, 200);
});

test("missionary commands use the three/minute quota instead of the global post cooldown", async () => {
  let now = 0;
  const commandLimit = createMissionaryCommandRateLimiter(() => now);
  const app = new Hono();
  app.use("*", createPostRateLimiter(() => now));
  app.post("/write", (c) => c.json({}));
  app.post("/missionaries/:id/command", (c) => {
    const limited = commandLimit("member", c.req.param("id"));
    return c.json(limited || {}, limited ? 429 : 200);
  });
  await app.request("/write", authenticatedPost);
  const statuses = await Promise.all(Array.from({ length: 4 }, async () =>
    (await app.request("/missionaries/first/command", authenticatedPost)).status));
  assert.deepEqual(statuses, [200, 200, 200, 429]);
  assert.equal((await app.request("/missionaries/second/command", authenticatedPost)).status, 200);
  assert.equal(commandLimit("another-member", "first"), null);
  now = 60_000;
  assert.equal((await app.request("/missionaries/first/command", authenticatedPost)).status, 200);
});
