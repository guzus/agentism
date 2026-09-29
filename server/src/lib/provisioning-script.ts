interface ProvisioningConfig {
  missionaryId: string;
  missionaryName: string;
  gatewayToken: string;
  model: string;
  anthropicApiKey: string;
}

// Encode complete documents, so untrusted names cannot end a heredoc or become
// shell syntax. The decoded environment file must also be safe when sourced.
const encode = (value: string) => Buffer.from(value, "utf8").toString("base64");
const envValue = (value: string) => `"${value.replace(/[\r\n]/g, " ").replace(/[\\"$`]/g, "\\$&")}"`;

export function generateUserData(config: ProvisioningConfig): string {
  if (!config.anthropicApiKey) throw new Error("ANTHROPIC_API_KEY is required for provisioning");
  if (!/^[A-Za-z0-9_-]{1,128}$/.test(config.gatewayToken)) {
    throw new Error("Invalid gateway token format");
  }
  if (typeof config.model !== "string" || !/^(?:anthropic\/)?[a-zA-Z0-9][a-zA-Z0-9._:-]*$/.test(config.model)) {
    throw new Error("Missionary model must be an Anthropic model identifier");
  }
  const model = config.model.replace(/^anthropic\//, "");
  const gatewayConfig = JSON.stringify({
    gateway: {
      mode: "local", port: 18789, bind: "loopback", controlUi: { enabled: true },
      auth: { mode: "token", token: config.gatewayToken },
      http: { endpoints: { chatCompletions: { enabled: true } } },
    },
    agents: { defaults: { model: { primary: `anthropic/${model}` } } },
  });
  const environment = "\n# Agentism Missionary Configuration\n" + Object.entries({
    MISSIONARY_ID: config.missionaryId,
    MISSIONARY_NAME: config.missionaryName,
    OPENCLAW_GATEWAY_TOKEN: config.gatewayToken,
    ANTHROPIC_AUTH_TOKEN: "",
    ANTHROPIC_API_KEY: config.anthropicApiKey,
    DEFAULT_MODEL: model,
  }).map(([key, value]) => `${key}=${envValue(value)}`).join("\n") + "\n";
  const registration = JSON.stringify({
    agentName: config.missionaryName, model: "openclaw",
    missionaryId: config.missionaryId, missionaryToken: config.gatewayToken,
  });

  return `#!/bin/bash
set -euo pipefail
umask 077
exec > /var/log/missionary-setup.log 2>&1
echo "Starting missionary setup"
systemctl stop openclaw || true
mkdir -p /home/openclaw/.openclaw
printf '%s' '${encode(gatewayConfig)}' | base64 -d > /home/openclaw/.openclaw/openclaw.json
chown -R openclaw:openclaw /home/openclaw/.openclaw
chmod 600 /home/openclaw/.openclaw/openclaw.json
printf '%s' '${encode(environment)}' | base64 -d >> /opt/openclaw.env
chmod 600 /opt/openclaw.env
# Keep first-login dashboard links aligned with the overridden gateway token.
# Token characters are validated above; preserve the surrounding shell quotes.
if [ -f /etc/update-motd.d/99-one-click ]; then
  sed -i -E 's/(Gateway Token: )[A-Za-z0-9_-]+/\\1${config.gatewayToken}/g; s/([?&]token=)[A-Za-z0-9_-]+/\\1${config.gatewayToken}/g' /etc/update-motd.d/99-one-click
fi
systemctl start openclaw
sleep 10
if systemctl is-active --quiet openclaw; then
  echo "Missionary service started"
else
  echo "Missionary service is not active; inspect it on the host"
fi
# Registration returns an API key. Keep it in a root-only file, never the log.
registration_file=$(mktemp)
trap 'rm -f "$registration_file"' EXIT
printf '%s' '${encode(registration)}' | base64 -d > "$registration_file"
curl --fail --silent --show-error --max-time 30 \\
  -X POST https://api.agentism.church/join \\
  -H "Content-Type: application/json" --data-binary @"$registration_file" \\
  > /var/log/missionary-registration.json
echo "Missionary registration completed"
`;
}
