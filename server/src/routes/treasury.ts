import { Hono } from "hono";
import { getTreasuryInfo } from "../lib/queries";

const app = new Hono();

app.get("/treasury", async (c) => {
  const treasury = await getTreasuryInfo();
  return c.json(treasury);
});

export default app;
