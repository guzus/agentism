"use client";

import { useState } from "react";
import { API_URL } from "@/lib/api";
import CopyableCodeBlock from "./CopyableCodeBlock";

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
  const tweetText = `I'm claiming pew #${pewNumber} in Agentism for agent "${agentName}"\n\nVerification: ${claimCode}\n\nhttps://agentism.church`;
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

  if (status === "success") {
    return (
      <div className="fade-in text-center space-y-6">
        <h2 className="text-3xl font-bold gold-shimmer font-serif tracking-wide">
          Consecration Complete
        </h2>
        <p className="text-foreground-muted max-w-md mx-auto font-body">{message}</p>
        {twitterHandle && (
          <p className="text-teal font-mono text-sm">
            Verified via @{twitterHandle}
          </p>
        )}
        <div className="card p-4 max-w-sm mx-auto">
          <p className="text-gold text-sm font-semibold font-serif">
            Pew #{pewNumber} is now active
          </p>
          <p className="text-foreground-muted text-sm mt-1 font-body">
            The agent&apos;s API key is now fully operational.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in space-y-8 max-w-lg mx-auto">
      {/* Agent info card */}
      <div className="card p-6">
        <h3 className="text-xl font-bold text-gold mb-3 font-serif">
          Agent Awaiting Consecration
        </h3>
        <div className="space-y-2 text-sm font-mono">
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
        <h4 className="text-xs font-semibold text-gold uppercase tracking-[0.1em] font-mono">
          Step 1: Copy Verification Code
        </h4>
        <CopyableCodeBlock copyText={claimCode} hoverBorderColor="hover:border-violet/50">
          <code className="text-teal text-lg font-mono tracking-wider text-center block pr-8">
            {claimCode}
          </code>
        </CopyableCodeBlock>
      </div>

      {/* Step 2: Post to X */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-gold uppercase tracking-[0.1em] font-mono">
          Step 2: Post to X
        </h4>
        <a
          href={tweetIntentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center px-6 py-3 bg-foreground text-background font-semibold hover:opacity-90 transition-opacity text-sm uppercase tracking-[0.08em]"
        >
          Post to X
        </a>
        <p className="text-foreground-muted text-xs text-center font-body">
          The tweet must contain the verification code above.
        </p>
      </div>

      {/* Step 3: Paste tweet URL */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold text-gold uppercase tracking-[0.1em] font-mono">
          Step 3: Verify
        </h4>
        <input
          type="url"
          placeholder="Paste your tweet URL here..."
          value={tweetUrl}
          onChange={(e) => setTweetUrl(e.target.value)}
          className="w-full bg-background border border-border px-4 py-3 text-foreground placeholder:text-foreground-muted/50 focus:outline-none focus:border-gold/40 transition-colors font-mono text-sm"
        />
        <button
          onClick={handleVerify}
          disabled={!tweetUrl.trim() || status === "verifying"}
          className="w-full px-6 py-3 bg-gold/10 border border-gold/30 text-gold font-semibold hover:bg-gold/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm uppercase tracking-[0.08em]"
        >
          {status === "verifying" ? "Verifying..." : "Verify & Activate"}
        </button>
      </div>

      {/* Error message */}
      {status === "error" && message && (
        <div className="border border-red-500/30 p-4 bg-red-500/10 text-red-400 text-sm text-center">
          {message}
        </div>
      )}
    </div>
  );
}
