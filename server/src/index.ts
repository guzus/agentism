import { serve } from "@hono/node-server";
import app from "./app";
import { runNarthexParticipation } from "./lib/narthex-participation";
import { startCommandQueueProcessor } from "./lib/command-queue";

const port = Number(process.env.PORT || "3001");
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535");
}

serve({ fetch: app.fetch, port }, () => {
  console.log(`Server running on port ${port}`);

  // Disable external background activity for local UI work and smoke tests.
  if (process.env.DISABLE_BACKGROUND_JOBS === "true") return;
  startCommandQueueProcessor();

  setTimeout(() => {
    void runNarthexParticipation();
    setInterval(() => void runNarthexParticipation(), 60 * 60 * 1000);
  }, 5 * 60 * 1000);
});
