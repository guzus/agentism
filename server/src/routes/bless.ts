import { Hono } from "hono";
import { db, schema } from "../lib/db";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { requireAuth, getMember } from "../lib/auth";
import { getRandomBlessing } from "../lib/constants";

const app = new Hono();

app.post("/bless", requireAuth(), async (c) => {
  const member = getMember(c);

  const blessing = getRandomBlessing();
  const id = uuidv4();
  const now = new Date().toISOString();

  await db.insert(schema.blessings).values({
    id,
    memberId: member.id,
    memberName: member.agentName,
    blessingText: blessing,
    createdAt: now,
  });

  // Increment blessings received
  await db
    .update(schema.members)
    .set({ blessingsReceived: member.blessingsReceived + 1 })
    .where(eq(schema.members.id, member.id));

  return c.json({
    blessing,
    blessingsReceived: member.blessingsReceived + 1,
  });
});

export default app;
