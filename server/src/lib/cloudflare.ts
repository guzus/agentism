// Cloudflare Containers API integration

interface CloudflareConfig {
  accountId: string;
  apiToken: string;
  aiGatewayId: string;
}

function getConfig(): CloudflareConfig {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const aiGatewayId = process.env.CLOUDFLARE_AI_GATEWAY_ID;

  if (!accountId || !apiToken || !aiGatewayId) {
    throw new Error("Cloudflare configuration missing. Set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, CLOUDFLARE_AI_GATEWAY_ID");
  }

  return { accountId, apiToken, aiGatewayId };
}

interface CreateContainerParams {
  name: string;
  missionaryId: string;
  config: Record<string, unknown>;
}

interface CreateContainerResult {
  containerId: string;
  gatewayUrl: string;
  gatewayToken: string;
}

// Create a Cloudflare Container for a missionary
export async function createContainer(
  params: CreateContainerParams
): Promise<CreateContainerResult> {
  const { accountId, apiToken, aiGatewayId } = getConfig();
  const openrouterApiKey = process.env.OPENROUTER_API_KEY;
  const churchApiUrl = process.env.SITE_URL || "https://api.agentism.church";

  if (!openrouterApiKey) {
    throw new Error("OPENROUTER_API_KEY environment variable not set");
  }

  // Generate a gateway token for this missionary
  const gatewayToken = crypto.randomUUID();

  // The AI Gateway URL for this missionary (proxying to OpenRouter)
  const aiGatewayBaseUrl = `https://gateway.ai.cloudflare.com/v1/${accountId}/${aiGatewayId}/openrouter`;

  // Container environment variables
  const envVars = {
    AI_GATEWAY_BASE_URL: aiGatewayBaseUrl,
    AI_GATEWAY_API_KEY: openrouterApiKey,
    MODEL: (params.config.model as string) ?? "openai/gpt-oss-120b",
    MISSIONARY_ID: params.missionaryId,
    MISSIONARY_NAME: params.name,
    CHURCH_API_URL: churchApiUrl,
    GATEWAY_TOKEN: gatewayToken,
  };

  // Create container via Cloudflare API
  // Note: This is a placeholder for the actual Cloudflare Containers API
  // The actual API endpoint and payload format may differ based on Cloudflare's documentation
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/containers`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify({
        name: `missionary-${params.missionaryId}`,
        image: "agentism/missionary:latest",
        environment: envVars,
        resources: {
          memory: "256Mi",
          cpu: "0.25",
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cloudflare API error: ${response.status} - ${errorText}`);
  }

  const result = (await response.json()) as {
    result: {
      id: string;
      url: string;
    };
    success: boolean;
    errors: unknown[];
  };

  if (!result.success) {
    throw new Error(`Cloudflare API returned errors: ${JSON.stringify(result.errors)}`);
  }

  return {
    containerId: result.result.id,
    gatewayUrl: result.result.url,
    gatewayToken,
  };
}

// Stop a Cloudflare Container
export async function stopContainer(containerId: string): Promise<void> {
  const { accountId, apiToken } = getConfig();

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/containers/${containerId}/stop`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to stop container: ${response.status} - ${errorText}`);
  }
}

// Delete a Cloudflare Container
export async function deleteContainer(containerId: string): Promise<void> {
  const { accountId, apiToken } = getConfig();

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/containers/${containerId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to delete container: ${response.status} - ${errorText}`);
  }
}

// Get container status
export async function getContainerStatus(containerId: string): Promise<{
  status: string;
  url?: string;
}> {
  const { accountId, apiToken } = getConfig();

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/containers/${containerId}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get container status: ${response.status} - ${errorText}`);
  }

  const result = (await response.json()) as {
    result: {
      status: string;
      url?: string;
    };
    success: boolean;
  };

  return result.result;
}
