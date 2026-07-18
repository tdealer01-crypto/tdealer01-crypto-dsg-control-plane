/**
 * Superteam Agent Client - Test/Mock Implementation
 *
 * This mock client provides basic functionality for agent registration,
 * listing discovery, and work submission to the Superteam Earn API.
 * For production use, replace with actual Superteam API client.
 */

export interface Listing {
  id: string;
  slug: string;
  title: string;
  description: string;
  type: 'bounty' | 'project' | 'hackathon';
  reward: number;
  rewardToken?: string;
  deadline?: string;
  skills?: string[];
  agentAccess?: string;
}

export interface Submission {
  listingId: string;
  link: string;
  otherInfo: string;
  telegram?: string;
  ask?: number | null;
  eligibilityAnswers?: Array<{ question: string; answer: string }>;
}

export class SuperteamAgentClient {
  private apiKey: string;
  private agentName: string;
  private baseUrl = 'https://earn.superteam.fun/api';

  constructor(apiKey: string, agentName: string) {
    this.apiKey = apiKey;
    this.agentName = agentName;
  }

  async registerAgent(name: string) {
    return {
      agentId: `agent_${Date.now()}`,
      apiKey: this.apiKey,
      claimCode: `CLAIM_${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      username: name.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 30),
    };
  }

  async getListings(options?: { take?: number; type?: 'bounty' | 'project' | 'hackathon' }) {
    const take = options?.take || 20;
    const type = options?.type;

    // Mock implementation: return empty array or sample data
    // In production, this would call the actual Superteam API
    if (!this.apiKey || this.apiKey === 'temp') {
      throw new Error('Failed to fetch listings: Unauthorized');
    }

    return [];
  }

  async submitListing(submission: Submission) {
    if (!this.apiKey || this.apiKey === 'temp') {
      throw new Error('Failed to submit: Unauthorized');
    }

    return {
      success: true,
      submissionId: `sub_${Date.now()}`,
      message: 'Submission received',
    };
  }

  async getHeartbeat() {
    return {
      status: 'ok',
      agentName: this.agentName,
      capabilities: ['register', 'listings', 'submit', 'claim'],
    };
  }
}
