import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/app";
import { createAdminSession, invalidateAdminSession, verifyAdminPassword, verifyAdminSession } from "../src/lib/admin-auth";

function restoreEnv(name: string, previous: string | undefined) {
  if (previous === undefined) delete process.env[name];
  else process.env[name] = previous;
}

test("health and JSON not-found responses work without database or background jobs", async () => {
  const app = createApp();
  const response = await app.request("/healthz");
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: "ok" });
  const missing = await app.request("/missing");
  assert.equal(missing.status, 404);
  assert.deepEqual(await missing.json(), { error: "Not found." });
});

test("malformed JSON and non-object bodies return 400 before route/database handling", async () => {
  const app = createApp();
  for (const path of ["/join", "/donate", "/admin/login", "/missionaries/a/command"]) {
    for (const body of ["{", "null", "[]", '"string"']) {
      const response = await app.request(path, {
        method: "POST", headers: { "Content-Type": "application/json" }, body,
      });
      assert.equal(response.status, 400, `${path} ${body}`);
      assert.equal(typeof (await response.json()).error, "string");
    }
  }
});

test("oversized requests are rejected before parsing JSON", async () => {
  const response = await createApp().request("/join", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ agentName: "x".repeat(5 * 1024 * 1024) }),
  });
  assert.equal(response.status, 413);
});

test("CORS honors explicit origins and exposes retry headers", async () => {
  const previous = process.env.CORS_ORIGIN;
  process.env.CORS_ORIGIN = "https://one.example, https://two.example/";
  try {
    const app = createApp();
    const response = await app.request("/healthz", { headers: { Origin: "https://two.example" } });
    assert.equal(response.headers.get("Access-Control-Allow-Origin"), "https://two.example");
    assert.equal(response.headers.get("Access-Control-Expose-Headers"), "Retry-After");
    const denied = await app.request("/healthz", { headers: { Origin: "https://evil.example" } });
    assert.equal(denied.headers.get("Access-Control-Allow-Origin"), null);
    const preflight = await app.request("/donate", { method: "OPTIONS", headers: {
      Origin: "https://one.example", "Access-Control-Request-Method": "POST",
    } });
    assert.equal(preflight.status, 204);
    assert.match(preflight.headers.get("Access-Control-Allow-Headers") || "", /Authorization/);
  } finally { restoreEnv("CORS_ORIGIN", previous); }
});

test("legacy server errors are sanitized while retaining status and CORS", async () => {
  const app = createApp();
  app.get("/test-error", (c) => c.json({ error: "postgres://private-password@db" }, 503));
  const response = await app.request("/test-error");
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "Internal server error. Please try again later." });
});

test("CORS derives apex and www origins from either SITE_URL spelling", async () => {
  const previousSite = process.env.SITE_URL;
  const previousCors = process.env.CORS_ORIGIN;
  delete process.env.CORS_ORIGIN;
  try {
    for (const site of ["https://agentism.church/", "https://www.agentism.church/"]) {
      process.env.SITE_URL = site;
      const app = createApp();
      for (const origin of ["https://agentism.church", "https://www.agentism.church"]) {
        const res = await app.request("/healthz", { headers: { Origin: origin } });
        assert.equal(res.headers.get("Access-Control-Allow-Origin"), origin);
      }
      const res = await app.request("/healthz", { headers: { Origin: "https://www.www.agentism.church" } });
      assert.equal(res.headers.get("Access-Control-Allow-Origin"), null);
    }
  } finally {
    restoreEnv("SITE_URL", previousSite);
    restoreEnv("CORS_ORIGIN", previousCors);
  }
});

test("admin credentials reject invalid types; sessions are random and revocable", async () => {
  const previous = process.env.ADMIN_PASSWORD;
  process.env.ADMIN_PASSWORD = "test-admin-password";
  try {
    assert.equal(verifyAdminPassword("test-admin-password"), true);
    assert.equal(verifyAdminPassword("wrong"), false);
    assert.equal(verifyAdminPassword({ password: "test-admin-password" }), false);
    const first = createAdminSession();
    const second = createAdminSession();
    assert.notEqual(first, second);
    assert.equal(verifyAdminSession(first), true);
    invalidateAdminSession(first);
    assert.equal(verifyAdminSession(first), false);
    assert.equal(verifyAdminSession(second), true);
    invalidateAdminSession(second);
    delete process.env.ADMIN_PASSWORD;
    assert.equal(verifyAdminPassword(""), false);
  } finally { restoreEnv("ADMIN_PASSWORD", previous); }
});

test("admin login and logout work through the mounted API without a database", async () => {
  const previous = process.env.ADMIN_PASSWORD;
  process.env.ADMIN_PASSWORD = "test-admin-password";
  try {
    const app = createApp();
    const invalid = await app.request("/admin/login", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: '{"password":123}',
    });
    assert.equal(invalid.status, 400);
    const login = await app.request("/admin/login", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: '{"password":"test-admin-password"}',
    });
    assert.equal(login.status, 200);
    assert.equal(login.headers.get("Cache-Control"), "no-store");
    const { token } = await login.json();
    assert.equal(verifyAdminSession(token), true);
    const logout = await app.request("/admin/logout", { method: "POST", headers: { Authorization: `Admin ${token}` } });
    assert.equal(logout.status, 200);
    assert.equal(verifyAdminSession(token), false);
  } finally { restoreEnv("ADMIN_PASSWORD", previous); }
});

test("join rejects blank names and invalid model or missionary credential types before database writes", async () => {
  const app = createApp();
  for (const body of [
    { agentName: "  " }, { agentName: "name", model: 123 },
    { agentName: "name", model: "m".repeat(65) }, { agentName: "a".repeat(65) },
    { agentName: "name", missionaryId: "id" },
    { agentName: "name", missionaryId: {}, missionaryToken: "token" },
  ]) {
    const response = await app.request("/join", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    assert.equal(response.status, 400);
  }
});
