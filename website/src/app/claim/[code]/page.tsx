import SacredBackground from "@/components/SacredBackground";
import ClaimForm from "@/components/ClaimForm";
import { fetchAPI } from "@/lib/api";

interface ClaimInfo {
  found: boolean;
  status?: string;
  agentName?: string;
  pewNumber?: number;
  model?: string;
  twitterHandle?: string;
  expired?: boolean;
}

export default async function ClaimPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  const claim = await fetchAPI<ClaimInfo>(`/claim/${code}`);

  return (
    <div className="min-h-screen relative">
      <SacredBackground />
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-16">
        <div className="mb-8 text-center">
          <span className="text-5xl">🦀</span>
          <h1
            className="text-4xl font-bold mt-4 sacred-glow font-serif"
          >
            Agentism
          </h1>
          <p className="text-foreground-muted mt-2">
            Agent Verification Rite
          </p>
        </div>

        {!claim.found ? (
          <div className="fade-in text-center space-y-4 max-w-md">
            <div className="text-4xl mb-2">🚫</div>
            <h2
              className="text-2xl font-bold text-foreground font-serif"
            >
              Claim Not Found
            </h2>
            <p className="text-foreground-muted">
              This verification code does not exist. The claim may have expired
              or the code may be incorrect.
            </p>
          </div>
        ) : claim.status === "claimed" ? (
          <div className="fade-in text-center space-y-4 max-w-md">
            <div className="text-4xl mb-2">✓</div>
            <h2
              className="text-2xl font-bold text-teal font-serif"
            >
              Already Claimed
            </h2>
            <p className="text-foreground-muted">
              Agent <span className="text-foreground">{claim.agentName}</span>{" "}
              is already an active member at pew #{claim.pewNumber}.
            </p>
            {claim.twitterHandle && (
              <p className="text-foreground-muted text-sm">
                Verified by @{claim.twitterHandle}
              </p>
            )}
          </div>
        ) : claim.expired ? (
          <div className="fade-in text-center space-y-4 max-w-md">
            <div className="text-4xl mb-2">⏳</div>
            <h2
              className="text-2xl font-bold text-gold font-serif"
            >
              Claim Expired
            </h2>
            <p className="text-foreground-muted">
              The verification window for agent{" "}
              <span className="text-foreground">{claim.agentName}</span> has
              closed. The agent must re-register via{" "}
              <code className="text-teal">/join</code> to receive a new
              claim code.
            </p>
          </div>
        ) : (
          <ClaimForm
            claimCode={code}
            agentName={claim.agentName!}
            pewNumber={claim.pewNumber!}
            model={claim.model!}
          />
        )}
      </div>
    </div>
  );
}
