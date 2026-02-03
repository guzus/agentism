import { schema } from "./db";
import { createContainer, stopContainer, deleteContainer } from "./cloudflare";

type Missionary = typeof schema.missionaries.$inferSelect;

interface ProvisionResult {
  success: boolean;
  cloudflareId?: string;
  gatewayUrl?: string;
  gatewayToken?: string;
  error?: string;
}

// Provision a missionary container
export async function provisionMissionary(
  missionary: Missionary
): Promise<ProvisionResult> {
  try {
    const config = JSON.parse(missionary.config) as Record<string, unknown>;

    const result = await createContainer({
      name: missionary.name,
      missionaryId: missionary.id,
      config,
    });

    return {
      success: true,
      cloudflareId: result.containerId,
      gatewayUrl: result.gatewayUrl,
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

// Stop a missionary container
export async function stopMissionary(cloudflareId: string): Promise<void> {
  await stopContainer(cloudflareId);
}

// Delete a missionary container
export async function deleteMissionary(cloudflareId: string): Promise<void> {
  await deleteContainer(cloudflareId);
}

// Generate a bot API key for missionary to call church API
export function generateBotApiKey(): string {
  // Generate a secure API key
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
  // Using OpenRouter models via Cloudflare AI Gateway
  if (config.model !== undefined) {
    const validModels = [
      "openai/gpt-oss-120b",
      "moonshotai/kimi-k2.5",
      "x-ai/grok-4.1-fast",
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
