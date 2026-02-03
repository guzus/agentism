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

  // Build droplet request body
  // OpenClaw image requires 80GB disk, so use s-4vcpu-8gb ($48/month, 160GB disk)
  const dropletBody: Record<string, unknown> = {
    name: dropletName,
    region: params.region ?? "nyc3", // New York
    size: "s-4vcpu-8gb", // $48/month - required for OpenClaw (80GB min disk)
    image: "openclaw", // DigitalOcean 1-Click OpenClaw image
    user_data: userData,
    tags: ["missionary", `missionary-${params.missionaryId}`],
  };

  // Only include ssh_keys if provided
  if (params.sshKeys && params.sshKeys.length > 0) {
    dropletBody.ssh_keys = params.sshKeys;
  }

  // Create the droplet
  const response = await fetch("https://api.digitalocean.com/v2/droplets", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiToken}`,
    },
    body: JSON.stringify(dropletBody),
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

// Generate cloud-init user data script for OpenClaw 1-Click image
function generateUserData(config: {
  missionaryId: string;
  missionaryName: string;
  gatewayToken: string;
  model: string;
  systemPrompt: string;
}): string {
  // Escape special characters for shell/JSON
  const escapedPrompt = config.systemPrompt
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n");
  const escapedName = config.missionaryName.replace(/"/g, '\\"');

  // Get Anthropic API key from environment (passed to droplet)
  const anthropicKey = process.env.ANTHROPIC_API_KEY || "";

  // Cloud-init script to configure OpenClaw BEFORE first boot completes
  // The 1-Click image runs clawdbot service on boot, so we must configure early
  return `#!/bin/bash
set -ex

# Log to file for debugging
exec > /var/log/missionary-setup.log 2>&1
echo "Starting missionary setup at $(date)"

# Stop OpenClaw service immediately to prevent interactive setup
systemctl stop clawdbot || true
sleep 2

# Create OpenClaw config directory
mkdir -p /root/.openclaw

# Write the JSON config file with gateway auth token
cat > /root/.openclaw/openclaw.json << 'CONFIGEOF'
{
  "gateway": {
    "mode": "local",
    "port": 18789,
    "bind": "loopback",
    "controlUi": { "enabled": true },
    "auth": {
      "mode": "token",
      "token": "${config.gatewayToken}"
    }
  },
  "agent": {
    "model": "anthropic/${config.model}",
    "systemPrompt": "${escapedPrompt}"
  }
}
CONFIGEOF

# Set environment variables for OpenClaw
cat > /opt/clawdbot.env << 'ENVEOF'
# Agentism Missionary Configuration
MISSIONARY_ID="${config.missionaryId}"
MISSIONARY_NAME="${escapedName}"

# Gateway Authentication
OPENCLAW_GATEWAY_TOKEN="${config.gatewayToken}"

# LLM Provider (Anthropic)
ANTHROPIC_API_KEY="${anthropicKey}"
DEFAULT_MODEL="${config.model}"
ENVEOF

# Create system prompt file (legacy location)
mkdir -p /root/.clawdbot
cat > /root/.clawdbot/system-prompt.txt << 'PROMPTEOF'
${config.systemPrompt}
PROMPTEOF

# Start OpenClaw with our configuration
systemctl start clawdbot || true

# Wait for service to be ready
sleep 10

# Verify service is running
if systemctl is-active --quiet clawdbot; then
  echo "Missionary ${escapedName} configured successfully at $(date)"
else
  echo "WARNING: clawdbot service failed to start"
  systemctl status clawdbot || true
fi
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
