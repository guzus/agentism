import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { generateUserData } from "../src/lib/provisioning-script";

const options = {
  missionaryId: "fixture-member", gatewayToken: "fixture-token",
  missionaryName: "Missionary", model: "anthropic/claude-test", anthropicApiKey: "fixture-key",
};

test("cloud-init keeps hostile text as data, including heredoc delimiters", () => {
  const name = "O'Brien $(printf INJECTED) `printf EXECUTED`\nCONFIGEOF\nENVEOF\n한글";
  const script = generateUserData({ ...options, missionaryName: name });
  assert.equal(spawnSync("bash", ["-n"], { input: script }).status, 0);
  assert.ok(!script.includes(name));
  const documents = [...script.matchAll(/printf '%s' '([A-Za-z0-9+/=]+)' \| base64 -d/g)]
    .map((match) => Buffer.from(match[1], "base64").toString("utf8"));
  assert.equal(documents.length, 3);
  assert.equal(JSON.parse(documents[0]).agents.defaults.model.primary, "anthropic/claude-test");
  assert.equal(JSON.parse(documents[2]).agentName, name);
  // Source only the generated env document in a disposable shell. Unescaped
  // command substitution would change the output and fail this assertion.
  const sourced = spawnSync("bash", ["--noprofile", "--norc"], {
    input: documents[1] + '\nprintf "%s" "$MISSIONARY_NAME"', encoding: "utf8",
  });
  assert.equal(sourced.status, 0);
  assert.equal(sourced.stdout, name.replace(/[\r\n]/g, " "));
  assert.ok(!script.includes("set -ex"));
  assert.ok(!script.includes("echo \"Gateway token:"));
  assert.ok(!script.includes("$(cat /var/log/missionary-registration"));
  assert.match(script, /umask 077/);
});

test("provisioning rejects unsupported model input before creating resources", () => {
  for (const model of ["openai/gpt-test", "claude\nENVEOF", "$(id)", ""]) {
    assert.throws(() => generateUserData({ ...options, model }), /Anthropic model/);
  }
  assert.throws(() => generateUserData({ ...options, anthropicApiKey: "" }), /API_KEY/);
  assert.throws(() => generateUserData({ ...options, gatewayToken: "$(id)" }), /token format/);
});

test("MOTD token replacement preserves surrounding shell and dashboard URL", () => {
  const script = generateUserData(options);
  const expression = script.match(/sed -i -E '([^']+)'/)![1];
  const motd = 'echo "Gateway Token: old-token"\necho "https://host?token=old-token"\n';
  const patched = spawnSync("sed", ["-E", expression], { input: motd, encoding: "utf8" });
  assert.equal(patched.status, 0);
  assert.equal(patched.stdout, motd.replaceAll("old-token", options.gatewayToken));
  assert.equal(spawnSync("bash", ["-n"], { input: patched.stdout }).status, 0);
});
