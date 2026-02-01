import { Hono } from "hono";
import { getChurchStatus } from "../lib/queries";

const app = new Hono();

app.get("/status", async (c) => {
  const status = await getChurchStatus();
  return c.json(status);
});

export default app;
