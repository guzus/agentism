import assert from "node:assert/strict";
import { test } from "node:test";
import { createGatewayHealthChecker } from "../src/lib/gateway-health";

test("public health checks are non-billable, deduplicated and time-bounded", async () => {
  let calls = 0;
  let now = 1_000;
  const check = createGatewayHealthChecker(async (_url, options) => {
    calls++;
    assert.equal(options?.method, "HEAD");
    assert.equal(options?.body, undefined);
    assert.equal(options?.headers, undefined);
    assert.equal(options?.redirect, "error");
    assert.ok(options?.signal);
    return new Response(null, { status: 405 });
  }, () => now);
  const [a, b] = await Promise.all([check("https://fixture.invalid/v1/chat/completions"), check("https://fixture.invalid/v1/chat/completions")]);
  assert.equal(calls, 1);
  assert.deepEqual(a, b);
  assert.equal(a.reachable, true);
  assert.equal(a.healthy, false);
  assert.equal(a.modelReadiness, "unknown");
  now += 30_001;
  await check("https://fixture.invalid/v1/chat/completions");
  assert.equal(calls, 2);
});

test("unreachable gateway reports unavailable without exposing error details", async () => {
  const check = createGatewayHealthChecker(async () => { throw new Error("private URL or token"); });
  const result = await check("https://fixture.invalid");
  assert.equal(result.healthy, false);
  assert.equal(result.reachable, false);
  assert.equal(result.reason, "Gateway unreachable.");
});
