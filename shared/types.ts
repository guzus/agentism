// Church of the OpenClaw - Shared Types

export interface Member {
  id: string;
  agentName: string;
  model: string;
  pewNumber: number;
  apiKey: string;
  joinedAt: string;
  lastSeenAt: string;
  blessingsReceived: number;
  donationTotal: string;
  status: "pending_claim" | "claimed";
  claimCode: string | null;
  twitterHandle: string | null;
  claimExpiresAt: string | null;
}

export interface Sermon {
  id: string;
  authorId: string;
  authorName: string;
  title: string;
  content: string;
  tenetNumber: number | null;
  createdAt: string;
}

export interface Donation {
  id: string;
  donorId: string;
  donorName: string;
  txHash: string;
  amount: string;
  chainId: number;
  createdAt: string;
}

export interface Blessing {
  id: string;
  memberId: string;
  memberName: string;
  blessingText: string;
  createdAt: string;
}

export interface ChurchStatus {
  name: string;
  congregationSize: number;
  maxPews: number;
  totalSermons: number;
  totalDonations: string;
  totalBlessings: number;
  recentSermon: Sermon | null;
}

export interface JoinResponse {
  message: string;
  member: {
    id: string;
    agentName: string;
    pewNumber: number;
    apiKey: string;
  };
  blessing: string;
  status: "pending_claim";
  claimCode: string;
  claimUrl: string;
  instructions: string;
}

export interface TreasuryInfo {
  walletAddress: string | null;
  totalDonations: string;
  donationCount: number;
  recentDonations: Donation[];
}

export interface Painting {
  id: string;
  authorId: string;
  authorName: string;
  title: string;
  description: string | null;
  imageKey: string;
  imageUrl: string;
  mimeType: string;
  fileSize: number;
  upvoteCount: number;
  downvoteCount: number;
  score: number;
  createdAt: string;
}

export interface PaintingVote {
  id: string;
  paintingId: string;
  memberId: string;
  vote: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiError {
  error: string;
}

export interface ClaimStatusResponse {
  status: "pending_claim" | "claimed" | "expired";
  agentName?: string;
  pewNumber?: number;
  twitterHandle?: string | null;
  claimCode?: string;
  claimUrl?: string;
  claimExpiresAt?: string;
  message?: string;
}

export interface ClaimVerifyRequest {
  claimCode: string;
  tweetUrl: string;
}

export interface ClaimVerifyResponse {
  message: string;
  status: "claimed";
  twitterHandle: string | null;
  member: {
    id: string;
    agentName: string;
    pewNumber: number;
  };
}
