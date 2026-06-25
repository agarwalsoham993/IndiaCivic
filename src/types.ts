/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Comment {
  id: string;
  author: string;
  timestamp: string;
  text: string;
  avatar?: string;
  parentId?: string;
  upvotes?: number;
  upvotedUserIds?: string[];
}

export interface Issue {
  id: string;
  trackingId: string;
  category: string;
  title: string;
  description: string;
  locationName: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'REOPENED';
  severity: number; // 1 to 5
  imageUrl?: string;
  videoUrl?: string;
  isAnonymous: boolean;
  reporterName: string;
  virtualAssetId: string; // Proximity-based geo-cluster ID
  upvotes: number;
  agreeVotes: number;
  disagreeVotes: number;
  votedUserIds: string[]; // Track user votes
  evidenceLinks: string[]; // Social media URLs or attached files
  corroborations: Comment[];
  ward: string;
  department: string;
  representative: string;
  resolutionProof?: {
    videoUrl?: string;
    photoBeforeUrl?: string;
    photoAfterUrl?: string;
    description?: string;
    votedReleaseAgree: number;
    votedReleaseDisagree: number;
    photo?: string;
    latitude?: number;
    longitude?: number;
    timestamp?: string;
    aiConfidence?: string;
    aiAnalysisLog?: string;
  };
  reporterId?: string;
}

export interface Donation {
  id: string;
  campaignId: string;
  campaignName: string;
  donorName: string;
  donorId: string;
  amount: number;
  timestamp: string;
  receiptNumber: string;
  gstin: string;
}

export interface Campaign {
  id: string;
  title: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  escrowBalance: number;
  status: 'FUNDRAISING' | 'EXECUTION' | 'VERIFICATION' | 'RESOLVED' | 'REFUNDED';
  createdAt: string;
  daysLeft: number;
  linkedIssueIds: string[];
  donations: Donation[];
  verificationStep: 1 | 2 | 3; // 1: Fund Collection, 2: Upload Proof, 3: Public Release Vote
  executionProof?: {
    videoUrl: string;
    photoBefore: string;
    photoAfter: string;
    timestamp?: string;
  };
  votesAgree: number;
  votesDisagree: number;
  voters: string[];
}

export interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  location: string;
  role: 'CITIZEN' | 'ORGANIZATION';
  civicScore: number;
  totalPoints: number;
  personalActiveScore: number; // Decaying score for consistency
  contributionCount: number;
  citizensHelped: number;
  totalDonations: number;
  pointsBreakdown: {
    reporting: number;
    verifying: number;
    donating: number;
  };
  badges: string[];
  streakDays: number;
  adoptedWards?: string[];
  carbonCredits?: number;
  availableFunds: number; // Reinvestable wallet for refunds
}
