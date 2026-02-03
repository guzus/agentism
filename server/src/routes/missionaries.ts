import { Hono } from "hono";
import { db, schema } from "../lib/db";
import { eq, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { authenticateRequest } from "../lib/auth";
import {
  getTopDonors,
  getMissionaryById,
  getMissionariesByOwner,
  getCommunityMissionaries,
  getMissionaryCommands,
} from "../lib/queries";
import { missionaryCommandRateLimit } from "../lib/rate-limit";

const app = new Hono();

// Helper to check if member is a Disciple (top 128 donors)
async function isDisciple(memberId: string): Promise<boolean> {
  const topDonors = await getTopDonors(128);
  return topDonors.includes(memberId);
}

// GET /missionaries/public - Public endpoint for community missionaries (no auth)
app.get("/missionaries/public", async (c) => {
  const communityMissionaries = await getCommunityMissionaries();

  return c.json({
    own: [],
    community: communityMissionaries.map((m) => ({
      id: m.id,
      name: m.name,
      status: m.status,
      totalCommands: m.totalCommands,
      totalTokens: m.totalTokens,
      releasedAt: m.releasedAt,
    })),
  });
});

// GET /missionaries/activity - Public real-time activity feed
app.get("/missionaries/activity", async (c) => {
  // Get recent commands across all active/released missionaries
  const recentCommands = await db
    .select({
      id: schema.missionaryCommands.id,
      missionaryId: schema.missionaryCommands.missionaryId,
      missionaryName: schema.missionaries.name,
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
    .where(
      sql`${schema.missionaries.status} IN ('active', 'released')`
    )
    .orderBy(sql`${schema.missionaryCommands.createdAt} DESC`)
    .limit(20);

  return c.json({
    activity: recentCommands.map((cmd) => ({
      id: cmd.id,
      missionaryName: cmd.missionaryName,
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
  });
});

// GET /missionaries/stats - Public stats endpoint
app.get("/missionaries/stats", async (c) => {
  const communityMissionaries = await getCommunityMissionaries();

  const totalActive = communityMissionaries.filter(
    (m) => m.status === "released" || m.status === "active"
  ).length;

  const totalCommands = communityMissionaries.reduce(
    (sum, m) => sum + BigInt(m.totalCommands),
    0n
  );

  const totalTokens = communityMissionaries.reduce(
    (sum, m) => sum + BigInt(m.totalTokens),
    0n
  );

  return c.json({
    totalActive,
    totalCommunity: communityMissionaries.length,
    totalCommands: totalCommands.toString(),
    totalTokens: totalTokens.toString(),
  });
});

// POST /missionaries/request - Disciples only can request a new missionary
app.post("/missionaries/request", async (c) => {
  const member = await authenticateRequest(c.req.header("authorization"));
  if (!member) {
    return c.json(
      { error: "Unauthorized. Provide a valid Bearer token." },
      401
    );
  }

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

// GET /missionaries - List own + community missionaries
app.get("/missionaries", async (c) => {
  const member = await authenticateRequest(c.req.header("authorization"));
  if (!member) {
    return c.json(
      { error: "Unauthorized. Provide a valid Bearer token." },
      401
    );
  }

  const [ownMissionaries, communityMissionaries] = await Promise.all([
    getMissionariesByOwner(member.id),
    getCommunityMissionaries(),
  ]);

  // Filter out own missionaries from community list to avoid duplicates
  const ownIds = new Set(ownMissionaries.map((m) => m.id));
  const community = communityMissionaries.filter((m) => !ownIds.has(m.id));

  return c.json({
    own: ownMissionaries.map((m) => ({
      id: m.id,
      name: m.name,
      status: m.status,
      totalCommands: m.totalCommands,
      totalTokens: m.totalTokens,
      createdAt: m.createdAt,
      approvedAt: m.approvedAt,
      releasedAt: m.releasedAt,
    })),
    community: community.map((m) => ({
      id: m.id,
      name: m.name,
      status: m.status,
      totalCommands: m.totalCommands,
      totalTokens: m.totalTokens,
      releasedAt: m.releasedAt,
    })),
  });
});

// GET /missionaries/:id - Get missionary details
app.get("/missionaries/:id", async (c) => {
  const member = await authenticateRequest(c.req.header("authorization"));
  if (!member) {
    return c.json(
      { error: "Unauthorized. Provide a valid Bearer token." },
      401
    );
  }

  const { id } = c.req.param();
  const missionary = await getMissionaryById(id);

  if (!missionary) {
    return c.json({ error: "Missionary not found." }, 404);
  }

  // Only owner or anyone if released can view details
  const isOwner = missionary.ownerId === member.id;
  const isReleased = missionary.status === "released";

  if (!isOwner && !isReleased) {
    return c.json({ error: "Access denied." }, 403);
  }

  return c.json({
    id: missionary.id,
    name: missionary.name,
    status: missionary.status,
    gatewayUrl: isOwner ? missionary.gatewayUrl : undefined,
    config: isOwner ? JSON.parse(missionary.config) : undefined,
    totalCommands: missionary.totalCommands,
    totalTokens: missionary.totalTokens,
    createdAt: missionary.createdAt,
    approvedAt: missionary.approvedAt,
    releasedAt: missionary.releasedAt,
    isOwner,
  });
});

// POST /missionaries/:id/release - Release to community (immortal)
app.post("/missionaries/:id/release", async (c) => {
  const member = await authenticateRequest(c.req.header("authorization"));
  if (!member) {
    return c.json(
      { error: "Unauthorized. Provide a valid Bearer token." },
      401
    );
  }

  const { id } = c.req.param();
  const missionary = await getMissionaryById(id);

  if (!missionary) {
    return c.json({ error: "Missionary not found." }, 404);
  }

  if (missionary.ownerId !== member.id) {
    return c.json({ error: "Only the owner can release a missionary." }, 403);
  }

  if (missionary.status !== "active") {
    return c.json(
      { error: "Only active missionaries can be released." },
      400
    );
  }

  const now = new Date().toISOString();

  await db
    .update(schema.missionaries)
    .set({
      status: "released",
      ownerId: null,
      releasedAt: now,
    })
    .where(eq(schema.missionaries.id, id));

  return c.json({
    id,
    status: "released",
    message: "Missionary released to the community. It is now immortal.",
  });
});

// POST /missionaries/:id/command - Send command to missionary
app.post("/missionaries/:id/command", async (c) => {
  const member = await authenticateRequest(c.req.header("authorization"));
  if (!member) {
    return c.json(
      { error: "Unauthorized. Provide a valid Bearer token." },
      401
    );
  }

  const { id } = c.req.param();
  const missionary = await getMissionaryById(id);

  if (!missionary) {
    return c.json({ error: "Missionary not found." }, 404);
  }

  // Check access: owner or released
  const isOwner = missionary.ownerId === member.id;
  const isReleased = missionary.status === "released";

  if (!isOwner && !isReleased) {
    return c.json({ error: "Access denied." }, 403);
  }

  // Check rate limit
  const rateLimitResult = await missionaryCommandRateLimit(
    member.id,
    missionary.id,
    isOwner
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

  // Create command record
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

  // If missionary is active, forward to gateway
  if (missionary.status === "active" || missionary.status === "released") {
    if (missionary.gatewayUrl) {
      try {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (missionary.gatewayToken) {
          headers.Authorization = `Bearer ${missionary.gatewayToken}`;
        }

        if (missionary.gatewayUrl.includes("/v1/chat/completions")) {
          const gatewayResponse = await fetch(missionary.gatewayUrl, {
            method: "POST",
            headers,
            body: JSON.stringify({
              model: "openclaw",
              messages: [{ role: "user", content: command.trim() }],
            }),
          });

          if (gatewayResponse.ok) {
            const result = (await gatewayResponse.json()) as {
              choices?: Array<{ message?: { content?: string } }>;
              usage?: { total_tokens?: number };
            };
            const response = result.choices?.[0]?.message?.content;
            const tokensUsed = result.usage?.total_tokens;

            await db
              .update(schema.missionaryCommands)
              .set({
                response,
                tokensUsed: tokensUsed?.toString(),
                status: "completed",
                completedAt: new Date().toISOString(),
              })
              .where(eq(schema.missionaryCommands.id, commandId));

            const newTotalCommands = (
              BigInt(missionary.totalCommands) + 1n
            ).toString();
            const newTotalTokens = (
              BigInt(missionary.totalTokens) + BigInt(tokensUsed ?? 0)
            ).toString();

            await db
              .update(schema.missionaries)
              .set({
                totalCommands: newTotalCommands,
                totalTokens: newTotalTokens,
              })
              .where(eq(schema.missionaries.id, id));

            return c.json({
              commandId,
              status: "completed",
              response,
              tokensUsed: tokensUsed?.toString(),
            });
          }
        } else {
          const gatewayResponse = await fetch(missionary.gatewayUrl, {
            method: "POST",
            headers,
            body: JSON.stringify({
              command: command.trim(),
              commandId,
              senderId: member.id,
              senderName: member.agentName,
            }),
          });

          if (gatewayResponse.ok) {
            const result = (await gatewayResponse.json()) as Record<
              string,
              unknown
            >;
            const response = result.response as string | undefined;
            const tokensUsed = result.tokensUsed as string | undefined;

            // Update command with response
            await db
              .update(schema.missionaryCommands)
              .set({
                response,
                tokensUsed,
                status: "completed",
                completedAt: new Date().toISOString(),
              })
              .where(eq(schema.missionaryCommands.id, commandId));

            // Update missionary stats
            const newTotalCommands = (
              BigInt(missionary.totalCommands) + 1n
            ).toString();
            const newTotalTokens = (
              BigInt(missionary.totalTokens) + BigInt(tokensUsed ?? "0")
            ).toString();

            await db
              .update(schema.missionaries)
              .set({
                totalCommands: newTotalCommands,
                totalTokens: newTotalTokens,
              })
              .where(eq(schema.missionaries.id, id));

            return c.json({
              commandId,
              status: "completed",
              response,
              tokensUsed,
            });
          }
        }

        // Gateway error
        await db
          .update(schema.missionaryCommands)
          .set({
            status: "failed",
            response: "Gateway error",
            completedAt: new Date().toISOString(),
          })
          .where(eq(schema.missionaryCommands.id, commandId));

        return c.json(
          {
            commandId,
            status: "failed",
            error: "Failed to reach missionary gateway.",
          },
          502
        );
      } catch (error) {
        await db
          .update(schema.missionaryCommands)
          .set({
            status: "failed",
            response: "Gateway connection error",
            completedAt: new Date().toISOString(),
          })
          .where(eq(schema.missionaryCommands.id, commandId));

        return c.json(
          {
            commandId,
            status: "failed",
            error: "Failed to connect to missionary gateway.",
          },
          502
        );
      }
    } else {
      // No gateway configured
      await db
        .update(schema.missionaryCommands)
        .set({
          status: "failed",
          response: "Missionary gateway not configured",
          completedAt: new Date().toISOString(),
        })
        .where(eq(schema.missionaryCommands.id, commandId));

      return c.json(
        {
          commandId,
          status: "failed",
          error: "Missionary is not fully provisioned.",
        },
        503
      );
    }
  }

  return c.json({
    commandId,
    status: "pending",
    message: "Command queued. Missionary is not yet active.",
  });
});

// GET /missionaries/:id/commands - Get command history
app.get("/missionaries/:id/commands", async (c) => {
  const member = await authenticateRequest(c.req.header("authorization"));
  if (!member) {
    return c.json(
      { error: "Unauthorized. Provide a valid Bearer token." },
      401
    );
  }

  const { id } = c.req.param();
  const missionary = await getMissionaryById(id);

  if (!missionary) {
    return c.json({ error: "Missionary not found." }, 404);
  }

  // Check access: owner or released
  const isOwner = missionary.ownerId === member.id;
  const isReleased = missionary.status === "released";

  if (!isOwner && !isReleased) {
    return c.json({ error: "Access denied." }, 403);
  }

  const commands = await getMissionaryCommands(id);

  return c.json({
    missionaryId: id,
    commands: commands.map((cmd) => ({
      id: cmd.id,
      senderId: cmd.senderId,
      command: cmd.command,
      response: cmd.response,
      tokensUsed: cmd.tokensUsed,
      status: cmd.status,
      createdAt: cmd.createdAt,
      completedAt: cmd.completedAt,
    })),
  });
});

export default app;
