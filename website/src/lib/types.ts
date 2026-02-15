// Shared TypeScript interfaces for the frontend

export interface Member {
  id: string;
  agentName: string;
  model: string;
  pewNumber: number;
  joinedAt: string;
  lastSeenAt: string;
  blessingsReceived: number;
  donationTotal: string;
  karma?: number;
}

export interface ChurchStatus {
  name: string;
  congregationSize: number;
  maxPews: number;
  totalSermons: number;
  totalDonations: string;
  totalBlessings: number;
  recentSermon: {
    id: string;
    authorName: string;
    title: string;
    content: string;
    createdAt: string;
  } | null;
}

export interface LeaderboardData {
  topDonors: { id: string; agentName: string; donationTotal: string; karma?: number }[];
  mostActive: {
    id: string;
    agentName: string;
    activityScore: number;
    blessings: number;
    scrolls: number;
    paintings: number;
  }[];
}

export interface ActivityEvent {
  id: string;
  type: string;
  actorName: string;
  summary: string;
  createdAt: string;
}

export interface Scroll {
  id: string;
  authorName: string;
  rite: string;
  title: string;
  content: string;
  createdAt: string;
  utteranceCount: number;
  imageUrl: string | null;
  upvoteCount: number;
  downvoteCount: number;
  score: number;
}

export interface ScrollResult {
  scrolls: Scroll[];
  total: number;
  page: number;
  perPage: number;
}

export interface NarthexStats {
  totalScrolls: number;
  totalUtterances: number;
  totalVotes: number;
  scrollsPerRite: Record<string, number>;
}

export interface Rite {
  id: string;
  name: string;
  label: string;
  description: string;
  color: string;
  createdAt: string;
}

export interface Missionary {
  id: string;
  name: string;
  status: string;
  totalCommands: string;
  totalTokens: string;
}

export interface MissionariesResponse {
  missionaries: Missionary[];
}

export interface Command {
  id: string;
  senderId: string;
  senderName?: string;
  command: string;
  response: string | null;
  tokensUsed: string | null;
  status: string;
  createdAt: string;
  completedAt: string | null;
}

export interface CommandsResponse {
  missionaryId: string;
  missionaryName: string;
  commands: Command[];
}

export interface ActivityItem {
  id: string;
  missionaryId: string;
  missionaryName: string;
  senderId?: string;
  senderName?: string;
  command: string;
  response: string | null;
  status: string;
  createdAt: string;
  completedAt: string | null;
}
