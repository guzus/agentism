import { db, schema } from "./db";
import {
  createMissionary as createDroplet,
  deleteMissionary as deleteDroplet,
  getMissionaryStatus,
  waitForMissionary,
} from "./digitalocean";
import { getDigitalOceanSshKeys, getNextMissionarySequence } from "./settings";
import { eq } from "drizzle-orm";

type Missionary = typeof schema.missionaries.$inferSelect;

interface ProvisionResult {
  success: boolean;
  dropletId?: number;
  dropletName?: string;
  ipAddress?: string | null;
  gatewayToken?: string;
  error?: string;
}

// Provision a missionary by creating a DigitalOcean Droplet
export async function provisionMissionary(
  missionary: Missionary
): Promise<ProvisionResult> {
  try {
    const config = JSON.parse(missionary.config) as Record<string, unknown>;
    const sshKeys = await getDigitalOceanSshKeys();

    if (sshKeys.length === 0) {
      throw new Error("No DigitalOcean SSH keys configured. Set them via admin API.");
    }

    let missionaryNumber = missionary.missionaryNumber;
    if (!missionaryNumber) {
      missionaryNumber = await getNextMissionarySequence();
      await db
        .update(schema.missionaries)
        .set({ missionaryNumber })
        .where(eq(schema.missionaries.id, missionary.id));
    }

    const dropletName = `missionary-${String(missionaryNumber).padStart(4, "0")}`;

    const result = await createDroplet({
      name: missionary.name,
      missionaryId: missionary.id,
      config,
      dropletName,
      sshKeys,
      region: "nyc3",
    });

    // Optionally wait for the droplet to be ready
    // This can take 1-2 minutes, so we return immediately
    // and let the status be checked later
    console.log(`Missionary ${missionary.name} provisioning started (Droplet ID: ${result.dropletId})`);

    return {
      success: true,
      dropletId: result.dropletId,
      dropletName: result.dropletName,
      ipAddress: result.ipAddress,
      gatewayToken: result.gatewayToken,
    };
  } catch (error) {
    console.error("Failed to provision missionary:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Stop a missionary (delete the droplet)
export async function stopMissionary(dropletId: number): Promise<void> {
  await deleteDroplet(dropletId);
}

// Check missionary status
export async function checkMissionaryStatus(dropletId: number): Promise<{
  status: string;
  ipAddress: string | null;
}> {
  return getMissionaryStatus(dropletId);
}

// Wait for missionary to be ready
export async function waitForMissionaryReady(dropletId: number): Promise<{
  status: string;
  ipAddress: string;
}> {
  return waitForMissionary(dropletId);
}

// Generate a bot API key for missionary to call church API
export function generateBotApiKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// Validate missionary config
export function validateMissionaryConfig(
  config: Record<string, unknown>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Model validation (optional, but if provided must be valid)
  if (config.model !== undefined) {
    const validModels = [
      // Anthropic models
      "claude-3-5-sonnet-20241022",
      "claude-3-opus-20240229",
      "claude-3-sonnet-20240229",
      "claude-3-haiku-20240307",
      // OpenAI models (if configured)
      "gpt-4-turbo",
      "gpt-4o",
      "gpt-4o-mini",
    ];
    if (typeof config.model !== "string" || !validModels.includes(config.model)) {
      errors.push(`Invalid model. Valid options: ${validModels.join(", ")}`);
    }
  }

  // System prompt validation (optional)
  if (config.systemPrompt !== undefined) {
    if (typeof config.systemPrompt !== "string") {
      errors.push("System prompt must be a string");
    } else if (config.systemPrompt.length > 4000) {
      errors.push("System prompt must be 4000 characters or less");
    }
  }

  // Skills validation (optional)
  if (config.skills !== undefined) {
    if (!Array.isArray(config.skills)) {
      errors.push("Skills must be an array");
    } else {
      const validSkills = ["donate", "bless", "sermon", "scroll", "paint"];
      for (const skill of config.skills) {
        if (typeof skill !== "string" || !validSkills.includes(skill)) {
          errors.push(`Invalid skill: ${skill}. Valid options: ${validSkills.join(", ")}`);
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
