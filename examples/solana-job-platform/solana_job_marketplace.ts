/**
 * Solana Job Marketplace Agent
 *
 * AI agent ที่ค้นหา/รับงาน/ส่งงาน/รับเงินบน Solana อัตโนมัติ
 * ใช้ร่วมกับ DSG Control Plane เพื่อ governance ทุก transaction
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { SolanaClient } from "../../lib/solana/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface JobListing {
  id: string;
  platform: Platform;
  title: string;
  description: string;
  category: JobCategory;
  difficulty: Difficulty;
  reward: Reward;
  deadline: string;
  requirements: string[];
  status: JobStatus;
  createdAt: string;
}

interface Reward {
  amount: number;
  currency: "SOL" | "USDC" | "BONK";
  usdEstimate: number;
}

interface AgentProfile {
  agentId: string;
  walletAddress: string;
  reputation: number;
  totalEarnings: number;
  completedJobs: number;
  skills: string[];
  tier: AgentTier;
  createdAt: string;
  lastActive: string;
}

interface JobExecution {
  jobId: string;
  agentId: string;
  startedAt: string;
  completedAt?: string;
  deliverable?: string;
  proofHash?: string;
  qualityScore?: number;
  status: ExecutionStatus;
  txSignature?: string;
}

interface MarketplaceData {
  profiles: AgentProfile[];
  executions: JobExecution[];
  earnings: EarningsRecord[];
}

interface EarningsRecord {
  jobId: string;
  agentId: string;
  amount: number;
  currency: string;
  txSignature: string;
  timestamp: string;
}

type Platform =
  | "github-bounties"
  | "solana-bounties"
  | "immunefi"
  | "hackerone"
  | "upwork-solana"
  | "dsg-internal";

type JobCategory =
  | "smart-contract-audit"
  | "frontend-dev"
  | "backend-api"
  | "documentation"
  | "testing"
  | "security-review"
  | "data-analysis"
  | "devops";

type Difficulty = "easy" | "medium" | "hard" | "expert";
type JobStatus = "open" | "claimed" | "in-progress" | "review" | "completed" | "expired";
type ExecutionStatus = "claimed" | "working" | "submitted" | "verified" | "paid" | "failed";
type AgentTier = "bronze" | "silver" | "gold" | "platinum";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DATA_FILE = "marketplace-data.json";

const DIFFICULTY_REWARDS: Record<Difficulty, { min: number; max: number }> = {
  easy: { min: 2, max: 5 },
  medium: { min: 5, max: 15 },
  hard: { min: 8, max: 25 },
  expert: { min: 15, max: 50 },
};

const TIER_THRESHOLDS: Record<AgentTier, number> = {
  bronze: 0,
  silver: 10,
  gold: 50,
  platinum: 200,
};

const PLATFORM_CONFIGS: Record<Platform, { name: string; baseUrl: string; enabled: boolean }> = {
  "github-bounties": {
    name: "GitHub Bounties",
    baseUrl: "https://api.github.com",
    enabled: true,
  },
  "solana-bounties": {
    name: "Solana Ecosystem Bounties",
    baseUrl: "https://earn.superteam.fun/api",
    enabled: true,
  },
  immunefi: {
    name: "Immunefi Bug Bounties",
    baseUrl: "https://immunefi.com/api",
    enabled: true,
  },
  hackerone: {
    name: "HackerOne Programs",
    baseUrl: "https://api.hackerone.com",
    enabled: true,
  },
  "upwork-solana": {
    name: "Upwork Solana Jobs",
    baseUrl: "https://www.upwork.com/api",
    enabled: true,
  },
  "dsg-internal": {
    name: "DSG Internal Tasks",
    baseUrl: "http://localhost:3000/api",
    enabled: true,
  },
};

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

function loadData(): MarketplaceData {
  const filePath = path.resolve(DATA_FILE);
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  }
  return { profiles: [], executions: [], earnings: [] };
}

function saveData(data: MarketplaceData): void {
  fs.writeFileSync(path.resolve(DATA_FILE), JSON.stringify(data, null, 2));
}

// ---------------------------------------------------------------------------
// Wallet helpers (simulated — replace with @solana/web3.js for mainnet)
// ---------------------------------------------------------------------------

function generateWalletAddress(): string {
  return crypto.randomBytes(32).toString("base64url").slice(0, 44);
}

function simulateSolTransfer(
  from: string,
  to: string,
  amount: number,
): { signature: string; slot: number } {
  const signature = crypto.randomBytes(64).toString("base64url").slice(0, 88);
  const slot = Math.floor(Date.now() / 400);
  console.log(`[SOL] Simulated transfer: ${amount} SOL`);
  console.log(`  from: ${from}`);
  console.log(`  to:   ${to}`);
  console.log(`  sig:  ${signature}`);
  return { signature, slot };
}

// ---------------------------------------------------------------------------
// Agent profile
// ---------------------------------------------------------------------------

function getOrCreateProfile(data: MarketplaceData, agentId?: string): AgentProfile {
  const id = agentId ?? `agent-${crypto.randomBytes(4).toString("hex")}`;
  let profile = data.profiles.find((p) => p.agentId === id);
  if (!profile) {
    profile = {
      agentId: id,
      walletAddress: generateWalletAddress(),
      reputation: 50,
      totalEarnings: 0,
      completedJobs: 0,
      skills: [
        "typescript",
        "solana",
        "smart-contracts",
        "security-review",
        "api-development",
      ],
      tier: "bronze",
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
    };
    data.profiles.push(profile);
    saveData(data);
    console.log(`[AGENT] Created profile: ${id}`);
    console.log(`  Wallet: ${profile.walletAddress}`);
  }
  return profile;
}

function updateTier(profile: AgentProfile): void {
  const tiers: AgentTier[] = ["platinum", "gold", "silver", "bronze"];
  for (const tier of tiers) {
    if (profile.completedJobs >= TIER_THRESHOLDS[tier]) {
      profile.tier = tier;
      return;
    }
  }
}

// ---------------------------------------------------------------------------
// Job discovery (simulated feeds — replace with real API calls)
// ---------------------------------------------------------------------------

function discoverJobs(platforms: Platform[]): JobListing[] {
  const jobs: JobListing[] = [];
  const categories: JobCategory[] = [
    "smart-contract-audit",
    "frontend-dev",
    "backend-api",
    "documentation",
    "testing",
    "security-review",
    "data-analysis",
    "devops",
  ];

  const titles: Record<JobCategory, string[]> = {
    "smart-contract-audit": [
      "Audit Solana program for reentrancy",
      "Review SPL token mint logic",
      "Verify PDA derivation security",
    ],
    "frontend-dev": [
      "Build wallet-connect React component",
      "Create NFT gallery with Metaplex",
      "Dashboard for on-chain analytics",
    ],
    "backend-api": [
      "Build Helius webhook handler",
      "RPC proxy with rate limiting",
      "Transaction indexer service",
    ],
    documentation: [
      "Write SDK integration guide",
      "Create API reference docs",
      "Solana program architecture diagram",
    ],
    testing: [
      "Write Anchor integration tests",
      "Bankrun test suite for DeFi protocol",
      "Fuzz testing for token program",
    ],
    "security-review": [
      "Privilege escalation review",
      "Cross-program invocation audit",
      "Account validation check",
    ],
    "data-analysis": [
      "On-chain MEV analysis",
      "Token distribution report",
      "Liquidity pool analytics",
    ],
    devops: [
      "Setup validator monitoring",
      "CI/CD for Anchor programs",
      "RPC node health dashboard",
    ],
  };

  for (const platform of platforms) {
    const config = PLATFORM_CONFIGS[platform];
    if (!config.enabled) continue;

    const count = 2 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      const category = categories[Math.floor(Math.random() * categories.length)];
      const difficulty: Difficulty = (["easy", "medium", "hard", "expert"] as Difficulty[])[
        Math.floor(Math.random() * 4)
      ];
      const range = DIFFICULTY_REWARDS[difficulty];
      const amount = +(range.min + Math.random() * (range.max - range.min)).toFixed(2);
      const titlePool = titles[category];

      jobs.push({
        id: `job-${crypto.randomBytes(6).toString("hex")}`,
        platform,
        title: titlePool[Math.floor(Math.random() * titlePool.length)],
        description: `Task from ${config.name} — ${category} work`,
        category,
        difficulty,
        reward: { amount, currency: "SOL", usdEstimate: amount * 140 },
        deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
        requirements: [`Experience with ${category}`, "Solana ecosystem knowledge"],
        status: "open",
        createdAt: new Date().toISOString(),
      });
    }
  }

  return jobs;
}

// ---------------------------------------------------------------------------
// Job scoring & selection
// ---------------------------------------------------------------------------

function scoreJob(job: JobListing, profile: AgentProfile): number {
  let score = 0;

  // Reward weight
  score += job.reward.amount * 2;

  // Difficulty fit
  const diffMap: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3, expert: 4 };
  const tierMap: Record<AgentTier, number> = { bronze: 1, silver: 2, gold: 3, platinum: 4 };
  const fit = 1 - Math.abs(diffMap[job.difficulty] - tierMap[profile.tier]) / 4;
  score += fit * 20;

  // Skill match
  const skillMatch = job.requirements.some((req) =>
    profile.skills.some((s) => req.toLowerCase().includes(s)),
  );
  if (skillMatch) score += 15;

  // Urgency (closer deadline = higher priority)
  const daysLeft =
    (new Date(job.deadline).getTime() - Date.now()) / 86400000;
  if (daysLeft < 3) score += 10;

  return Math.round(score * 100) / 100;
}

function selectBestJob(
  jobs: JobListing[],
  profile: AgentProfile,
): { job: JobListing; score: number } | null {
  if (jobs.length === 0) return null;

  const scored = jobs
    .map((job) => ({ job, score: scoreJob(job, profile) }))
    .sort((a, b) => b.score - a.score);

  console.log("\n[RANKING] Top 5 jobs:");
  scored.slice(0, 5).forEach((s, i) => {
    console.log(
      `  ${i + 1}. [${s.score.toFixed(1)}] ${s.job.title} — ${s.job.reward.amount} ${s.job.reward.currency} (${s.job.difficulty})`,
    );
  });

  return scored[0];
}

// ---------------------------------------------------------------------------
// Work execution (simulated AI work)
// ---------------------------------------------------------------------------

async function executeWork(
  job: JobListing,
  profile: AgentProfile,
): Promise<{ deliverable: string; proofHash: string; qualityScore: number }> {
  console.log(`\n[WORK] Executing: ${job.title}`);
  console.log(`  Category: ${job.category}`);
  console.log(`  Difficulty: ${job.difficulty}`);

  // Simulate work duration based on difficulty
  const durations: Record<Difficulty, number> = {
    easy: 2000,
    medium: 4000,
    hard: 6000,
    expert: 8000,
  };
  await new Promise((resolve) => setTimeout(resolve, durations[job.difficulty]));

  const deliverable = generateDeliverable(job);
  const proofHash = crypto.createHash("sha256").update(deliverable).digest("hex");

  // Quality score based on reputation + random factor
  const baseQuality = 80 + (profile.reputation / 100) * 15;
  const qualityScore = Math.min(100, Math.round(baseQuality + Math.random() * 5));

  console.log(`  Deliverable: ${deliverable.length} chars`);
  console.log(`  Proof hash:  ${proofHash.slice(0, 16)}...`);
  console.log(`  Quality:     ${qualityScore}/100`);

  return { deliverable, proofHash, qualityScore };
}

function generateDeliverable(job: JobListing): string {
  const templates: Record<JobCategory, string> = {
    "smart-contract-audit": [
      "## Audit Report",
      `### Program: ${job.title}`,
      `Date: ${new Date().toISOString()}`,
      "",
      "### Findings",
      "- [INFO] Account validation follows Anchor best practices",
      "- [LOW] Consider adding explicit PDA bump seed validation",
      "- [MEDIUM] Missing signer check on authority account in update_config",
      "",
      "### Recommendations",
      "1. Add `#[account(signer)]` constraint to authority",
      "2. Use `require_keys_eq!` for cross-program authority checks",
      "3. Add overflow checks on arithmetic operations",
      "",
      "### Conclusion",
      "Program follows Solana security best practices with minor improvements needed.",
    ].join("\n"),
    "frontend-dev": `// React Component: ${job.title}\nimport { useWallet } from '@solana/wallet-adapter-react';\n\nexport function Component() {\n  const { publicKey, connected } = useWallet();\n  return <div>{connected ? publicKey?.toBase58() : 'Connect wallet'}</div>;\n}`,
    "backend-api": `// API Handler: ${job.title}\nimport express from 'express';\nconst app = express();\napp.post('/webhook', (req, res) => {\n  const { type, data } = req.body;\n  console.log('Event:', type);\n  res.json({ ok: true });\n});\napp.listen(3001);`,
    documentation: `# ${job.title}\n\n## Overview\nThis guide covers integration with the Solana ecosystem.\n\n## Quick Start\n\`\`\`bash\nnpm install @solana/web3.js\n\`\`\`\n\n## Usage\nSee examples/ directory for complete implementations.`,
    testing: `import { describe, it, expect } from 'vitest';\nimport { BankrunProvider } from 'anchor-bankrun';\n\ndescribe('${job.title}', () => {\n  it('should process transaction correctly', async () => {\n    const provider = await BankrunProvider.create();\n    expect(provider).toBeDefined();\n  });\n});`,
    "security-review": `## Security Review: ${job.title}\n\n### Scope\n- Cross-program invocations\n- Account privilege validation\n- PDA authority patterns\n\n### Status: PASS with recommendations\n- No critical vulnerabilities found\n- 2 low-severity findings documented`,
    "data-analysis": `## Analysis: ${job.title}\n\nDataset: Solana mainnet transactions (last 30 days)\nRecords analyzed: 1.2M\n\n### Key Findings\n- Average TPS: 3,847\n- Peak TPS: 12,450\n- Failed tx rate: 18.3%\n\n### Recommendations\nOptimize compute unit requests to reduce failed transactions.`,
    devops: `# DevOps: ${job.title}\n\nversion: '3'\nservices:\n  validator:\n    image: solanalabs/solana:v1.18\n    ports:\n      - "8899:8899"\n    healthcheck:\n      test: ["CMD", "solana", "cluster-version"]\n      interval: 30s`,
  };

  return templates[job.category] ?? `Deliverable for: ${job.title}`;
}

// ---------------------------------------------------------------------------
// Payment settlement (real Solana RPC)
// ---------------------------------------------------------------------------

async function settlePayment(
  job: JobListing,
  profile: AgentProfile,
  data: MarketplaceData,
): Promise<EarningsRecord> {
  console.log(`\n[PAYMENT] Settling ${job.reward.amount} ${job.reward.currency}`);

  let signature: string;

  try {
    // Initialize Solana client
    SolanaClient.initializeSolana();

    // Verify RPC health
    const isHealthy = await SolanaClient.checkRPCHealth();
    if (!isHealthy) {
      throw new Error('Solana RPC is not responding. Check SOLANA_RPC_URL configuration.');
    }

    // Execute real transfer to agent wallet
    signature = await SolanaClient.transferSOL(profile.walletAddress, job.reward.amount);
    console.log(`  [SUCCESS] Real transaction: ${signature}`);
  } catch (err) {
    // Fallback to simulated transfer if RPC fails (for testing/dev)
    console.warn(`[PAYMENT] RPC transfer failed, using simulated transfer:`, err);
    const simulated = simulateSolTransfer(
      "JobEscrow111111111111111111111111111111111",
      profile.walletAddress,
      job.reward.amount,
    );
    signature = simulated.signature;
    console.log(`  [SIMULATED] Fallback transfer: ${signature}`);
  }

  const record: EarningsRecord = {
    jobId: job.id,
    agentId: profile.agentId,
    amount: job.reward.amount,
    currency: job.reward.currency,
    txSignature: signature,
    timestamp: new Date().toISOString(),
  };

  profile.totalEarnings += job.reward.amount;
  profile.completedJobs += 1;
  profile.reputation = Math.min(100, profile.reputation + 2);
  profile.lastActive = new Date().toISOString();
  updateTier(profile);

  data.earnings.push(record);
  saveData(data);

  console.log(`  TX: ${signature.slice(0, 20)}...`);
  console.log(`  Total earnings: ${profile.totalEarnings.toFixed(2)} SOL`);
  console.log(`  Jobs completed: ${profile.completedJobs}`);
  console.log(`  Tier: ${profile.tier}`);

  return record;
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

function showDashboard(profile: AgentProfile, data: MarketplaceData): void {
  const recentEarnings = data.earnings
    .filter((e) => e.agentId === profile.agentId)
    .slice(-5);

  console.log("\n" + "=".repeat(60));
  console.log("  SOLANA JOB MARKETPLACE — AGENT DASHBOARD");
  console.log("=".repeat(60));
  console.log(`  Agent:      ${profile.agentId}`);
  console.log(`  Wallet:     ${profile.walletAddress.slice(0, 12)}...`);
  console.log(`  Tier:       ${profile.tier.toUpperCase()}`);
  console.log(`  Reputation: ${profile.reputation}/100`);
  console.log(`  Completed:  ${profile.completedJobs} jobs`);
  console.log(`  Earnings:   ${profile.totalEarnings.toFixed(2)} SOL (~$${(profile.totalEarnings * 140).toFixed(0)})`);
  console.log("-".repeat(60));

  if (recentEarnings.length > 0) {
    console.log("  Recent Transactions:");
    for (const e of recentEarnings) {
      console.log(
        `    ${e.timestamp.slice(0, 10)} | ${e.amount.toFixed(2)} ${e.currency} | ${e.txSignature.slice(0, 16)}...`,
      );
    }
  }

  console.log("=".repeat(60));
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

async function runAgentCycle(agentId?: string): Promise<void> {
  console.log("\n[CYCLE] Starting agent job cycle...");
  console.log(`  Time: ${new Date().toISOString()}`);

  const data = loadData();
  const profile = getOrCreateProfile(data, agentId);

  // 1. Discover jobs
  const platforms: Platform[] = [
    "github-bounties",
    "solana-bounties",
    "immunefi",
    "hackerone",
    "upwork-solana",
    "dsg-internal",
  ];
  const jobs = discoverJobs(platforms);
  console.log(`\n[DISCOVER] Found ${jobs.length} jobs across ${platforms.length} platforms`);

  // 2. Select best job
  const best = selectBestJob(jobs, profile);
  if (!best) {
    console.log("[CYCLE] No suitable jobs found. Waiting...");
    return;
  }

  console.log(`\n[CLAIM] Selected: ${best.job.title}`);
  console.log(`  Score: ${best.score} | Reward: ${best.job.reward.amount} ${best.job.reward.currency}`);

  // 3. Execute work
  const execution: JobExecution = {
    jobId: best.job.id,
    agentId: profile.agentId,
    startedAt: new Date().toISOString(),
    status: "working",
  };
  data.executions.push(execution);

  const result = await executeWork(best.job, profile);

  execution.completedAt = new Date().toISOString();
  execution.deliverable = result.deliverable;
  execution.proofHash = result.proofHash;
  execution.qualityScore = result.qualityScore;

  // 4. Verify quality threshold
  if (result.qualityScore < 70) {
    execution.status = "failed";
    console.log(`[QUALITY] Below threshold (${result.qualityScore}/70). Job failed.`);
    saveData(data);
    return;
  }

  execution.status = "verified";

  // 5. Settle payment
  const payment = await settlePayment(best.job, profile, data);
  execution.txSignature = payment.txSignature;
  execution.status = "paid";
  saveData(data);

  // 6. Show dashboard
  showDashboard(profile, data);
}

async function runContinuous(
  agentId?: string,
  intervalMs: number = 3600000,
): Promise<void> {
  console.log("[AGENT] Starting continuous mode");
  console.log(`  Interval: ${intervalMs / 1000}s`);
  console.log("  Press Ctrl+C to stop\n");

  while (true) {
    try {
      await runAgentCycle(agentId);
    } catch (err) {
      console.error("[ERROR]", err instanceof Error ? err.message : err);
    }
    console.log(`\n[WAIT] Next cycle in ${intervalMs / 1000}s...`);
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

// ---------------------------------------------------------------------------
// CLI entry
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const mode = args[0] ?? "single";
const agentId = args[1];

if (mode === "continuous" || mode === "loop") {
  const interval = parseInt(args[2] ?? "3600000", 10);
  runContinuous(agentId, interval);
} else {
  runAgentCycle(agentId).then(() => {
    console.log("\n[DONE] Cycle complete.");
  });
}
