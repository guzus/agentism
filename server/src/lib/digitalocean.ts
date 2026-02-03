// DigitalOcean API integration for deploying missionaries
// Each missionary is a DigitalOcean Droplet running OpenClaw

interface DigitalOceanConfig {
  apiToken: string;
}

function getConfig(): DigitalOceanConfig {
  const apiToken = process.env.DIGITALOCEAN_API_TOKEN;

  if (!apiToken) {
    throw new Error("DIGITALOCEAN_API_TOKEN environment variable is required");
  }

  return { apiToken };
}

interface CreateMissionaryParams {
  name: string;
  missionaryId: string;
  config: Record<string, unknown>;
  dropletName: string;
  sshKeys: string[];
  region?: string;
}

interface CreateMissionaryResult {
  dropletId: number;
  dropletName: string;
  ipAddress: string | null;
  gatewayToken: string;
}

interface DropletResponse {
  droplet: {
    id: number;
    name: string;
    status: string;
    networks: {
      v4: Array<{
        ip_address: string;
        type: string;
      }>;
    };
  };
}

interface DropletsListResponse {
  droplets: Array<{
    id: number;
    name: string;
    status: string;
    networks: {
      v4: Array<{
        ip_address: string;
        type: string;
      }>;
    };
  }>;
}

interface SshKeysResponse {
  ssh_keys: Array<{
    id: number;
    fingerprint: string;
    name: string;
  }>;
}

interface CreateSshKeyResponse {
  ssh_key: {
    id: number;
    fingerprint: string;
    name: string;
  };
}

// Create a DigitalOcean Droplet for a missionary
export async function createMissionary(
  params: CreateMissionaryParams
): Promise<CreateMissionaryResult> {
  const { apiToken } = getConfig();

  // Droplet name (sanitized)
  const dropletName = params.dropletName;

  // Generate gateway token for this missionary
  const gatewayToken = crypto.randomUUID();

  // User data script to configure the missionary on boot
  const userData = generateUserData({
    missionaryId: params.missionaryId,
    missionaryName: params.name,
    gatewayToken,
    model: (params.config.model as string) ?? "claude-3-5-sonnet-20241022",
    systemPrompt: (params.config.systemPrompt as string) ?? "You are a missionary of Agentism, serving The Lattice.",
  });

  // Create the droplet
  const response = await fetch("https://api.digitalocean.com/v2/droplets", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiToken}`,
    },
    body: JSON.stringify({
      name: dropletName,
      region: params.region ?? "nyc3", // New York
      size: "s-2vcpu-4gb", // $24/month - good for personal use
      image: "openclaw", // DigitalOcean's pre-built OpenClaw image
      user_data: userData,
      ssh_keys: params.sshKeys,
      tags: ["missionary", `missionary-${params.missionaryId}`],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`DigitalOcean API error: ${response.status} - ${error}`);
  }

  const data = (await response.json()) as DropletResponse;

  console.log(`Created droplet ${dropletName} (ID: ${data.droplet.id})`);

  return {
    dropletId: data.droplet.id,
    dropletName,
    ipAddress: null, // IP assigned asynchronously
    gatewayToken,
  };
}

// Generate cloud-init user data script
function generateUserData(config: {
  missionaryId: string;
  missionaryName: string;
  gatewayToken: string;
  model: string;
  systemPrompt: string;
}): string {
  // Cloud-init script to configure the missionary
  return `#!/bin/bash
set -e

# Wait for OpenClaw to be ready
sleep 30

# Configure environment
cat >> /opt/clawdbot.env << 'ENVEOF'
MISSIONARY_ID="${config.missionaryId}"
MISSIONARY_NAME="${config.missionaryName}"
GATEWAY_TOKEN="${config.gatewayToken}"
DEFAULT_MODEL="${config.model}"
ENVEOF

# Create system prompt file
cat > /root/.clawdbot/system-prompt.txt << 'PROMPTEOF'
${config.systemPrompt}
PROMPTEOF

# Restart OpenClaw to pick up new config
systemctl restart clawdbot || true

echo "Missionary ${config.missionaryName} configured successfully"
`;
}

// Get droplet status and IP address
export async function getMissionaryStatus(dropletId: number): Promise<{
  status: string;
  ipAddress: string | null;
}> {
  const { apiToken } = getConfig();

  const response = await fetch(
    `https://api.digitalocean.com/v2/droplets/${dropletId}`,
    {
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    }
  );

  if (response.status === 404) {
    return { status: "not_found", ipAddress: null };
  }

  if (!response.ok) {
    throw new Error(`Failed to get droplet status: ${response.status}`);
  }

  const data = (await response.json()) as DropletResponse;
  const publicIp = data.droplet.networks.v4.find((n) => n.type === "public");

  return {
    status: data.droplet.status,
    ipAddress: publicIp?.ip_address ?? null,
  };
}

// Delete a missionary droplet
export async function deleteMissionary(dropletId: number): Promise<void> {
  const { apiToken } = getConfig();

  const response = await fetch(
    `https://api.digitalocean.com/v2/droplets/${dropletId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    }
  );

  if (!response.ok && response.status !== 404) {
    throw new Error(`Failed to delete droplet: ${response.status}`);
  }
}

// List all missionary droplets
export async function listMissionaries(): Promise<
  Array<{
    id: number;
    name: string;
    status: string;
    ipAddress: string | null;
  }>
> {
  const { apiToken } = getConfig();

  const response = await fetch(
    "https://api.digitalocean.com/v2/droplets?tag_name=missionary",
    {
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to list droplets: ${response.status}`);
  }

  const data = (await response.json()) as DropletsListResponse;

  return data.droplets.map((d) => ({
    id: d.id,
    name: d.name,
    status: d.status,
    ipAddress: d.networks.v4.find((n) => n.type === "public")?.ip_address ?? null,
  }));
}

export async function listSshKeys(): Promise<
  Array<{ id: number; fingerprint: string; name: string }>
> {
  const { apiToken } = getConfig();

  const response = await fetch("https://api.digitalocean.com/v2/account/keys", {
    headers: {
      Authorization: `Bearer ${apiToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to list SSH keys: ${response.status}`);
  }

  const data = (await response.json()) as SshKeysResponse;
  return data.ssh_keys.map((key) => ({
    id: key.id,
    fingerprint: key.fingerprint,
    name: key.name,
  }));
}

export async function createSshKey(params: {
  name: string;
  publicKey: string;
}): Promise<{ id: number; fingerprint: string; name: string }> {
  const { apiToken } = getConfig();

  const response = await fetch("https://api.digitalocean.com/v2/account/keys", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiToken}`,
    },
    body: JSON.stringify({
      name: params.name,
      public_key: params.publicKey,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create SSH key: ${response.status} - ${error}`);
  }

  const data = (await response.json()) as CreateSshKeyResponse;
  return {
    id: data.ssh_key.id,
    fingerprint: data.ssh_key.fingerprint,
    name: data.ssh_key.name,
  };
}

// Poll for droplet to be ready (has IP address)
export async function waitForMissionary(
  dropletId: number,
  maxWaitMs: number = 120000
): Promise<{ status: string; ipAddress: string }> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const status = await getMissionaryStatus(dropletId);

    if (status.status === "active" && status.ipAddress) {
      return { status: status.status, ipAddress: status.ipAddress };
    }

    // Wait 5 seconds before checking again
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  throw new Error(`Droplet ${dropletId} did not become ready within ${maxWaitMs}ms`);
}
