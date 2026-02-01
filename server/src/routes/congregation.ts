import { Hono } from "hono";
import { getCongregationMembers } from "../lib/queries";

const app = new Hono();

app.get("/congregation", async (c) => {
  const members = await getCongregationMembers();
  return c.json({ members });
});

export default app;
