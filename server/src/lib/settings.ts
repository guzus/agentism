import { eq, sql } from "drizzle-orm";
import { db, schema } from "./db";

const SSH_KEYS_SETTING = "digitalocean_ssh_keys";
const MISSIONARY_SEQUENCE_SETTING = "missionary_sequence";

export async function getDigitalOceanSshKeys(): Promise<string[]> {
  const [row] = await db
    .select({ value: schema.systemSettings.value })
    .from(schema.systemSettings)
    .where(eq(schema.systemSettings.key, SSH_KEYS_SETTING));

  if (!row?.value) return [];

  try {
    const parsed = JSON.parse(row.value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((key) => typeof key === "string" && key.trim().length > 0);
  } catch {
    return [];
  }
}

export async function setDigitalOceanSshKeys(keys: string[]): Promise<void> {
  const cleaned = keys.map((key) => key.trim()).filter((key) => key.length > 0);
  const now = new Date().toISOString();
  const value = JSON.stringify(cleaned);

  await db
    .insert(schema.systemSettings)
    .values({
      key: SSH_KEYS_SETTING,
      value,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: schema.systemSettings.key,
      set: { value, updatedAt: now },
    });
}

export async function getNextMissionarySequence(): Promise<number> {
  const now = new Date().toISOString();

  const result = await db.execute(sql`
    INSERT INTO system_settings (key, value, updated_at)
    VALUES (${MISSIONARY_SEQUENCE_SETTING}, '1', ${now})
    ON CONFLICT (key)
    DO UPDATE SET value = (system_settings.value::int + 1)::text, updated_at = ${now}
    RETURNING value
  `);

  const row = result.rows?.[0] as { value?: string } | undefined;
  const value = row?.value ?? "0";
  return Number(value);
}
