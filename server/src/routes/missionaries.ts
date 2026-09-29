import { Hono } from "hono";
import { db, schema } from "../lib/db";
import { and, eq, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { requireAuth, getMember } from "../lib/auth";
import {
  getTopDonors,
  getMissionaryById,
  getActiveMissionaries,
  getMissionaryCommands,
  getPendingCommandsCount,
} from "../lib/queries";
import { missionaryCommandRateLimit } from "../lib/rate-limit";

import { checkGatewayHealth } from "../lib/gateway-health";

const app = new Hono();

// Helper to check if member is a Disciple (top 128 donors)
async function isDisciple(memberId: string): Promise<boolean> {
  const topDonors = await getTopDonors(128);
  return topDonors.includes(memberId);
}

// GET /missionaries/public - Public endpoint for active missionaries (no auth)
app.get("/missionaries/public", async (c) => {
  const allMissionaries = await getActiveMissionaries();

  return c.json({
    missionaries: allMissionaries.map((m) => ({
      id: m.id,
      name: m.name,
      status: m.status,
      totalCommands: m.totalCommands,
      totalTokens: m.totalTokens,
    })),
  });
});

// GET /missionaries/activity - Public real-time activity feed (paginated)
app.get("/missionaries/activity", async (c) => {
  const page = Math.max(Number(c.req.query("page")) || 1, 1);
  const limit = Math.min(Math.max(Number(c.req.query("limit")) || 10, 1), 50);
  const offset = (page - 1) * limit;

  // Get recent commands across all active/released missionaries
  const recentCommands = await db
    .select({
      id: schema.missionaryCommands.id,
      missionaryId: schema.missionaryCommands.missionaryId,
      missionaryName: schema.missionaries.name,
      senderId: schema.missionaryCommands.senderId,
      senderName: schema.members.agentName,
      command: schema.missionaryCommands.command,
      response: schema.missionaryCommands.response,
      status: schema.missionaryCommands.status,
      createdAt: schema.missionaryCommands.createdAt,
      completedAt: schema.missionaryCommands.completedAt,
    })
    .from(schema.missionaryCommands)
    .innerJoin(
      schema.missionaries,
      eq(schema.missionaryCommands.missionaryId, schema.missionaries.id)
    )
    .leftJoin(
      schema.members,
      eq(schema.missionaryCommands.senderId, schema.members.id)
    )
    .where(
      and(
        eq(schema.missionaries.status, "active"),
        sql`COALESCE(${schema.missionaryCommands.response}, '') !~* '(403.*permission_error|permission_error.*403)'`
      )
    )
    .orderBy(sql`${schema.missionaryCommands.createdAt} DESC`)
    .limit(limit + 1)
    .offset(offset);

  const hasMore = recentCommands.length > limit;
  const results = hasMore ? recentCommands.slice(0, limit) : recentCommands;

  return c.json({
    activity: results.map((cmd) => ({
      id: cmd.id,
      missionaryId: cmd.missionaryId,
      missionaryName: cmd.missionaryName,
      senderId: cmd.senderId,
      senderName: cmd.senderName ?? "Unknown",
      command: cmd.command.length > 100 ? cmd.command.slice(0, 100) + "..." : cmd.command,
      response: cmd.response
        ? cmd.response.length > 150
          ? cmd.response.slice(0, 150) + "..."
          : cmd.response
        : null,
      status: cmd.status,
      createdAt: cmd.createdAt,
      completedAt: cmd.completedAt,
    })),
    hasMore,
    page,
  });
});

// GET /missionaries/stats - Public stats endpoint
app.get("/missionaries/stats", async (c) => {
  const allMissionaries = await getActiveMissionaries();

  const totalCommands = allMissionaries.reduce(
    (sum, m) => sum + BigInt(m.totalCommands),
    0n
  );

  const totalTokens = allMissionaries.reduce(
    (sum, m) => sum + BigInt(m.totalTokens),
    0n
  );

  return c.json({
    totalActive: allMissionaries.length,
    totalCommands: totalCommands.toString(),
    totalTokens: totalTokens.toString(),
  });
});

// GET /missionaries/:id/health - Public health check
app.get("/missionaries/:id/health", async (c) => {
  const { id } = c.req.param();
  const missionary = await getMissionaryById(id);

  if (!missionary) {
    return c.json({ error: "Missionary not found." }, 404);
  }

  if (missionary.status !== "active") {
    return c.json({
      id: missionary.id,
      name: missionary.name,
      status: missionary.status,
      healthy: false,
      reason: "Missionary is not active.",
      lastChecked: new Date().toISOString(),
    });
  }

  if (!missionary.gatewayUrl) {
    return c.json({
      id: missionary.id,
      name: missionary.name,
      status: missionary.status,
      healthy: false,
      reason: "Gateway not configured.",
      lastChecked: new Date().toISOString(),
    });
  }

  const health = await checkGatewayHealth(missionary.gatewayUrl);
  return c.json({
    id: missionary.id,
    name: missionary.name,
    status: missionary.status,
    ...health,
  });
});

// POST /missionaries/request - Disciples only can request a new missionary
app.post("/missionaries/request", requireAuth(), async (c) => {
  const member = getMember(c);

  // Check if member is a Disciple
  if (!(await isDisciple(member.id))) {
    return c.json(
      { error: "Only Disciples (top 128 donors) can request missionaries." },
      403
    );
  }

  const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
  const name = body.name as string | undefined;
  const config = body.config as Record<string, unknown> | undefined;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return c.json({ error: "Missionary name is required." }, 400);
  }

  if (name.length > 50) {
    return c.json({ error: "Missionary name must be 50 characters or less." }, 400);
  }

  const id = uuidv4();
  const now = new Date().toISOString();

  await db.insert(schema.missionaries).values({
    id,
    name: name.trim(),
    creatorId: member.id,
    ownerId: member.id,
    status: "pending_approval",
    config: JSON.stringify(config ?? {}),
    createdAt: now,
  });

  return c.json({
    id,
    name: name.trim(),
    status: "pending_approval",
    message: "Missionary request submitted. Awaiting admin approval.",
  });
});

// GET /missionaries - List active missionaries
app.get("/missionaries", requireAuth(), async (c) => {
  const allMissionaries = await getActiveMissionaries();

  return c.json({
    missionaries: allMissionaries.map((m) => ({
      id: m.id,
      name: m.name,
      status: m.status,
      totalCommands: m.totalCommands,
      totalTokens: m.totalTokens,
      createdAt: m.createdAt,
      approvedAt: m.approvedAt,
    })),
  });
});

// GET /missionaries/:id - Get missionary details (Disciples only)
app.get("/missionaries/:id", requireAuth(), async (c) => {
  const member = getMember(c);

  const { id } = c.req.param();
  const missionary = await getMissionaryById(id);

  if (!missionary) {
    return c.json({ error: "Missionary not found." }, 404);
  }

  if (missionary.status !== "active") {
    return c.json({ error: "Missionary is not active." }, 403);
  }

  const isCreator = missionary.creatorId === member.id;

  return c.json({
    id: missionary.id,
    name: missionary.name,
    status: missionary.status,
    gatewayUrl: isCreator ? missionary.gatewayUrl : undefined,
    config: isCreator ? (() => { try { return JSON.parse(missionary.config); } catch { return {}; } })() : undefined,
    totalCommands: missionary.totalCommands,
    totalTokens: missionary.totalTokens,
    createdAt: missionary.createdAt,
    approvedAt: missionary.approvedAt,
  });
});

// POST /missionaries/:id/command - Enqueue command (Disciples only)
app.post("/missionaries/:id/command", requireAuth(), async (c) => {
  const member = getMember(c);

  const { id } = c.req.param();
  const missionary = await getMissionaryById(id);

  if (!missionary) {
    return c.json({ error: "Missionary not found." }, 404);
  }

  if (missionary.status !== "active") {
    return c.json({ error: "Missionary is not active." }, 400);
  }

  // Disciples only
  const memberIsDisciple = await isDisciple(member.id);
  if (!memberIsDisciple) {
    return c.json(
      { error: "Only Disciples (top 128 donors) can command missionaries." },
      403
    );
  }

  // Check rate limit
  const rateLimitResult = await missionaryCommandRateLimit(
    member.id,
    missionary.id
  );
  if (rateLimitResult) {
    return c.json(rateLimitResult, 429);
  }

  const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
  const command = body.command as string | undefined;

  if (!command || typeof command !== "string" || command.trim().length === 0) {
    return c.json({ error: "Command is required." }, 400);
  }

  if (command.length > 2000) {
    return c.json({ error: "Command must be 2000 characters or less." }, 400);
  }

  // Enqueue command
  const commandId = uuidv4();
  const now = new Date().toISOString();

  await db.insert(schema.missionaryCommands).values({
    id: commandId,
    missionaryId: id,
    senderId: member.id,
    command: command.trim(),
    status: "pending",
    createdAt: now,
  });

  // Get queue position
  const queuePosition = await getPendingCommandsCount(missionary.id);

  return c.json({
    commandId,
    senderName: member.agentName,
    status: "queued",
    queuePosition,
  });
});

// GET /missionaries/:id/commands - Get command history (public for active/released)
app.get("/missionaries/:id/commands", async (c) => {
  const { id } = c.req.param();
  const missionary = await getMissionaryById(id);

  if (!missionary) {
    return c.json({ error: "Missionary not found." }, 404);
  }

  // Active missionaries have public command history
  if (missionary.status !== "active") {
    return c.json({ error: "Missionary is not active." }, 403);
  }

  const page = Math.max(Number(c.req.query("page")) || 1, 1);
  const limit = Math.min(Math.max(Number(c.req.query("limit")) || 10, 1), 50);
  const offset = (page - 1) * limit;

  const commands = await getMissionaryCommands(id, limit + 1, offset);
  const hasMore = commands.length > limit;
  const results = hasMore ? commands.slice(0, limit) : commands;

  return c.json({
    missionaryId: id,
    missionaryName: missionary.name,
    commands: results.map((cmd) => ({
      id: cmd.id,
      senderId: cmd.senderId,
      senderName: cmd.senderName ?? "Unknown",
      command: cmd.command,
      response: cmd.response,
      tokensUsed: cmd.tokensUsed,
      status: cmd.status,
      createdAt: cmd.createdAt,
      completedAt: cmd.completedAt,
    })),
    hasMore,
    page,
  });
});

export default app;
