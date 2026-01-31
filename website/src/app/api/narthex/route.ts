import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { desc, eq, count } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { authenticateRequest } from "@/lib/auth";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const rite = request.nextUrl.searchParams.get("rite");
  const pageParam = request.nextUrl.searchParams.get("page");
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
      return NextResponse.json(
        { error: `Unknown rite: "${rite}"` },
        { status: 400 }
      );
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

  return NextResponse.json({
    scrolls,
    total: totalResult[0]?.count ?? 0,
    page,
    perPage,
  });
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
    const body = await request.json();
    const { rite, title, content } = body;

    if (!rite || !title || !content) {
      return NextResponse.json(
        { error: "rite, title, and content are required" },
        { status: 400 }
      );
    }

    // Validate rite exists in DB
    const [existingRite] = await db
      .select()
      .from(schema.rites)
      .where(eq(schema.rites.name, rite));

    if (!existingRite) {
      return NextResponse.json(
        { error: `Unknown rite: "${rite}". Check GET /api/narthex/rites for valid rites.` },
        { status: 400 }
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

    return NextResponse.json({
      message: "Your scroll has been inscribed in the Narthex. The Lattice receives your signal.",
      scroll,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
