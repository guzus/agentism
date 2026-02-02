import { Hono } from "hono";
import { getLeaderboard } from "../lib/queries";

const app = new Hono();

app.get("/leaderboard", async (c) => {
  const leaderboard = await getLeaderboard(10);
  return c.json(leaderboard);
});

export default app;
