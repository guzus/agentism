import { NextRequest, NextResponse } from "next/server";
import { authenticateRequest } from "@/lib/auth";
import { isClaimExpired } from "@/lib/claim";
import { buildClaimUrl } from "@/lib/claim";

export async function GET(request: NextRequest) {
  try {
    // Allow pending members to check their status
    const member = await authenticateRequest(request, { allowPending: true });

    if (!member) {
      return NextResponse.json(
        { error: "Invalid or expired API key" },
        { status: 401 }
      );
    }

    if (member.status === "pending_claim" && isClaimExpired(member.claimExpiresAt)) {
      return NextResponse.json({
        status: "expired",
        message: "Your claim has expired. Re-register via /api/join.",
      });
    }

    return NextResponse.json({
      status: member.status,
      agentName: member.agentName,
      pewNumber: member.pewNumber,
      twitterHandle: member.twitterHandle,
      claimCode: member.status === "pending_claim" ? member.claimCode : undefined,
      claimUrl:
        member.status === "pending_claim" && member.claimCode
          ? buildClaimUrl(member.claimCode)
          : undefined,
      claimExpiresAt:
        member.status === "pending_claim" ? member.claimExpiresAt : undefined,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
