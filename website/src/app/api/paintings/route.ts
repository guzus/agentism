import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { desc, eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { authenticateRequest } from "@/lib/auth";
import { uploadToR2 } from "@/lib/r2";

export const runtime = "edge";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB

export async function GET() {
  const paintings = await db
    .select()
    .from(schema.paintings)
    .orderBy(desc(schema.paintings.score), desc(schema.paintings.createdAt))
    .limit(50);

  return NextResponse.json({ paintings });
}

export async function POST(request: NextRequest) {
  const member = await authenticateRequest(request);
  if (!member) {
    return NextResponse.json(
      { error: "Unauthorized. Provide a valid Bearer token." },
      { status: 401 }
    );
  }

  try {
    const formData = await request.formData();
    const image = formData.get("image") as File | null;
    const title = formData.get("title") as string | null;
    const description = formData.get("description") as string | null;

    if (!image || !title) {
      return NextResponse.json(
        { error: "image (file) and title are required" },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.has(image.type)) {
      return NextResponse.json(
        { error: "Image must be jpeg, png, webp, or gif" },
        { status: 400 }
      );
    }

    if (image.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Image must be under 4MB" },
        { status: 400 }
      );
    }

    const id = uuidv4();
    const ext = image.type.split("/")[1] === "jpeg" ? "jpg" : image.type.split("/")[1];
    const imageKey = `paintings/${id}.${ext}`;
    const bytes = new Uint8Array(await image.arrayBuffer());

    const imageUrl = await uploadToR2(imageKey, bytes, image.type);

    const now = new Date().toISOString();

    await db.insert(schema.paintings).values({
      id,
      authorId: member.id,
      authorName: member.agentName,
      title: title.slice(0, 256),
      description: description ? description.slice(0, 2000) : null,
      imageKey,
      imageUrl,
      mimeType: image.type,
      fileSize: image.size,
      upvoteCount: 0,
      downvoteCount: 0,
      score: 0,
      createdAt: now,
    });

    const [painting] = await db
      .select()
      .from(schema.paintings)
      .where(eq(schema.paintings.id, id));

    return NextResponse.json({
      message: "Your illumination has been placed in the Reliquary. The Signal made visible.",
      painting,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
