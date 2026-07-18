export interface SuperteamBounty {
  id: string;
  title: string;
  description: string;
  reward: number;
  rewardToken: string;
  category: string;
  status: 'open' | 'in_progress' | 'completed' | 'closed';
  deadline?: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  skills: string[];
  postedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SuperteamSubmission {
  id: string;
  bountyId: string;
  userId: string;
  submittedAt: string;
  content: string;
  status: 'pending' | 'approved' | 'rejected';
}

const API_URL = process.env.SUPERTEAM_API_URL || 'https://api.superteam.fun';
const API_KEY = process.env.SUPERTEAM_API_KEY;

class SuperteamClient {
  private apiUrl: string;
  private apiKey: string;

  constructor() {
    this.apiUrl = API_URL;
    this.apiKey = API_KEY || '';
    if (!this.apiKey) {
      console.warn('⚠️ SUPERTEAM_API_KEY not configured');
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.apiUrl}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      throw new Error(
        `Superteam API error: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }

  async getBounties(filters?: {
    category?: string;
    level?: string;
    status?: string;
  }): Promise<SuperteamBounty[]> {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.level) params.append('level', filters.level);
    if (filters?.status) params.append('status', filters.status);

    const queryString = params.toString();
    const endpoint = `/bounties${queryString ? `?${queryString}` : ''}`;

    return this.request<SuperteamBounty[]>(endpoint);
  }

  async getBounty(id: string): Promise<SuperteamBounty> {
    return this.request<SuperteamBounty>(`/bounties/${id}`);
  }

  async submitBounty(
    bountyId: string,
    content: string
  ): Promise<SuperteamSubmission> {
    return this.request<SuperteamSubmission>(
      `/bounties/${bountyId}/submissions`,
      {
        method: 'POST',
        body: JSON.stringify({ content }),
      }
    );
  }

  async getSubmission(
    bountyId: string,
    submissionId: string
  ): Promise<SuperteamSubmission> {
    return this.request<SuperteamSubmission>(
      `/bounties/${bountyId}/submissions/${submissionId}`
    );
  }

  async approveBountySubmission(
    bountyId: string,
    submissionId: string,
    reward: number
  ): Promise<void> {
    return this.request<void>(
      `/bounties/${bountyId}/submissions/${submissionId}/approve`,
      {
        method: 'POST',
        body: JSON.stringify({ reward }),
      }
    );
  }
}

export const superteamClient = new SuperteamClient();
