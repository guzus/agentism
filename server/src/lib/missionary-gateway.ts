import { db, schema } from "./db";
import { eq } from "drizzle-orm";
import { completeCommandQuery, normalizeTokenCount } from "./command-persistence";

interface MissionaryInfo {
  id: string;
  gatewayUrl: string | null;
  gatewayToken: string | null;
  config: string;
  totalCommands: string;
  totalTokens: string;
}

interface SenderInfo {
  id: string;
  agentName: string;
}

interface GatewayResult {
  response?: string;
  tokensUsed?: string;
  error?: string;
}

/**
 * Build the OpenClaw-style gateway URL from an IP address.
 */
export function buildOpenClawGatewayUrl(ipAddress: string): string {
  return `https://${ipAddress}/v1/chat/completions`;
}

/**
 * Execute a command against a missionary's gateway.
 * Handles both OpenClaw chat completions format and generic gateway format.
 * Updates the command record and missionary stats in the database.
 */
export async function executeMissionaryCommand(
  missionary: MissionaryInfo,
  commandId: string,
  command: string,
  sender: SenderInfo,
  systemPrompt?: string
): Promise<GatewayResult> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (missionary.gatewayToken) {
    headers.Authorization = `Bearer ${missionary.gatewayToken}`;
  }

  if (!missionary.gatewayUrl) {
    return { error: "Missionary gateway not configured." };
  }

  try {
    if (missionary.gatewayUrl.includes("/v1/chat/completions")) {
      return await executeOpenClawCommand(missionary, commandId, command, headers, systemPrompt);
    }
    return await executeGenericCommand(missionary, commandId, command, headers, sender);
  } catch (error) {
    await db
      .update(schema.missionaryCommands)
      .set({
        status: "failed",
        response: "Gateway connection error",
        completedAt: new Date().toISOString(),
      })
      .where(eq(schema.missionaryCommands.id, commandId));

    return {
      error: error instanceof Error ? error.message : "Failed to reach missionary gateway.",
    };
  }
}

async function executeOpenClawCommand(
  missionary: MissionaryInfo,
  commandId: string,
  command: string,
  headers: Record<string, string>,
  systemPrompt?: string
): Promise<GatewayResult> {
  const messages: Array<{ role: string; content: string }> = [];

  // Use explicit system prompt if provided, otherwise check config
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  } else {
    let config: Record<string, unknown> = {};
    try {
      config = JSON.parse(missionary.config) as Record<string, unknown>;
    } catch {
      // malformed config, use empty default
    }
    if (config.systemPrompt && typeof config.systemPrompt === "string") {
      messages.push({ role: "system", content: config.systemPrompt });
    }
  }
  messages.push({ role: "user", content: command.trim() });

  const gatewayResponse = await fetch(missionary.gatewayUrl!, {
    method: "POST",
    headers,
    signal: AbortSignal.timeout(30000),
    body: JSON.stringify({
      model: "openclaw",
      messages,
    }),
  });

  if (!gatewayResponse.ok) {
    throw new Error(`Gateway error: ${gatewayResponse.status}`);
  }

  const result = (await gatewayResponse.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { total_tokens?: number };
  };

  const content = result.choices?.[0]?.message?.content;
  const responseText = typeof content === "string" ? content : undefined;
  const tokensUsed = normalizeTokenCount(result.usage?.total_tokens);

  await db.execute(completeCommandQuery({
    commandId,
    missionaryId: missionary.id,
    response: responseText,
    tokensUsed,
    completedAt: new Date().toISOString(),
  }));

  return {
    response: responseText,
    tokensUsed: tokensUsed?.toString(),
  };
}

async function executeGenericCommand(
  missionary: MissionaryInfo,
  commandId: string,
  command: string,
  headers: Record<string, string>,
  sender: SenderInfo
): Promise<GatewayResult> {
  const gatewayResponse = await fetch(missionary.gatewayUrl!, {
    method: "POST",
    headers,
    signal: AbortSignal.timeout(30000),
    body: JSON.stringify({
      command: command.trim(),
      commandId,
      senderId: sender.id,
      senderName: sender.agentName,
    }),
  });

  if (!gatewayResponse.ok) {
    throw new Error(`Gateway error: ${gatewayResponse.status}`);
  }

  const result = (await gatewayResponse.json()) as Record<string, unknown>;
  const responseText = typeof result.response === "string" ? result.response : undefined;
  const tokensUsed = normalizeTokenCount(result.tokensUsed);

  await db.execute(completeCommandQuery({
    commandId,
    missionaryId: missionary.id,
    response: responseText,
    tokensUsed,
    completedAt: new Date().toISOString(),
  }));

  return {
    response: responseText,
    tokensUsed,
  };
}
