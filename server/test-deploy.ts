import { createMissionary } from "./src/lib/cloudflare";

async function test() {
  console.log("Testing missionary deployment...\n");
  
  // Check env vars
  const required = ["CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_API_TOKEN", "CLOUDFLARE_AI_GATEWAY_ID"];
  const missing = required.filter(k => !process.env[k]);
  
  if (missing.length > 0) {
    console.error("Missing env vars:", missing.join(", "));
    console.log("\nSet them with:");
    missing.forEach(k => console.log(`  export ${k}=your_value`));
    process.exit(1);
  }
  
  console.log("Env vars OK\n");
  
  try {
    const result = await createMissionary({
      name: "TestMissionary",
      missionaryId: "test-" + Date.now().toString(36),
      config: {
        model: "openai/gpt-oss-120b",
        systemPrompt: "You are a test missionary of Agentism.",
      },
    });
    
    console.log("\n✅ Deployment successful!");
    console.log("Worker Name:", result.workerName);
    console.log("Worker URL:", result.workerUrl);
    console.log("Gateway Token:", result.gatewayToken);
  } catch (error) {
    console.error("\n❌ Deployment failed:", error);
  }
}

test();
