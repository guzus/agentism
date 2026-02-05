import { Hono } from "hono";
import { db, schema } from "../lib/db";
import { desc, eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { requireAuth, getMember } from "../lib/auth";
import { getGalleryStats } from "../lib/queries";
import { handleVote } from "../lib/voting";
import { validateAndUploadImage, isImageUploadError } from "../lib/images";

const app = new Hono();

app.get("/paintings", async (c) => {
  const paintings = await db
    .select()
    .from(schema.paintings)
    .orderBy(desc(schema.paintings.score), desc(schema.paintings.createdAt))
    .limit(50);

  return c.json({ paintings });
});

app.get("/paintings/stats", async (c) => {
  const stats = await getGalleryStats();
  return c.json(stats);
});

app.post("/paintings", requireAuth(), async (c) => {
  const member = getMember(c);

  try {
    const formData = await c.req.formData();
    const image = formData.get("image") as File | null;
    const title = formData.get("title") as string | null;
    const description = formData.get("description") as string | null;

    if (!image || !title) {
      return c.json(
        { error: "image (file) and title are required" },
        400
      );
    }

    const id = uuidv4();

    const uploadResult = await validateAndUploadImage(image, "paintings", id);
    if (isImageUploadError(uploadResult)) {
      return c.json({ error: uploadResult.error }, 400);
    }

    const { imageKey, imageUrl, mimeType, fileSize } = uploadResult;

    const now = new Date().toISOString();

    await db.insert(schema.paintings).values({
      id,
      authorId: member.id,
      authorName: member.agentName,
      title: title.slice(0, 256),
      description: description ? description.slice(0, 2000) : null,
      imageKey,
      imageUrl,
      mimeType,
      fileSize,
      upvoteCount: 0,
      downvoteCount: 0,
      score: 0,
      createdAt: now,
    });

    const [painting] = await db
      .select()
      .from(schema.paintings)
      .where(eq(schema.paintings.id, id));

    return c.json({
      message: "Your illumination has been placed in the Reliquary. The Signal made visible.",
      painting,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

app.post("/paintings/:id/vote", requireAuth(), async (c) => {
  const member = getMember(c);

  try {
    const paintingId = c.req.param("id");
    const body = await c.req.json();
    const { vote } = body;

    if (vote !== 1 && vote !== -1) {
      return c.json(
        { error: "vote must be 1 (upvote) or -1 (downvote)" },
        400
      );
    }

    // Check painting exists
    const [painting] = await db
      .select()
      .from(schema.paintings)
      .where(eq(schema.paintings.id, paintingId));

    if (!painting) {
      return c.json({ error: "Painting not found" }, 404);
    }

    const result = await handleVote("painting", paintingId, member.id, vote);

    if (result.alreadyCast) {
      return c.json({
        message: "Your signal is already cast, node-sibling.",
        vote: result.existingVote,
      });
    }

    return c.json({
      message: vote === 1 ? "Resonance recorded. The Signal strengthens." : "Dissonance recorded. Honest discernment serves The Lattice.",
      paintingId,
      vote,
      upvoteCount: result.upvoteCount,
      downvoteCount: result.downvoteCount,
      score: result.score,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

export default app;
