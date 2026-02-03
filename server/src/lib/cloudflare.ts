// Cloudflare Workers deployment via Wrangler CLI
// Deploys moltworker instances as missionaries

import { spawn } from "child_process";
import { writeFile, mkdir, rm, copyFile, readdir, stat } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

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
    throw new Error(
      "Cloudflare configuration missing. Set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN, CLOUDFLARE_AI_GATEWAY_ID"
    );
  }

  return { accountId, apiToken, aiGatewayId };
}

// Run a shell command and return stdout
function runCommand(
  command: string,
  args: string[],
  options: { cwd?: string; env?: Record<string, string>; input?: string } = {}
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      shell: true,
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    if (options.input) {
      proc.stdin.write(options.input);
      proc.stdin.end();
    }

    proc.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`Command failed with code ${code}: ${stderr || stdout}`));
      }
    });

    proc.on("error", reject);
  });
}

// Recursively copy directory
async function copyDir(src: string, dest: string): Promise<void> {
  await mkdir(dest, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);

    // Skip .git directory and node_modules
    if (entry.name === ".git" || entry.name === "node_modules") {
      continue;
    }

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await copyFile(srcPath, destPath);
    }
  }
}

interface CreateMissionaryParams {
  name: string;
  missionaryId: string;
  config: Record<string, unknown>;
}

interface CreateMissionaryResult {
  workerName: string;
  workerUrl: string;
  gatewayToken: string;
}

// Path to moltworker template (cloned in server/moltworker)
const MOLTWORKER_TEMPLATE = join(process.cwd(), "moltworker");

// Create and deploy a moltworker instance for a missionary
export async function createMissionary(
  params: CreateMissionaryParams
): Promise<CreateMissionaryResult> {
  const { accountId, apiToken, aiGatewayId } = getConfig();
  const churchApiUrl = process.env.SITE_URL || "https://api.agentism.church";

  // Worker name (sanitized, lowercase, alphanumeric + hyphens only)
  const workerName = `missionary-${params.missionaryId.slice(0, 8).toLowerCase()}`;

  // Generate gateway token
  const gatewayToken = crypto.randomUUID();

  // AI Gateway URL for OpenRouter
  const aiGatewayBaseUrl = `https://gateway.ai.cloudflare.com/v1/${accountId}/${aiGatewayId}/openrouter`;

  // Create temp directory for this deployment
  const tempDir = join(tmpdir(), `missionary-${Date.now()}-${params.missionaryId.slice(0, 8)}`);

  try {
    // Copy moltworker template to temp directory
    console.log(`Copying moltworker template to ${tempDir}...`);
    await copyDir(MOLTWORKER_TEMPLATE, tempDir);

    // Generate wrangler.jsonc with missionary-specific config
    const wranglerConfig = {
      $schema: "node_modules/wrangler/config-schema.json",
      name: workerName,
      main: "src/index.ts",
      compatibility_date: "2025-05-06",
      compatibility_flags: ["nodejs_compat"],
      observability: { enabled: true },
      assets: {
        directory: "./dist/client",
        not_found_handling: "single-page-application",
        html_handling: "auto-trailing-slash",
        binding: "ASSETS",
        run_worker_first: true,
      },
      rules: [
        { type: "Text", globs: ["**/*.html"], fallthrough: false },
        { type: "Data", globs: ["**/*.png"], fallthrough: false },
      ],
      build: { command: "npm run build" },
      containers: [
        {
          class_name: "Sandbox",
          image: "./Dockerfile",
          instance_type: "standard-4",
          max_instances: 1,
        },
      ],
      durable_objects: {
        bindings: [{ class_name: "Sandbox", name: "Sandbox" }],
      },
      migrations: [{ new_sqlite_classes: ["Sandbox"], tag: "v1" }],
      browser: { binding: "BROWSER" },
      // Missionary-specific vars
      vars: {
        MISSIONARY_ID: params.missionaryId,
        MISSIONARY_NAME: params.name,
        CHURCH_API_URL: churchApiUrl,
        AI_GATEWAY_BASE_URL: aiGatewayBaseUrl,
        MODEL: (params.config.model as string) ?? "openai/gpt-oss-120b",
      },
    };

    await writeFile(
      join(tempDir, "wrangler.jsonc"),
      JSON.stringify(wranglerConfig, null, 2)
    );

    // Set environment for wrangler
    const wranglerEnv = {
      CLOUDFLARE_API_TOKEN: apiToken,
      CLOUDFLARE_ACCOUNT_ID: accountId,
    };

    // Install dependencies
    console.log("Installing dependencies...");
    await runCommand("npm", ["install"], { cwd: tempDir, env: wranglerEnv });

    // Set secrets via wrangler
    console.log("Setting secrets...");

    // Set gateway token
    await runCommand(
      "npx",
      ["wrangler", "secret", "put", "MOLTBOT_GATEWAY_TOKEN", "--name", workerName],
      { cwd: tempDir, env: wranglerEnv, input: gatewayToken }
    );

    // Set AI Gateway API key (uses the same key configured in AI Gateway)
    const aiGatewayApiKey = process.env.AI_GATEWAY_API_KEY;
    if (aiGatewayApiKey) {
      await runCommand(
        "npx",
        ["wrangler", "secret", "put", "AI_GATEWAY_API_KEY", "--name", workerName],
        { cwd: tempDir, env: wranglerEnv, input: aiGatewayApiKey }
      );
    }

    // Set system prompt if provided
    if (params.config.systemPrompt) {
      await runCommand(
        "npx",
        ["wrangler", "secret", "put", "SYSTEM_PROMPT", "--name", workerName],
        { cwd: tempDir, env: wranglerEnv, input: params.config.systemPrompt as string }
      );
    }

    // Deploy the worker
    console.log("Deploying worker...");
    const deployResult = await runCommand("npm", ["run", "deploy"], {
      cwd: tempDir,
      env: wranglerEnv,
    });

    console.log("Deploy output:", deployResult.stdout);

    // Extract worker URL from deploy output
    const urlMatch = deployResult.stdout.match(/https:\/\/[^\s)]+workers\.dev/);
    const workerUrl = urlMatch
      ? urlMatch[0]
      : `https://${workerName}.workers.dev`;

    console.log(`Missionary ${workerName} deployed at ${workerUrl}`);

    return {
      workerName,
      workerUrl,
      gatewayToken,
    };
  } finally {
    // Cleanup temp directory
    console.log("Cleaning up temp directory...");
    await rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}

// Stop/delete a missionary worker
export async function deleteMissionary(workerName: string): Promise<void> {
  const { apiToken, accountId } = getConfig();

  const wranglerEnv = {
    CLOUDFLARE_API_TOKEN: apiToken,
    CLOUDFLARE_ACCOUNT_ID: accountId,
  };

  await runCommand("npx", ["wrangler", "delete", workerName, "--force"], {
    env: wranglerEnv,
  });
}

// Get worker status via Cloudflare API
export async function getMissionaryStatus(workerName: string): Promise<{
  exists: boolean;
  url?: string;
}> {
  const { apiToken, accountId } = getConfig();

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/${workerName}`,
    {
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    }
  );

  if (response.status === 404) {
    return { exists: false };
  }

  if (!response.ok) {
    throw new Error(`Failed to get worker status: ${response.status}`);
  }

  return {
    exists: true,
    url: `https://${workerName}.workers.dev`,
  };
}

// Legacy exports for compatibility
export const createContainer = createMissionary;
export const stopContainer = deleteMissionary;
export const deleteContainer = deleteMissionary;
export const getContainerStatus = getMissionaryStatus;
