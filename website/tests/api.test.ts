import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { APIError, fetchAPI } from "../src/lib/api";

afterEach(() => mock.restoreAll());

test("preserves request headers, method, and payload", async () => {
  const headers = new Headers({ Authorization: "Bearer test-only-token" });
  mock.method(globalThis, "fetch", async (_url: string, options: RequestInit) => {
    assert.equal(options.method, "POST");
    assert.equal(options.body, '{"name":"test"}');
    assert.equal(new Headers(options.headers).get("Authorization"), "Bearer test-only-token");
    return Response.json({ accepted: true });
  });
  assert.deepEqual(await fetchAPI("/test", { method: "POST", body: '{"name":"test"}', headers }), { accepted: true });
});

test("preserves HTTP status and a useful JSON error message", async () => {
  mock.method(globalThis, "fetch", async () => Response.json({ error: "Claim expired" }, { status: 410 }));
  await assert.rejects(fetchAPI("/test"), (error: unknown) => error instanceof APIError && error.status === 410 && error.message === "Claim expired");
});

test("does not display an upstream HTML failure body to users", async () => {
  mock.method(globalThis, "fetch", async () => new Response("<html>Internal proxy details</html>", { status: 502, headers: { "content-type": "text/html" } }));
  await assert.rejects(fetchAPI("/test"), (error: unknown) => error instanceof APIError && error.status === 502 && !error.message.includes("Internal proxy"));
});

test("rejects a successful response with the wrong format", async () => {
  mock.method(globalThis, "fetch", async () => new Response("upstream login page", { headers: { "content-type": "text/html" } }));
  await assert.rejects(fetchAPI("/test"), /unexpected response/);
});

test("accepts structured JSON media types", async () => {
  mock.method(globalThis, "fetch", async () => new Response('{"ready":true}', { headers: { "content-type": "application/hal+json" } }));
  assert.deepEqual(await fetchAPI("/test"), { ready: true });
});

test("bounds a stalled request with a timeout", async () => {
  mock.method(globalThis, "fetch", (_url: string, options: RequestInit) => new Promise((_resolve, reject) => {
    options.signal?.addEventListener("abort", () => reject(options.signal?.reason), { once: true });
  }));
  await assert.rejects(fetchAPI("/test", { timeoutMs: 10 }), /took too long/);
});

test("keeps the timeout active while reading a stalled response body", async () => {
  mock.method(globalThis, "fetch", async (_url: string, options: RequestInit) => new Response(new ReadableStream({
    start(controller) {
      options.signal?.addEventListener("abort", () => controller.error(options.signal?.reason), { once: true });
    },
  }), { headers: { "content-type": "application/json" } }));
  await assert.rejects(fetchAPI("/test", { timeoutMs: 10 }), /took too long/);
});

test("respects caller cancellation instead of relabeling it as a timeout", async () => {
  const controller = new AbortController();
  mock.method(globalThis, "fetch", (_url: string, options: RequestInit) => new Promise((_resolve, reject) => {
    options.signal?.addEventListener("abort", () => reject(options.signal?.reason), { once: true });
  }));
  const request = fetchAPI("/test", { signal: controller.signal });
  controller.abort();
  await assert.rejects(request, (error: unknown) => error instanceof DOMException && error.name === "AbortError");
});
