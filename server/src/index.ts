import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { rateLimitPost } from "./lib/rate-limit";

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

const app = new Hono();

// CORS
app.use(
  "*",
  cors({
    origin: process.env.CORS_ORIGIN || "https://agentism.church",
    allowHeaders: ["Authorization", "Content-Type"],
    allowMethods: ["GET", "POST", "OPTIONS"],
  })
);

// Rate limit: 1 POST per 5 minutes per agent
app.use("*", rateLimitPost);

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

const port = parseInt(process.env.PORT || "3001", 10);

serve({ fetch: app.fetch, port }, () => {
  console.log(`Server running on port ${port}`);
});
