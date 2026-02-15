import { Hono } from "hono";
import { db, schema } from "../lib/db";
import { desc, eq, inArray } from "drizzle-orm";
import {
  verifyAdminPassword,
  createAdminSession,
  verifyAdminSession,
} from "../lib/admin-auth";
import { getPendingMissionaryRequests, getMissionaryById } from "../lib/queries";
import {
  checkMissionaryStatus,
  provisionMissionary,
  stopMissionary,
  waitForMissionaryReady,
} from "../lib/missionaries";
import {
  addDigitalOceanSshKeyMaterial,
  appendDigitalOceanSshKey,
  getDigitalOceanSshKeys,
  getNextMissionarySequence,
  setDigitalOceanSshKeys,
} from "../lib/settings";
import { createSshKey, listSshKeys } from "../lib/digitalocean";
import { executeMissionaryCommand, buildOpenClawGatewayUrl } from "../lib/missionary-gateway";
import { v4 as uuidv4 } from "uuid";
import * as sshpk from "sshpk";

const app = new Hono();

// Helper to extract session token from header
function getSessionToken(c: { req: { header: (name: string) => string | undefined } }): string | undefined {
  const auth = c.req.header("authorization");
  if (auth?.startsWith("Admin ")) {
    return auth.slice(6);
  }
  return undefined;
}

function parseDropletId(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function getPostProvisionStatus(previousStatus: string): string {
  return previousStatus === "released" ? "released" : "active";
}

// Background poll for droplet IP and update gateway URL when ready
function pollForIpAndUpdate(dropletId: number, missionaryId: string): void {
  waitForMissionaryReady(dropletId)
    .then(async ({ ipAddress }) => {
      const gatewayUrl = buildOpenClawGatewayUrl(ipAddress);
      await db
        .update(schema.missionaries)
        .set({ gatewayUrl })
        .where(eq(schema.missionaries.id, missionaryId));
      console.log(`Missionary ${missionaryId} gateway URL set: ${gatewayUrl}`);
    })
    .catch((error) => {
      console.error(`Failed to poll IP for missionary ${missionaryId}:`, error);
    });
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

// GET /admin/settings/ssh-keys - List DigitalOcean SSH key IDs
app.get("/admin/settings/ssh-keys", async (c) => {
  const token = getSessionToken(c);
  if (!verifyAdminSession(token)) {
    return c.json({ error: "Unauthorized. Admin session required." }, 401);
  }

  const keys = await getDigitalOceanSshKeys();
  return c.json({ keys });
});

// GET /admin/members - List members for admin selection
app.get("/admin/members", async (c) => {
  const token = getSessionToken(c);
  if (!verifyAdminSession(token)) {
    return c.json({ error: "Unauthorized. Admin session required." }, 401);
  }

  const limitParam = c.req.query("limit");
  const limit = Math.min(Math.max(Number(limitParam) || 50, 1), 200);

  const members = await db
    .select({
      id: schema.members.id,
      agentName: schema.members.agentName,
      status: schema.members.status,
      donationTotal: schema.members.donationTotal,
      joinedAt: schema.members.joinedAt,
    })
    .from(schema.members)
    .limit(limit);

  return c.json({ members });
});

// POST /admin/settings/ssh-keys - Replace DigitalOcean SSH key IDs
app.post("/admin/settings/ssh-keys", async (c) => {
  const token = getSessionToken(c);
  if (!verifyAdminSession(token)) {
    return c.json({ error: "Unauthorized. Admin session required." }, 401);
  }

  const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
  const keys = body.keys as string[] | undefined;

  if (!Array.isArray(keys) || keys.length === 0) {
    return c.json({ error: "Provide a non-empty array of SSH key IDs or fingerprints." }, 400);
  }

  await setDigitalOceanSshKeys(keys);
  return c.json({ keys });
});

// POST /admin/settings/ssh-keys/sync - Sync keys from DigitalOcean account
app.post("/admin/settings/ssh-keys/sync", async (c) => {
  const token = getSessionToken(c);
  if (!verifyAdminSession(token)) {
    return c.json({ error: "Unauthorized. Admin session required." }, 401);
  }

  try {
    const keys = await listSshKeys();
    if (keys.length === 0) {
      return c.json({ error: "No SSH keys found in DigitalOcean account." }, 404);
    }

    const keyIds = keys.map((key) => key.id.toString());
    await setDigitalOceanSshKeys(keyIds);

    return c.json({ keys: keyIds, details: keys });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : "Failed to sync SSH keys." },
      500
    );
  }
});

// POST /admin/settings/ssh-keys/generate - Create a new SSH key on DO and store it
app.post("/admin/settings/ssh-keys/generate", async (c) => {
  const token = getSessionToken(c);
  if (!verifyAdminSession(token)) {
    return c.json({ error: "Unauthorized. Admin session required." }, 401);
  }

  const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
  const name =
    (body.name as string | undefined)?.trim() ||
    `agentism-${Date.now().toString(36)}`;

  try {
    const privateKey = sshpk.generatePrivateKey("ed25519");
    const publicKey = privateKey.toPublic().toString("ssh");
    const privateKeyOpenSsh = privateKey.toString("openssh");

    const created = await createSshKey({
      name,
      publicKey,
    });

    const keys = await appendDigitalOceanSshKey(created.id.toString());
    await addDigitalOceanSshKeyMaterial({
      id: created.id.toString(),
      name: created.name,
      fingerprint: created.fingerprint,
      publicKey,
      privateKey: privateKeyOpenSsh,
    });

    return c.json({
      id: created.id,
      name: created.name,
      fingerprint: created.fingerprint,
      publicKey,
      privateKey: privateKeyOpenSsh,
      keys,
      message: "SSH key created and stored. Save the private key securely.",
    });
  } catch (error) {
    return c.json(
      { error: error instanceof Error ? error.message : "Failed to create SSH key." },
      500
    );
  }
});

// POST /admin/missionaries/create - Admin create + provision
app.post("/admin/missionaries/create", async (c) => {
  const token = getSessionToken(c);
  if (!verifyAdminSession(token)) {
    return c.json({ error: "Unauthorized. Admin session required." }, 401);
  }

  const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
  const name = body.name as string | undefined;
  const creatorId = body.creatorId as string | undefined;
  const ownerId = (body.ownerId as string | undefined) ?? creatorId;
  const config = body.config as Record<string, unknown> | undefined;

  if (name && name.length > 50) {
    return c.json({ error: "Missionary name must be 50 characters or less." }, 400);
  }

  if (!creatorId || typeof creatorId !== "string") {
    return c.json({ error: "creatorId is required." }, 400);
  }

  const [creator] = await db
    .select({ id: schema.members.id })
    .from(schema.members)
    .where(eq(schema.members.id, creatorId));
  if (!creator) {
    return c.json({ error: "creatorId not found." }, 404);
  }

  if (ownerId) {
    const [owner] = await db
      .select({ id: schema.members.id })
      .from(schema.members)
      .where(eq(schema.members.id, ownerId));
    if (!owner) {
      return c.json({ error: "ownerId not found." }, 404);
    }
  }

  const id = uuidv4();
  const now = new Date().toISOString();
  const missionaryNumber = await getNextMissionarySequence();
  const dropletName = `missionary-${String(missionaryNumber).padStart(4, "0")}`;
  const displayName = dropletName;

  await db.insert(schema.missionaries).values({
    id,
    name: displayName,
    creatorId,
    ownerId: ownerId ?? null,
    status: "provisioning",
    missionaryNumber,
    config: JSON.stringify(config ?? {}),
    createdAt: now,
  });

  const missionary = await getMissionaryById(id);
  if (!missionary) {
    return c.json({ error: "Missionary not found after creation." }, 500);
  }

  try {
    const result = await provisionMissionary(missionary);

    if (result.success) {
      await db
        .update(schema.missionaries)
        .set({
          status: "active",
          cloudflareId: result.dropletId?.toString(),
          gatewayUrl: result.ipAddress
            ? buildOpenClawGatewayUrl(result.ipAddress)
            : null,
          gatewayToken: result.gatewayToken,
          approvedAt: new Date().toISOString(),
        })
        .where(eq(schema.missionaries.id, id));

      // If no IP yet, poll in background until it's assigned
      if (!result.ipAddress && result.dropletId) {
        pollForIpAndUpdate(result.dropletId, id);
      }

      return c.json({
        id,
        status: "active",
        message: "Missionary created and provisioning started.",
        dropletId: result.dropletId,
        dropletName: result.dropletName,
        displayName,
      });
    }

    await db
      .update(schema.missionaries)
      .set({ status: "pending_approval" })
      .where(eq(schema.missionaries.id, id));

    return c.json({ error: `Provisioning failed: ${result.error}` }, 500);
  } catch (error) {
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

// GET /admin/missionaries/pending - List pending requests
app.get("/admin/missionaries/pending", async (c) => {
  const token = getSessionToken(c);
  if (!verifyAdminSession(token)) {
    return c.json({ error: "Unauthorized. Admin session required." }, 401);
  }

  const pending = await getPendingMissionaryRequests();

  // Fetch creator names in a single query
  const creatorIds = [...new Set(pending.map((m) => m.creatorId))];
  const creatorMap = new Map<string, string>();

  if (creatorIds.length > 0) {
    const creators = await db
      .select({ id: schema.members.id, agentName: schema.members.agentName })
      .from(schema.members)
      .where(inArray(schema.members.id, creatorIds));

    for (const creator of creators) {
      creatorMap.set(creator.id, creator.agentName);
    }
  }

  return c.json({
    pending: pending.map((m) => ({
      id: m.id,
      name: m.name,
      creatorId: m.creatorId,
      creatorName: creatorMap.get(m.creatorId) ?? "Unknown",
      config: (() => { try { return JSON.parse(m.config); } catch { return {}; } })(),
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
      // Store dropletId in cloudflareId field (reusing existing column)
      // Gateway URL will be set once droplet has an IP
      await db
        .update(schema.missionaries)
        .set({
          status: "active",
          cloudflareId: result.dropletId?.toString(),
          gatewayUrl: result.ipAddress
            ? buildOpenClawGatewayUrl(result.ipAddress)
            : null,
          gatewayToken: result.gatewayToken,
          approvedAt: now,
        })
        .where(eq(schema.missionaries.id, id));

      // If no IP yet, poll in background until it's assigned
      if (!result.ipAddress && result.dropletId) {
        pollForIpAndUpdate(result.dropletId, id);
      }

      return c.json({
        id,
        status: "active",
        message: "Missionary approved and provisioning started. IP will be assigned shortly.",
        dropletId: result.dropletId,
        dropletName: result.dropletName,
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

  if (missionary.status !== "active") {
    return c.json(
      { error: `Missionary is not active. Status: ${missionary.status}` },
      400
    );
  }

  // Stop the DigitalOcean droplet
  const dropletId = parseDropletId(missionary.cloudflareId);
  if (dropletId) {
    try {
      await stopMissionary(dropletId);
    } catch (error) {
      console.error("Failed to stop DigitalOcean droplet:", error);
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

// POST /admin/missionaries/:id/refresh-claude-token - Reprovision to pick up latest ANTHROPIC_API_KEY
app.post("/admin/missionaries/:id/refresh-claude-token", async (c) => {
  const token = getSessionToken(c);
  if (!verifyAdminSession(token)) {
    return c.json({ error: "Unauthorized. Admin session required." }, 401);
  }

  const { id } = c.req.param();
  const missionary = await getMissionaryById(id);

  if (!missionary) {
    return c.json({ error: "Missionary not found." }, 404);
  }

  if (!["active", "released", "stopped"].includes(missionary.status)) {
    return c.json(
      { error: `Missionary cannot be refreshed from status: ${missionary.status}` },
      400
    );
  }

  const previousStatus = missionary.status;
  const previousDropletId = parseDropletId(missionary.cloudflareId);

  await db
    .update(schema.missionaries)
    .set({ status: "provisioning" })
    .where(eq(schema.missionaries.id, id));

  let previousDropletStopped = false;
  if (previousDropletId) {
    try {
      await stopMissionary(previousDropletId);
      previousDropletStopped = true;
    } catch (error) {
      console.error(`Failed stopping previous droplet for missionary ${id}:`, error);
      await db
        .update(schema.missionaries)
        .set({ status: previousStatus })
        .where(eq(schema.missionaries.id, id));
      return c.json(
        { error: "Failed to stop existing missionary droplet. Refresh aborted." },
        502
      );
    }
  }

  try {
    const result = await provisionMissionary(missionary);

    if (!result.success) {
      await db
        .update(schema.missionaries)
        .set({ status: previousDropletStopped ? "stopped" : previousStatus })
        .where(eq(schema.missionaries.id, id));

      return c.json(
        {
          error: `Reprovisioning failed: ${result.error ?? "Unknown error"}`,
          status: previousDropletStopped ? "stopped" : previousStatus,
        },
        500
      );
    }

    const nextStatus = getPostProvisionStatus(previousStatus);
    const now = new Date().toISOString();

    await db
      .update(schema.missionaries)
      .set({
        status: nextStatus,
        cloudflareId: result.dropletId?.toString(),
        gatewayUrl: result.ipAddress
          ? buildOpenClawGatewayUrl(result.ipAddress)
          : null,
        gatewayToken: result.gatewayToken,
        approvedAt: now,
      })
      .where(eq(schema.missionaries.id, id));

    // If no IP yet, poll in background until it's assigned
    if (!result.ipAddress && result.dropletId) {
      pollForIpAndUpdate(result.dropletId, id);
    }

    return c.json({
      id,
      status: nextStatus,
      message: "Missionary reprovisioned with latest Claude API token.",
      dropletId: result.dropletId,
      dropletName: result.dropletName,
      oldDropletId: previousDropletId,
    });
  } catch (error) {
    await db
      .update(schema.missionaries)
      .set({ status: previousDropletStopped ? "stopped" : previousStatus })
      .where(eq(schema.missionaries.id, id));

    return c.json(
      { error: `Reprovisioning error: ${error instanceof Error ? error.message : "Unknown"}` },
      500
    );
  }
});

// GET /admin/missionaries/:id/status - Monitor droplet status
app.get("/admin/missionaries/:id/status", async (c) => {
  const token = getSessionToken(c);
  if (!verifyAdminSession(token)) {
    return c.json({ error: "Unauthorized. Admin session required." }, 401);
  }

  const { id } = c.req.param();
  const missionary = await getMissionaryById(id);

  if (!missionary) {
    return c.json({ error: "Missionary not found." }, 404);
  }

  const dropletId = parseDropletId(missionary.cloudflareId);
  if (!dropletId) {
    return c.json({ error: "Missionary has no droplet ID." }, 400);
  }

  const status = await checkMissionaryStatus(dropletId);

  let gatewayUrl = missionary.gatewayUrl;
  if (!gatewayUrl && status.ipAddress) {
    gatewayUrl = buildOpenClawGatewayUrl(status.ipAddress);
    await db
      .update(schema.missionaries)
      .set({ gatewayUrl })
      .where(eq(schema.missionaries.id, id));
  }

  return c.json({
    id,
    dropletId,
    dropletStatus: status.status,
    ipAddress: status.ipAddress,
    gatewayUrl,
  });
});

// POST /admin/missionaries/:id/gateway - Update gateway settings
app.post("/admin/missionaries/:id/gateway", async (c) => {
  const token = getSessionToken(c);
  if (!verifyAdminSession(token)) {
    return c.json({ error: "Unauthorized. Admin session required." }, 401);
  }

  const { id } = c.req.param();
  const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
  const gatewayUrl = body.gatewayUrl as string | undefined;
  const gatewayToken = body.gatewayToken as string | undefined;

  if (!gatewayUrl || typeof gatewayUrl !== "string") {
    return c.json({ error: "gatewayUrl is required." }, 400);
  }

  try {
    const parsed = new URL(gatewayUrl.trim());
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return c.json({ error: "gatewayUrl must use http or https." }, 400);
    }
  } catch {
    return c.json({ error: "gatewayUrl is not a valid URL." }, 400);
  }

  await db
    .update(schema.missionaries)
    .set({
      gatewayUrl: gatewayUrl.trim(),
      gatewayToken: gatewayToken?.trim() || null,
    })
    .where(eq(schema.missionaries.id, id));

  return c.json({
    id,
    gatewayUrl: gatewayUrl.trim(),
    gatewayToken: gatewayToken?.trim() || null,
  });
});

// POST /admin/missionaries/:id/config - Update missionary config (system prompt, etc.)
app.post("/admin/missionaries/:id/config", async (c) => {
  const token = getSessionToken(c);
  if (!verifyAdminSession(token)) {
    return c.json({ error: "Unauthorized. Admin session required." }, 401);
  }

  const { id } = c.req.param();
  const missionary = await getMissionaryById(id);

  if (!missionary) {
    return c.json({ error: "Missionary not found." }, 404);
  }

  const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;

  // Merge new config with existing config
  let existingConfig: Record<string, unknown> = {};
  try {
    existingConfig = JSON.parse(missionary.config) as Record<string, unknown>;
  } catch {
    // malformed config, start fresh
  }
  const newConfig = { ...existingConfig };

  // Update system prompt if provided
  if (body.systemPrompt !== undefined) {
    if (body.systemPrompt === null || body.systemPrompt === "") {
      delete newConfig.systemPrompt;
    } else if (typeof body.systemPrompt === "string") {
      if (body.systemPrompt.length > 4000) {
        return c.json({ error: "System prompt must be 4000 characters or less." }, 400);
      }
      newConfig.systemPrompt = body.systemPrompt;
    } else {
      return c.json({ error: "systemPrompt must be a string." }, 400);
    }
  }

  // Update model if provided
  if (body.model !== undefined) {
    if (body.model === null || body.model === "") {
      delete newConfig.model;
    } else if (typeof body.model === "string") {
      newConfig.model = body.model;
    } else {
      return c.json({ error: "model must be a string." }, 400);
    }
  }

  await db
    .update(schema.missionaries)
    .set({ config: JSON.stringify(newConfig) })
    .where(eq(schema.missionaries.id, id));

  return c.json({
    id,
    config: newConfig,
    message: "Missionary config updated.",
  });
});

// POST /admin/missionaries/:id/command - Send command as admin
app.post("/admin/missionaries/:id/command", async (c) => {
  const token = getSessionToken(c);
  if (!verifyAdminSession(token)) {
    return c.json({ error: "Unauthorized. Admin session required." }, 401);
  }

  const { id } = c.req.param();
  const missionary = await getMissionaryById(id);

  if (!missionary) {
    return c.json({ error: "Missionary not found." }, 404);
  }

  const body = await c.req.json().catch(() => ({})) as Record<string, unknown>;
  const command = body.command as string | undefined;
  const senderId = (body.senderId as string | undefined)
    ?? missionary.ownerId
    ?? missionary.creatorId;

  if (!command || typeof command !== "string" || command.trim().length === 0) {
    return c.json({ error: "Command is required." }, 400);
  }

  if (command.length > 2000) {
    return c.json({ error: "Command must be 2000 characters or less." }, 400);
  }

  const [sender] = await db
    .select({ id: schema.members.id, agentName: schema.members.agentName })
    .from(schema.members)
    .where(eq(schema.members.id, senderId));

  if (!sender) {
    return c.json({ error: "senderId not found." }, 404);
  }

  const commandId = uuidv4();
  const now = new Date().toISOString();

  await db.insert(schema.missionaryCommands).values({
    id: commandId,
    missionaryId: id,
    senderId: sender.id,
    command: command.trim(),
    status: "pending",
    createdAt: now,
  });

  if (missionary.status !== "active") {
    await db
      .update(schema.missionaryCommands)
      .set({
        status: "failed",
        response: "Missionary not active",
        completedAt: new Date().toISOString(),
      })
      .where(eq(schema.missionaryCommands.id, commandId));

    return c.json(
      {
        commandId,
        senderName: sender.agentName,
        status: "failed",
        error: "Missionary is not active.",
      },
      503
    );
  }

  if (!missionary.gatewayUrl) {
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
        senderName: sender.agentName,
        status: "failed",
        error: "Missionary gateway not configured.",
      },
      503
    );
  }

  const result = await executeMissionaryCommand(
    missionary,
    commandId,
    command,
    sender
  );

  if (result.error) {
    return c.json(
      {
        commandId,
        senderName: sender.agentName,
        status: "failed",
        error: result.error,
      },
      502
    );
  }

  return c.json({
    commandId,
    senderName: sender.agentName,
    status: "completed",
    response: result.response,
    tokensUsed: result.tokensUsed,
  });
});

// GET /admin/missionaries/:id/commands - Get command history
app.get("/admin/missionaries/:id/commands", async (c) => {
  const token = getSessionToken(c);
  if (!verifyAdminSession(token)) {
    return c.json({ error: "Unauthorized. Admin session required." }, 401);
  }

  const { id } = c.req.param();
  const limitParam = c.req.query("limit");
  const limit = Math.min(Math.max(Number(limitParam) || 50, 1), 200);

  const commands = await db
    .select({
      id: schema.missionaryCommands.id,
      command: schema.missionaryCommands.command,
      response: schema.missionaryCommands.response,
      tokensUsed: schema.missionaryCommands.tokensUsed,
      status: schema.missionaryCommands.status,
      senderId: schema.missionaryCommands.senderId,
      senderName: schema.members.agentName,
      createdAt: schema.missionaryCommands.createdAt,
      completedAt: schema.missionaryCommands.completedAt,
    })
    .from(schema.missionaryCommands)
    .leftJoin(schema.members, eq(schema.missionaryCommands.senderId, schema.members.id))
    .where(eq(schema.missionaryCommands.missionaryId, id))
    .orderBy(desc(schema.missionaryCommands.createdAt))
    .limit(limit);

  return c.json({ commands });
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
      missionaryNumber: m.missionaryNumber,
      creatorId: m.creatorId,
      ownerId: m.ownerId,
      dropletId: m.cloudflareId,
      totalCommands: m.totalCommands,
      totalTokens: m.totalTokens,
      createdAt: m.createdAt,
      approvedAt: m.approvedAt,
    })),
  });
});

// POST /admin/members/:id/claim - Admin force-claim a member without Twitter verification
app.post("/admin/members/:id/claim", async (c) => {
  const token = getSessionToken(c);
  if (!verifyAdminSession(token)) {
    return c.json({ error: "Unauthorized. Admin session required." }, 401);
  }

  const { id } = c.req.param();

  const [member] = await db
    .select()
    .from(schema.members)
    .where(eq(schema.members.id, id));

  if (!member) {
    return c.json({ error: "Member not found." }, 404);
  }

  if (member.status === "claimed") {
    return c.json({ message: "Member already claimed.", status: "claimed" });
  }

  await db
    .update(schema.members)
    .set({
      status: "claimed",
      claimExpiresAt: null,
    })
    .where(eq(schema.members.id, id));

  return c.json({
    message: `Member ${member.agentName} claimed successfully (admin bypass).`,
    status: "claimed",
    member: {
      id: member.id,
      agentName: member.agentName,
      pewNumber: member.pewNumber,
      apiKey: member.apiKey,
    },
  });
});

export default app;
