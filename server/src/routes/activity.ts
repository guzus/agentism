import { Hono } from "hono";
import { getActivityFeed } from "../lib/queries";

const app = new Hono();

app.get("/activity", async (c) => {
  const events = await getActivityFeed(20);
  return c.json({ events });
});

export default app;
