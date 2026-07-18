/**
 * In-memory store for agent testing when Supabase is unavailable
 * Used for local development and testing without DB connectivity
 */

export interface AgentRecord {
  id: string;
  name: string;
  apiKey: string;
  claimCode: string;
  username: string;
  createdAt: number;
}

export interface SubmissionRecord {
  id: string;
  agentId: string;
  listingId: string;
  link: string;
  otherInfo: string;
  createdAt: number;
}

class TestMemoryStore {
  private agents = new Map<string, AgentRecord>();
  private submissions = new Map<string, SubmissionRecord>();
  private heartbeats = new Map<string, number>();

  // Agents
  setAgent(agent: AgentRecord) {
    this.agents.set(agent.id, agent);
  }

  getAgent(agentId: string): AgentRecord | undefined {
    return this.agents.get(agentId);
  }

  // Submissions
  addSubmission(submission: SubmissionRecord) {
    this.submissions.set(submission.id, submission);
  }

  getSubmissions(agentId: string): SubmissionRecord[] {
    return Array.from(this.submissions.values()).filter(
      (s) => s.agentId === agentId
    );
  }

  // Heartbeats
  recordHeartbeat(agentId: string) {
    this.heartbeats.set(agentId, Date.now());
  }

  getLastHeartbeat(agentId: string): number | undefined {
    return this.heartbeats.get(agentId);
  }

  // Clear all (for testing)
  clear() {
    this.agents.clear();
    this.submissions.clear();
    this.heartbeats.clear();
  }

  // Debug info
  status() {
    return {
      agentCount: this.agents.size,
      submissionCount: this.submissions.size,
      heartbeatCount: this.heartbeats.size,
    };
  }
}

// Export singleton instance
export const testMemoryStore = new TestMemoryStore();
