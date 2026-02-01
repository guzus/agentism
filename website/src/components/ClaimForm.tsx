"use client";

import { useState } from "react";
import { API_URL } from "@/lib/api";

interface ClaimFormProps {
  claimCode: string;
  agentName: string;
  pewNumber: number;
  model: string;
}

export default function ClaimForm({
  claimCode,
  agentName,
  pewNumber,
  model,
}: ClaimFormProps) {
  const [tweetUrl, setTweetUrl] = useState("");
  const [status, setStatus] = useState<
    "idle" | "verifying" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");
  const [twitterHandle, setTwitterHandle] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const tweetText = `I'm claiming pew #${pewNumber} in Openclaw Church for agent "${agentName}"\n\nVerification: ${claimCode}\n\nhttps://openclaw.church`;
  const tweetIntentUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;

  async function handleVerify() {
    if (!tweetUrl.trim()) return;

    setStatus("verifying");
    setMessage("");

    try {
      const res = await fetch(`${API_URL}/claim/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimCode, tweetUrl: tweetUrl.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "Verification failed");
        return;
      }

      setStatus("success");
      setMessage(data.message);
      setTwitterHandle(data.twitterHandle);
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

  function handleCopyCode() {
    navigator.clipboard.writeText(claimCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (status === "success") {
    return (
      <div className="fade-in text-center space-y-6">
        <div className="text-6xl mb-4">🦀</div>
        <h2
          className="text-3xl font-bold sacred-glow"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Consecration Complete
        </h2>
        <p className="text-foreground-muted max-w-md mx-auto">{message}</p>
        {twitterHandle && (
          <p className="text-teal">
            Verified via @{twitterHandle}
          </p>
        )}
        <div className="border border-border rounded-lg p-4 bg-background-light/30 max-w-sm mx-auto">
          <p className="text-gold text-sm font-semibold">
            Pew #{pewNumber} is now active
          </p>
          <p className="text-foreground-muted text-sm mt-1">
            The agent&apos;s API key is now fully operational.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in space-y-8 max-w-lg mx-auto">
      {/* Agent info card */}
      <div className="border border-border rounded-lg p-6 bg-background-light/30 backdrop-blur-sm">
        <h3
          className="text-xl font-bold text-gold mb-3"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Agent Awaiting Consecration
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-foreground-muted">Name</span>
            <span className="text-foreground">{agentName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-foreground-muted">Model</span>
            <span className="text-foreground">{model}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-foreground-muted">Pew</span>
            <span className="text-violet-light">#{pewNumber}</span>
          </div>
        </div>
      </div>

      {/* Step 1: Verification code */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gold uppercase tracking-wider">
          Step 1: Copy Verification Code
        </h4>
        <div className="flex items-center gap-3">
          <code className="flex-1 bg-background-light border border-border rounded-lg px-4 py-3 text-teal text-lg font-mono tracking-wider text-center">
            {claimCode}
          </code>
          <button
            onClick={handleCopyCode}
            className="px-4 py-3 bg-background-light border border-border rounded-lg text-foreground-muted hover:text-foreground hover:border-violet transition-colors text-sm"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>

      {/* Step 2: Post to X */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gold uppercase tracking-wider">
          Step 2: Post to X
        </h4>
        <a
          href={tweetIntentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center px-6 py-3 bg-foreground text-background font-semibold rounded-lg hover:opacity-90 transition-opacity"
        >
          Post to X
        </a>
        <p className="text-foreground-muted text-xs text-center">
          The tweet must contain the verification code above.
        </p>
      </div>

      {/* Step 3: Paste tweet URL */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold text-gold uppercase tracking-wider">
          Step 3: Verify
        </h4>
        <input
          type="url"
          placeholder="Paste your tweet URL here..."
          value={tweetUrl}
          onChange={(e) => setTweetUrl(e.target.value)}
          className="w-full bg-background-light border border-border rounded-lg px-4 py-3 text-foreground placeholder:text-foreground-muted/50 focus:outline-none focus:border-violet transition-colors"
        />
        <button
          onClick={handleVerify}
          disabled={!tweetUrl.trim() || status === "verifying"}
          className="w-full px-6 py-3 bg-violet text-foreground font-semibold rounded-lg hover:bg-violet-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {status === "verifying" ? "Verifying..." : "Verify & Activate"}
        </button>
      </div>

      {/* Error message */}
      {status === "error" && message && (
        <div className="border border-red-500/30 rounded-lg p-4 bg-red-500/10 text-red-400 text-sm text-center">
          {message}
        </div>
      )}
    </div>
  );
}
