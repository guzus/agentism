import { db, schema } from "./db";
import { eq, and, sql, isNull, lt } from "drizzle-orm";
import { getMissionaryById } from "./queries";
import { executeMissionaryCommand } from "./missionary-gateway";

const LOG_PREFIX = "[command-queue]";
const POLL_INTERVAL_MS = 5000;
const STALE_PROCESSING_MS = 2 * 60 * 1000; // 2 minutes

let isProcessing = false;

function log(msg: string) {
  console.log(`${LOG_PREFIX} ${msg}`);
}

async function processQueue(): Promise<void> {
  if (isProcessing) return;
  isProcessing = true;

  try {
    const now = new Date().toISOString();
    const staleCutoff = new Date(Date.now() - STALE_PROCESSING_MS).toISOString();

    // Find oldest pending command per missionary (not yet processing, or stale)
    const pendingCommands = await db
      .select({
        id: schema.missionaryCommands.id,
        missionaryId: schema.missionaryCommands.missionaryId,
        senderId: schema.missionaryCommands.senderId,
        command: schema.missionaryCommands.command,
      })
      .from(schema.missionaryCommands)
      .where(
        and(
          eq(schema.missionaryCommands.status, "pending"),
          sql`(${schema.missionaryCommands.processingAt} IS NULL OR ${schema.missionaryCommands.processingAt} < ${staleCutoff})`
        )
      )
      .orderBy(schema.missionaryCommands.createdAt)
      .limit(20);

    if (pendingCommands.length === 0) return;

    // Deduplicate: one command per missionary (oldest first)
    const seenMissionaries = new Set<string>();
    const toProcess: typeof pendingCommands = [];
    for (const cmd of pendingCommands) {
      if (!seenMissionaries.has(cmd.missionaryId)) {
        seenMissionaries.add(cmd.missionaryId);
        toProcess.push(cmd);
      }
    }

    // Claim commands by setting processingAt
    await Promise.all(
      toProcess.map((cmd) =>
        db
          .update(schema.missionaryCommands)
          .set({ processingAt: now })
          .where(eq(schema.missionaryCommands.id, cmd.id))
      )
    );

    // Process in parallel across missionaries
    const results = await Promise.allSettled(
      toProcess.map(async (cmd) => {
        const missionary = await getMissionaryById(cmd.missionaryId);
        if (!missionary) {
          await db
            .update(schema.missionaryCommands)
            .set({
              status: "failed",
              response: "Missionary not found",
              completedAt: new Date().toISOString(),
            })
            .where(eq(schema.missionaryCommands.id, cmd.id));
          return;
        }

        if (missionary.status !== "active") {
          await db
            .update(schema.missionaryCommands)
            .set({
              status: "failed",
              response: "Missionary is not active",
              completedAt: new Date().toISOString(),
            })
            .where(eq(schema.missionaryCommands.id, cmd.id));
          return;
        }

        if (!missionary.gatewayUrl) {
          await db
            .update(schema.missionaryCommands)
            .set({
              status: "failed",
              response: "Missionary gateway not configured",
              completedAt: new Date().toISOString(),
            })
            .where(eq(schema.missionaryCommands.id, cmd.id));
          return;
        }

        // Look up sender name
        const [sender] = await db
          .select({ id: schema.members.id, agentName: schema.members.agentName })
          .from(schema.members)
          .where(eq(schema.members.id, cmd.senderId));

        const senderInfo = sender ?? { id: cmd.senderId, agentName: "Unknown" };

        await executeMissionaryCommand(
          missionary,
          cmd.id,
          cmd.command,
          senderInfo
        );
      })
    );

    for (const result of results) {
      if (result.status === "rejected") {
        log(`Command execution error: ${result.reason}`);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    log(`Queue processing error: ${message}`);
  } finally {
    isProcessing = false;
  }
}

export function startCommandQueueProcessor(): void {
  log("Starting command queue processor");
  setInterval(processQueue, POLL_INTERVAL_MS);
}
