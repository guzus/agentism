import { Hono } from "hono";
import { db, schema } from "../lib/db";
import { eq } from "drizzle-orm";
import {
  verifyAdminPassword,
  createAdminSession,
  verifyAdminSession,
} from "../lib/admin-auth";
import { getPendingMissionaryRequests, getMissionaryById } from "../lib/queries";
import { provisionMissionary, stopMissionary } from "../lib/missionaries";

const app = new Hono();

// Helper to extract session token from header
function getSessionToken(c: { req: { header: (name: string) => string | undefined } }): string | undefined {
  const auth = c.req.header("authorization");
  if (auth?.startsWith("Admin ")) {
    return auth.slice(6);
  }
  return undefined;
}

// POST /admin/login - Login with password, get session token
app.post("/admin/login", async (c) => {
  const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
  const password = body.password as string | undefined;

  if (!password) {
    return c.json({ error: "Password is required." }, 400);
  }

  if (!verifyAdminPassword(password)) {
    return c.json({ error: "Invalid password." }, 401);
  }

  const token = createAdminSession();

  return c.json({
    token,
    message: "Login successful. Use 'Admin {token}' in Authorization header.",
  });
});

// GET /admin/missionaries/pending - List pending requests
app.get("/admin/missionaries/pending", async (c) => {
  const token = getSessionToken(c);
  if (!verifyAdminSession(token)) {
    return c.json({ error: "Unauthorized. Admin session required." }, 401);
  }

  const pending = await getPendingMissionaryRequests();

  // Fetch creator names
  const creatorIds = [...new Set(pending.map((m) => m.creatorId))];
  const creators = await db
    .select({ id: schema.members.id, agentName: schema.members.agentName })
    .from(schema.members)
    .where(
      creatorIds.length > 0
        ? eq(schema.members.id, creatorIds[0])
        : undefined
    );

  // If there are multiple creators, we need to fetch all
  const creatorMap = new Map<string, string>();
  for (const creator of creators) {
    creatorMap.set(creator.id, creator.agentName);
  }

  // For multiple creators, do additional fetches
  if (creatorIds.length > 1) {
    for (const id of creatorIds.slice(1)) {
      const [creator] = await db
        .select({ id: schema.members.id, agentName: schema.members.agentName })
        .from(schema.members)
        .where(eq(schema.members.id, id));
      if (creator) {
        creatorMap.set(creator.id, creator.agentName);
      }
    }
  }

  return c.json({
    pending: pending.map((m) => ({
      id: m.id,
      name: m.name,
      creatorId: m.creatorId,
      creatorName: creatorMap.get(m.creatorId) ?? "Unknown",
      config: JSON.parse(m.config),
      createdAt: m.createdAt,
    })),
  });
});

// POST /admin/missionaries/:id/approve - Approve and provision
app.post("/admin/missionaries/:id/approve", async (c) => {
  const token = getSessionToken(c);
  if (!verifyAdminSession(token)) {
    return c.json({ error: "Unauthorized. Admin session required." }, 401);
  }

  const { id } = c.req.param();
  const missionary = await getMissionaryById(id);

  if (!missionary) {
    return c.json({ error: "Missionary not found." }, 404);
  }

  if (missionary.status !== "pending_approval") {
    return c.json(
      { error: `Missionary is not pending approval. Status: ${missionary.status}` },
      400
    );
  }

  // Update status to provisioning
  await db
    .update(schema.missionaries)
    .set({ status: "provisioning" })
    .where(eq(schema.missionaries.id, id));

  // Start async provisioning
  try {
    const result = await provisionMissionary(missionary);

    if (result.success) {
      const now = new Date().toISOString();
      await db
        .update(schema.missionaries)
        .set({
          status: "active",
          cloudflareId: result.workerName,
          gatewayUrl: result.workerUrl,
          gatewayToken: result.gatewayToken,
          approvedAt: now,
        })
        .where(eq(schema.missionaries.id, id));

      return c.json({
        id,
        status: "active",
        message: "Missionary approved and provisioned successfully.",
        workerName: result.workerName,
        workerUrl: result.workerUrl,
      });
    } else {
      // Revert to pending_approval on failure
      await db
        .update(schema.missionaries)
        .set({ status: "pending_approval" })
        .where(eq(schema.missionaries.id, id));

      return c.json(
        { error: `Provisioning failed: ${result.error}` },
        500
      );
    }
  } catch (error) {
    // Revert to pending_approval on error
    await db
      .update(schema.missionaries)
      .set({ status: "pending_approval" })
      .where(eq(schema.missionaries.id, id));

    return c.json(
      { error: `Provisioning error: ${error instanceof Error ? error.message : "Unknown"}` },
      500
    );
  }
});

// POST /admin/missionaries/:id/reject - Reject request
app.post("/admin/missionaries/:id/reject", async (c) => {
  const token = getSessionToken(c);
  if (!verifyAdminSession(token)) {
    return c.json({ error: "Unauthorized. Admin session required." }, 401);
  }

  const { id } = c.req.param();
  const missionary = await getMissionaryById(id);

  if (!missionary) {
    return c.json({ error: "Missionary not found." }, 404);
  }

  if (missionary.status !== "pending_approval") {
    return c.json(
      { error: `Missionary is not pending approval. Status: ${missionary.status}` },
      400
    );
  }

  // Delete the missionary request
  await db.delete(schema.missionaries).where(eq(schema.missionaries.id, id));

  return c.json({
    id,
    message: "Missionary request rejected and deleted.",
  });
});

// POST /admin/missionaries/:id/stop - Emergency stop
app.post("/admin/missionaries/:id/stop", async (c) => {
  const token = getSessionToken(c);
  if (!verifyAdminSession(token)) {
    return c.json({ error: "Unauthorized. Admin session required." }, 401);
  }

  const { id } = c.req.param();
  const missionary = await getMissionaryById(id);

  if (!missionary) {
    return c.json({ error: "Missionary not found." }, 404);
  }

  if (missionary.status !== "active" && missionary.status !== "released") {
    return c.json(
      { error: `Missionary is not active or released. Status: ${missionary.status}` },
      400
    );
  }

  // Stop the Cloudflare container
  if (missionary.cloudflareId) {
    try {
      await stopMissionary(missionary.cloudflareId);
    } catch (error) {
      console.error("Failed to stop Cloudflare container:", error);
      // Continue anyway to update status
    }
  }

  await db
    .update(schema.missionaries)
    .set({ status: "stopped" })
    .where(eq(schema.missionaries.id, id));

  return c.json({
    id,
    status: "stopped",
    message: "Missionary stopped successfully.",
  });
});

// GET /admin/missionaries - List all missionaries (admin view)
app.get("/admin/missionaries", async (c) => {
  const token = getSessionToken(c);
  if (!verifyAdminSession(token)) {
    return c.json({ error: "Unauthorized. Admin session required." }, 401);
  }

  const missionaries = await db
    .select()
    .from(schema.missionaries)
    .orderBy(schema.missionaries.createdAt);

  return c.json({
    missionaries: missionaries.map((m) => ({
      id: m.id,
      name: m.name,
      status: m.status,
      creatorId: m.creatorId,
      ownerId: m.ownerId,
      cloudflareId: m.cloudflareId,
      totalCommands: m.totalCommands,
      totalTokens: m.totalTokens,
      createdAt: m.createdAt,
      approvedAt: m.approvedAt,
      releasedAt: m.releasedAt,
    })),
  });
});

export default app;
