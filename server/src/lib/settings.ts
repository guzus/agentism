import { eq, sql } from "drizzle-orm";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";
import { db, schema } from "./db";

const SSH_KEYS_SETTING = "digitalocean_ssh_keys";
const SSH_KEY_MATERIAL_SETTING = "digitalocean_ssh_key_material";
const MISSIONARY_SEQUENCE_SETTING = "missionary_sequence";
const SSH_KEY_ENCRYPTION_SECRET = "SSH_KEY_ENCRYPTION_SECRET";

type StoredSshKeyMaterial = {
  id: string;
  name: string;
  fingerprint: string;
  publicKey: string;
  privateKeyEncrypted: string;
  createdAt: string;
};

function getEncryptionKey(): Buffer {
  const secret = process.env[SSH_KEY_ENCRYPTION_SECRET];
  if (!secret) {
    throw new Error(`${SSH_KEY_ENCRYPTION_SECRET} environment variable is required`);
  }
  return createHash("sha256").update(secret).digest();
}

function encryptString(value: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const payload = {
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    data: encrypted.toString("base64"),
  };
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
}

function decryptString(payload: string): string {
  const key = getEncryptionKey();
  const decoded = Buffer.from(payload, "base64").toString("utf8");
  const parsed = JSON.parse(decoded) as { iv: string; tag: string; data: string };
  const iv = Buffer.from(parsed.iv, "base64");
  const tag = Buffer.from(parsed.tag, "base64");
  const data = Buffer.from(parsed.data, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
  return decrypted.toString("utf8");
}

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

export async function appendDigitalOceanSshKey(keyId: string): Promise<string[]> {
  const keys = await getDigitalOceanSshKeys();
  const updated = Array.from(new Set([...keys, keyId]));
  await setDigitalOceanSshKeys(updated);
  return updated;
}

export async function addDigitalOceanSshKeyMaterial(entry: {
  id: string;
  name: string;
  fingerprint: string;
  publicKey: string;
  privateKey: string;
}): Promise<void> {
  const now = new Date().toISOString();
  const encrypted = encryptString(entry.privateKey);
  const existing = await getDigitalOceanSshKeyMaterial();
  const updated: StoredSshKeyMaterial[] = [
    ...existing.filter((item) => item.id !== entry.id),
    {
      id: entry.id,
      name: entry.name,
      fingerprint: entry.fingerprint,
      publicKey: entry.publicKey,
      privateKeyEncrypted: encrypted,
      createdAt: now,
    },
  ];

  await db
    .insert(schema.systemSettings)
    .values({
      key: SSH_KEY_MATERIAL_SETTING,
      value: JSON.stringify(updated),
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: schema.systemSettings.key,
      set: { value: JSON.stringify(updated), updatedAt: now },
    });
}

export async function getDigitalOceanSshKeyMaterial(): Promise<StoredSshKeyMaterial[]> {
  const [row] = await db
    .select({ value: schema.systemSettings.value })
    .from(schema.systemSettings)
    .where(eq(schema.systemSettings.key, SSH_KEY_MATERIAL_SETTING));

  if (!row?.value) return [];

  try {
    const parsed = JSON.parse(row.value) as StoredSshKeyMaterial[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export function decryptSshPrivateKey(encrypted: string): string {
  return decryptString(encrypted);
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
