// Church of the Open Claw - Shared Types

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
