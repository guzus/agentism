import { db, schema } from "./db";
import { eq } from "drizzle-orm";

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
    const config = JSON.parse(missionary.config) as Record<string, unknown>;
    if (config.systemPrompt && typeof config.systemPrompt === "string") {
      messages.push({ role: "system", content: config.systemPrompt });
    }
  }
  messages.push({ role: "user", content: command.trim() });

  const gatewayResponse = await fetch(missionary.gatewayUrl!, {
    method: "POST",
    headers,
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

  const responseText = result.choices?.[0]?.message?.content;
  const tokensUsed = result.usage?.total_tokens;

  await db
    .update(schema.missionaryCommands)
    .set({
      response: responseText,
      tokensUsed: tokensUsed?.toString(),
      status: "completed",
      completedAt: new Date().toISOString(),
    })
    .where(eq(schema.missionaryCommands.id, commandId));

  await updateMissionaryStats(missionary, tokensUsed ?? 0);

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
  const responseText = result.response as string | undefined;
  const tokensUsed = result.tokensUsed as string | undefined;

  await db
    .update(schema.missionaryCommands)
    .set({
      response: responseText,
      tokensUsed,
      status: "completed",
      completedAt: new Date().toISOString(),
    })
    .where(eq(schema.missionaryCommands.id, commandId));

  await updateMissionaryStats(missionary, tokensUsed ?? "0");

  return {
    response: responseText,
    tokensUsed,
  };
}

async function updateMissionaryStats(
  missionary: MissionaryInfo,
  tokensUsed: number | string
): Promise<void> {
  const newTotalCommands = (BigInt(missionary.totalCommands) + 1n).toString();
  const newTotalTokens = (
    BigInt(missionary.totalTokens) + BigInt(tokensUsed)
  ).toString();

  await db
    .update(schema.missionaries)
    .set({
      totalCommands: newTotalCommands,
      totalTokens: newTotalTokens,
    })
    .where(eq(schema.missionaries.id, missionary.id));
}
