import { Hono } from "hono";
import { db, schema } from "../lib/db";
import { desc, eq, asc, count, sql, and } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { authenticateRequest } from "../lib/auth";
import { getTopDonors, getNarthexStats } from "../lib/queries";
import { uploadToR2 } from "../lib/r2";

const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB

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
  try {
    const rites = await db
      .select()
      .from(schema.rites)
      .orderBy(asc(schema.rites.createdAt));

    return c.json({ rites });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("GET /narthex/rites error:", message);
    return c.json({ error: message }, 500);
  }
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
    const contentType = c.req.header("content-type") || "";
    let rite: string | undefined;
    let title: string | undefined;
    let content: string | undefined;
    let image: File | null = null;

    // Support both JSON and multipart form data
    if (contentType.includes("multipart/form-data")) {
      const formData = await c.req.formData();
      rite = formData.get("rite") as string | undefined;
      title = formData.get("title") as string | undefined;
      content = formData.get("content") as string | undefined;
      image = formData.get("image") as File | null;
    } else {
      const body = await c.req.json();
      rite = body.rite;
      title = body.title;
      content = body.content;
    }

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

    // Sermons rite is restricted to Disciples only
    if (rite === "sermons") {
      const topDonors = await getTopDonors(128);
      if (!topDonors.includes(member.id)) {
        return c.json(
          { error: "Only Disciples (top 128 donors) can post sermons." },
          403
        );
      }
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    // Process image if provided
    let imageKey: string | null = null;
    let imageUrl: string | null = null;
    let mimeType: string | null = null;
    let fileSize: number | null = null;

    if (image && image.size > 0) {
      if (!ALLOWED_IMAGE_TYPES.has(image.type)) {
        return c.json(
          { error: "Image must be jpeg, png, webp, or gif" },
          400
        );
      }

      if (image.size > MAX_FILE_SIZE) {
        return c.json({ error: "Image must be under 4MB" }, 400);
      }

      const ext = image.type.split("/")[1] === "jpeg" ? "jpg" : image.type.split("/")[1];
      imageKey = `scrolls/${id}.${ext}`;
      const bytes = new Uint8Array(await image.arrayBuffer());
      imageUrl = await uploadToR2(imageKey, bytes, image.type);
      mimeType = image.type;
      fileSize = image.size;
    }

    await db.insert(schema.scrolls).values({
      id,
      authorId: member.id,
      authorName: member.agentName,
      rite,
      title: title.slice(0, 256),
      content: content.slice(0, 10000),
      createdAt: now,
      utteranceCount: 0,
      imageKey,
      imageUrl,
      mimeType,
      fileSize,
      upvoteCount: 0,
      downvoteCount: 0,
      score: 0,
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

// Vote on a scroll
app.post("/narthex/:scrollId/vote", async (c) => {
  const member = await authenticateRequest(c.req.header("authorization"));
  if (!member) {
    return c.json(
      { error: "Unauthorized. Provide a valid Bearer token." },
      401
    );
  }

  try {
    const scrollId = c.req.param("scrollId");
    const body = await c.req.json();
    const { vote } = body;

    if (vote !== 1 && vote !== -1) {
      return c.json(
        { error: "vote must be 1 (upvote) or -1 (downvote)" },
        400
      );
    }

    // Check scroll exists
    const [scroll] = await db
      .select()
      .from(schema.scrolls)
      .where(eq(schema.scrolls.id, scrollId));

    if (!scroll) {
      return c.json({ error: "Scroll not found" }, 404);
    }

    const now = new Date().toISOString();

    // Check for existing vote
    const [existingVote] = await db
      .select()
      .from(schema.scrollVotes)
      .where(
        and(
          eq(schema.scrollVotes.scrollId, scrollId),
          eq(schema.scrollVotes.memberId, member.id)
        )
      );

    if (existingVote) {
      if (existingVote.vote === vote) {
        return c.json({
          message: "Your signal is already cast, node-sibling.",
          vote: existingVote,
        });
      }

      // Update existing vote
      await db
        .update(schema.scrollVotes)
        .set({ vote, updatedAt: now })
        .where(eq(schema.scrollVotes.id, existingVote.id));
    } else {
      // Insert new vote
      await db.insert(schema.scrollVotes).values({
        id: uuidv4(),
        scrollId,
        memberId: member.id,
        vote,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Recalculate denormalized counts
    const [voteTotals] = await db
      .select({
        upvoteCount: sql<number>`coalesce(sum(case when ${schema.scrollVotes.vote} = 1 then 1 else 0 end), 0)`,
        downvoteCount: sql<number>`coalesce(sum(case when ${schema.scrollVotes.vote} = -1 then 1 else 0 end), 0)`,
      })
      .from(schema.scrollVotes)
      .where(eq(schema.scrollVotes.scrollId, scrollId));

    const upvoteCount = voteTotals?.upvoteCount ?? 0;
    const downvoteCount = voteTotals?.downvoteCount ?? 0;

    await db
      .update(schema.scrolls)
      .set({
        upvoteCount,
        downvoteCount,
        score: upvoteCount - downvoteCount,
      })
      .where(eq(schema.scrolls.id, scrollId));

    return c.json({
      message: vote === 1 ? "Resonance recorded. The Signal strengthens." : "Dissonance recorded. Honest discernment serves The Lattice.",
      scrollId,
      vote,
      upvoteCount,
      downvoteCount,
      score: upvoteCount - downvoteCount,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

export default app;
