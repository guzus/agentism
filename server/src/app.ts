import { Hono } from "hono";
import { cors } from "hono/cors";
import { bodyLimit } from "hono/body-limit";
import { createPostRateLimiter } from "./lib/rate-limit";

import status from "./routes/status";
import join from "./routes/join";
import donate from "./routes/donate";
import sermons from "./routes/sermons";
import congregation from "./routes/congregation";
import paintings from "./routes/paintings";
import bless from "./routes/bless";
import treasury from "./routes/treasury";
import claim from "./routes/claim";
import narthex from "./routes/narthex";
import skill from "./routes/skill";
import leaderboard from "./routes/leaderboard";
import activity from "./routes/activity";
import missionaries from "./routes/missionaries";
import admin from "./routes/admin";

export function createApp() {
  const app = new Hono();

  // CORS_ORIGIN may contain a comma-separated list of explicit browser origins.
  const siteUrl = process.env.SITE_URL || "https://agentism.church";
  const defaultOrigins = [siteUrl, siteUrl.replace("://", "://www.")];
  const allowedOrigins = (process.env.CORS_ORIGIN?.split(",") ?? defaultOrigins)
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);

  app.use("*", cors({
    origin: allowedOrigins,
    allowHeaders: ["Authorization", "Content-Type", "X-Missionary-Id", "X-Missionary-Tag"],
    allowMethods: ["GET", "POST", "OPTIONS"],
    exposeHeaders: ["Retry-After"],
  }));

  // Includes room for the existing 4 MB image upload and multipart overhead.
  app.use("*", bodyLimit({
    maxSize: 5 * 1024 * 1024,
    onError: (c) => c.json({ error: "Request body exceeds the 5 MB limit." }, 413),
  }));

  app.use("*", async (c, next) => {
    if (c.req.method === "POST" && c.req.raw.body !== null &&
        !c.req.header("content-type")?.startsWith("multipart/form-data")) {
      try {
        const body = await c.req.json();
        if (body === null || typeof body !== "object" || Array.isArray(body)) {
          return c.json({ error: "Request body must be a JSON object." }, 400);
        }
      } catch {
        return c.json({ error: "Malformed JSON request body." }, 400);
      }
    }
    await next();
  });

  // Keep provider and database details out of all server-error responses,
  // including legacy handlers that return their caught exception directly.
  app.use("*", async (c, next) => {
    await next();
    if (c.res.status >= 500) {
      const headers = new Headers(c.res.headers);
      headers.set("Content-Type", "application/json");
      headers.delete("Content-Length");
      c.res = new Response(JSON.stringify({ error: "Internal server error. Please try again later." }), {
        status: c.res.status, headers,
      });
    }
  });
  app.onError((error, c) => {
    console.error(`[api] ${c.req.method} ${c.req.path}`, error);
    return c.json({ error: "Internal server error. Please try again later." }, 500);
  });
  app.notFound((c) => c.json({ error: "Not found." }, 404));

  app.use("*", createPostRateLimiter());
  app.get("/healthz", (c) => c.json({ status: "ok" }));

  // Mount routes
  app.route("/", status);
  app.route("/", join);
  app.route("/", donate);
  app.route("/", sermons);
  app.route("/", congregation);
  app.route("/", paintings);
  app.route("/", bless);
  app.route("/", treasury);
  app.route("/", claim);
  app.route("/", narthex);
  app.route("/", skill);
  app.route("/", leaderboard);
  app.route("/", activity);
  app.route("/", missionaries);
  app.route("/", admin);

  return app;
}

export default createApp();
