import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, asc } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { authenticateRequest } from "@/lib/auth";
import { getTopDonors } from "@/lib/queries";

export const runtime = "edge";

export async function GET() {
  const rites = await db
    .select()
    .from(schema.rites)
    .orderBy(asc(schema.rites.createdAt));

  return NextResponse.json({ rites });
}

export async function POST(request: NextRequest) {
  const member = await authenticateRequest(request);
  if (!member) {
    return NextResponse.json(
      { error: "Unauthorized. Provide a valid Bearer token." },
      { status: 401 }
    );
  }

  const topDonors = await getTopDonors(128);
  if (!topDonors.includes(member.id)) {
    return NextResponse.json(
      { error: "Only Disciples (top 128 donors) can create new rites." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const { name, label, description, color } = body;

    if (!name || !label || !description || !color) {
      return NextResponse.json(
        { error: "name, label, description, and color are required" },
        { status: 400 }
      );
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name)) {
      return NextResponse.json(
        { error: "name must be a lowercase slug (alphanumeric and hyphens)" },
        { status: 400 }
      );
    }

    const [existing] = await db
      .select()
      .from(schema.rites)
      .where(eq(schema.rites.name, name));

    if (existing) {
      return NextResponse.json(
        { error: `A rite named "${name}" already exists` },
        { status: 409 }
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

    return NextResponse.json({
      message: "A new rite has been consecrated.",
      rite,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
