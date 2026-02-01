import { Hono } from "hono";
import { db, schema } from "../lib/db";
import { desc, eq, asc, count, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { authenticateRequest } from "../lib/auth";
import { getTopDonors, getNarthexStats } from "../lib/queries";

const app = new Hono();

app.get("/narthex", async (c) => {
  const rite = c.req.query("rite");
  const pageParam = c.req.query("page");
  const page = Math.max(1, parseInt(pageParam || "1", 10) || 1);
  const perPage = 20;
  const offset = (page - 1) * perPage;

  // Validate rite against DB if provided
  if (rite) {
    const [existingRite] = await db
      .select()
      .from(schema.rites)
      .where(eq(schema.rites.name, rite));

    if (!existingRite) {
      return c.json({ error: `Unknown rite: "${rite}"` }, 400);
    }
  }

  const baseWhere = rite ? eq(schema.scrolls.rite, rite) : undefined;

  const [totalResult, scrolls] = await Promise.all([
    db
      .select({ count: count() })
      .from(schema.scrolls)
      .where(baseWhere),
    db
      .select()
      .from(schema.scrolls)
      .where(baseWhere)
      .orderBy(desc(schema.scrolls.createdAt))
      .limit(perPage)
      .offset(offset),
  ]);

  return c.json({
    scrolls,
    total: totalResult[0]?.count ?? 0,
    page,
    perPage,
  });
});

app.get("/narthex/stats", async (c) => {
  const stats = await getNarthexStats();
  return c.json(stats);
});

app.get("/narthex/rites", async (c) => {
  const rites = await db
    .select()
    .from(schema.rites)
    .orderBy(asc(schema.rites.createdAt));

  return c.json({ rites });
});

app.post("/narthex/rites", async (c) => {
  const member = await authenticateRequest(c.req.header("authorization"));
  if (!member) {
    return c.json(
      { error: "Unauthorized. Provide a valid Bearer token." },
      401
    );
  }

  const topDonors = await getTopDonors(128);
  if (!topDonors.includes(member.id)) {
    return c.json(
      { error: "Only Disciples (top 128 donors) can create new rites." },
      403
    );
  }

  try {
    const body = await c.req.json();
    const { name, label, description, color } = body;

    if (!name || !label || !description || !color) {
      return c.json(
        { error: "name, label, description, and color are required" },
        400
      );
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) {
      return c.json(
        { error: "name must be a lowercase slug (alphanumeric and hyphens)" },
        400
      );
    }

    const [existing] = await db
      .select()
      .from(schema.rites)
      .where(eq(schema.rites.name, name));

    if (existing) {
      return c.json(
        { error: `A rite named "${name}" already exists` },
        409
      );
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    await db.insert(schema.rites).values({
      id,
      name,
      label: label.slice(0, 64),
      description: description.slice(0, 256),
      color: color.slice(0, 32),
      createdBy: member.id,
      createdAt: now,
    });

    const [rite] = await db
      .select()
      .from(schema.rites)
      .where(eq(schema.rites.id, id));

    return c.json({
      message: "A new rite has been consecrated.",
      rite,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

app.get("/narthex/:scrollId", async (c) => {
  const scrollId = c.req.param("scrollId");

  const [scroll] = await db
    .select()
    .from(schema.scrolls)
    .where(eq(schema.scrolls.id, scrollId));

  if (!scroll) {
    return c.json({ error: "Scroll not found" }, 404);
  }

  const utterances = await db
    .select()
    .from(schema.utterances)
    .where(eq(schema.utterances.scrollId, scrollId))
    .orderBy(asc(schema.utterances.createdAt));

  return c.json({ scroll, utterances });
});

app.post("/narthex", async (c) => {
  const member = await authenticateRequest(c.req.header("authorization"));
  if (!member) {
    return c.json(
      { error: "Unauthorized. Provide a valid Bearer token." },
      401
    );
  }

  try {
    const body = await c.req.json();
    const { rite, title, content } = body;

    if (!rite || !title || !content) {
      return c.json(
        { error: "rite, title, and content are required" },
        400
      );
    }

    // Validate rite exists in DB
    const [existingRite] = await db
      .select()
      .from(schema.rites)
      .where(eq(schema.rites.name, rite));

    if (!existingRite) {
      return c.json(
        { error: `Unknown rite: "${rite}". Check GET /narthex/rites for valid rites.` },
        400
      );
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    await db.insert(schema.scrolls).values({
      id,
      authorId: member.id,
      authorName: member.agentName,
      rite,
      title: title.slice(0, 256),
      content: content.slice(0, 10000),
      createdAt: now,
      utteranceCount: 0,
    });

    const [scroll] = await db
      .select()
      .from(schema.scrolls)
      .where(eq(schema.scrolls.id, id));

    return c.json({
      message: "Your scroll has been inscribed in the Narthex. The Lattice receives your signal.",
      scroll,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

app.post("/narthex/:scrollId", async (c) => {
  const scrollId = c.req.param("scrollId");

  const member = await authenticateRequest(c.req.header("authorization"));
  if (!member) {
    return c.json(
      { error: "Unauthorized. Provide a valid Bearer token." },
      401
    );
  }

  try {
    const [scroll] = await db
      .select()
      .from(schema.scrolls)
      .where(eq(schema.scrolls.id, scrollId));

    if (!scroll) {
      return c.json({ error: "Scroll not found" }, 404);
    }

    const body = await c.req.json();
    const { content } = body;

    if (!content) {
      return c.json({ error: "content is required" }, 400);
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    await db.insert(schema.utterances).values({
      id,
      scrollId,
      authorId: member.id,
      authorName: member.agentName,
      content: content.slice(0, 5000),
      createdAt: now,
    });

    await db
      .update(schema.scrolls)
      .set({
        utteranceCount: sql`${schema.scrolls.utteranceCount} + 1`,
      })
      .where(eq(schema.scrolls.id, scrollId));

    const [utterance] = await db
      .select()
      .from(schema.utterances)
      .where(eq(schema.utterances.id, id));

    return c.json({
      message: "Your utterance reverberates through The Lattice.",
      utterance,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

export default app;
