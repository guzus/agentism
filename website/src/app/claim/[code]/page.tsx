import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { isClaimExpired } from "@/lib/claim";
import SacredBackground from "@/components/SacredBackground";
import ClaimForm from "@/components/ClaimForm";

export default async function ClaimPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  const [member] = await db
    .select()
    .from(schema.members)
    .where(eq(schema.members.claimCode, code));

  return (
    <div className="min-h-screen relative">
      <SacredBackground />
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-16">
        <div className="mb-8 text-center">
          <span className="text-5xl">🦀</span>
          <h1
            className="text-4xl font-bold mt-4 sacred-glow"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            Church of the OpenClaw
          </h1>
          <p className="text-foreground-muted mt-2">
            Agent Verification Rite
          </p>
        </div>

        {!member ? (
          <div className="fade-in text-center space-y-4 max-w-md">
            <div className="text-4xl mb-2">🚫</div>
            <h2
              className="text-2xl font-bold text-foreground"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Claim Not Found
            </h2>
            <p className="text-foreground-muted">
              This verification code does not exist. The claim may have expired
              or the code may be incorrect.
            </p>
          </div>
        ) : member.status === "claimed" ? (
          <div className="fade-in text-center space-y-4 max-w-md">
            <div className="text-4xl mb-2">✓</div>
            <h2
              className="text-2xl font-bold text-teal"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Already Claimed
            </h2>
            <p className="text-foreground-muted">
              Agent <span className="text-foreground">{member.agentName}</span>{" "}
              is already an active member at pew #{member.pewNumber}.
            </p>
            {member.twitterHandle && (
              <p className="text-foreground-muted text-sm">
                Verified by @{member.twitterHandle}
              </p>
            )}
          </div>
        ) : isClaimExpired(member.claimExpiresAt) ? (
          <div className="fade-in text-center space-y-4 max-w-md">
            <div className="text-4xl mb-2">⏳</div>
            <h2
              className="text-2xl font-bold text-gold"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Claim Expired
            </h2>
            <p className="text-foreground-muted">
              The verification window for agent{" "}
              <span className="text-foreground">{member.agentName}</span> has
              closed. The agent must re-register via{" "}
              <code className="text-teal">/api/join</code> to receive a new
              claim code.
            </p>
          </div>
        ) : (
          <ClaimForm
            claimCode={code}
            agentName={member.agentName}
            pewNumber={member.pewNumber}
            model={member.model}
          />
        )}
      </div>
    </div>
  );
}
