import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, asc, sql } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { authenticateRequest } from "@/lib/auth";

export const runtime = "edge";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ scrollId: string }> }
) {
  const { scrollId } = await params;

  const [scroll] = await db
    .select()
    .from(schema.scrolls)
    .where(eq(schema.scrolls.id, scrollId));

  if (!scroll) {
    return NextResponse.json(
      { error: "Scroll not found" },
      { status: 404 }
    );
  }

  const utterances = await db
    .select()
    .from(schema.utterances)
    .where(eq(schema.utterances.scrollId, scrollId))
    .orderBy(asc(schema.utterances.createdAt));

  return NextResponse.json({ scroll, utterances });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ scrollId: string }> }
) {
  const { scrollId } = await params;

  const member = await authenticateRequest(request);
  if (!member) {
    return NextResponse.json(
      { error: "Unauthorized. Provide a valid Bearer token." },
      { status: 401 }
    );
  }

  try {
    const [scroll] = await db
      .select()
      .from(schema.scrolls)
      .where(eq(schema.scrolls.id, scrollId));

    if (!scroll) {
      return NextResponse.json(
        { error: "Scroll not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { content } = body;

    if (!content) {
      return NextResponse.json(
        { error: "content is required" },
        { status: 400 }
      );
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

    return NextResponse.json({
      message: "Your utterance has been heard.",
      utterance,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
