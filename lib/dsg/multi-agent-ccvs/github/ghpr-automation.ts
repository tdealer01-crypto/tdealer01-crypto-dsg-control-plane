// GitHub PR Automation for CCVS Multi-Agent System
import { Octokit } from '@octokit/rest';
import { OrchestrationResult, LevelResult, AgentResult, EvidenceItem } from '../orchestrator/multi-agent-orchestrator';

export interface GHPRAutomationConfig {
  token: string;
  owner: string;
  repo: string;
  baseBranch: string;
}

export class GHPRAutomation {
  private octokit: Octokit;
  private config: GHPRAutomationConfig;

  constructor(config: GHPRAutomationConfig) {
    this.config = config;
    this.octokit = new Octokit({ auth: config.token });
  }

  async createCCVSPR(
    orchestration: OrchestrationResult,
    goal: string
  ): Promise<{ url: string; number: number }> {
    const branchName = orchestration.branchName;
    const commit = orchestration.commit;

    // 1. Create branch
    await this.createBranch(branchName, commit);

    // 2. Push evidence files
    await this.pushEvidenceFiles(branchName, orchestration.totalEvidence);

    // 3. Create PR
    const pr = await this.createPR(branchName, orchestration, goal);

    // 4. Add labels
    await this.addLabels(pr.number, ['ccvs', 'automated', 'evidence-pack']);

    // 5. Create status checks
    await this.createStatusChecks(pr.number, orchestration);

    return { url: pr.html_url, number: pr.number };
  }

  private async createBranch(branchName: string, commit: string): Promise<void> {
    const { data: baseBranch } = await this.octokit.repos.getBranch({
      owner: this.config.owner,
      repo: this.config.repo,
      branch: this.config.baseBranch
    });

    await this.octokit.git.createRef({
      owner: this.config.owner,
      repo: this.config.repo,
      ref: 'refs/heads/' + branchName,
      sha: baseBranch.commit.sha
    });
  }

  private async pushEvidenceFiles(branchName: string, evidence: EvidenceItem[]): Promise<void> {
    const filesByPath = new Map<string, EvidenceItem[]>();
    for (const item of evidence) {
      if (item.path && item.content) {
        const existing = filesByPath.get(item.path) || [];
        existing.push(item);
        filesByPath.set(item.path, existing);
      }
    }

    const tree = Array.from(filesByPath.entries()).map(([path, items]) => ({
      path,
      mode: '100644' as const,
      type: 'blob' as const,
      content: items.length === 1 ? items[0].content! : JSON.stringify(items.map(i => i.content), null, 2)
    }));

    const { data: baseBranch } = await this.octokit.repos.getBranch({
      owner: this.config.owner,
      repo: this.config.repo,
      branch: branchName
    });

    const { data: newTree } = await this.octokit.git.createTree({
      owner: this.config.owner,
      repo: this.config.repo,
      tree,
      base_tree: baseBranch.commit.commit.tree.sha
    });

    const { data: newCommit } = await this.octokit.git.createCommit({
      owner: this.config.owner,
      repo: this.config.repo,
      message: 'CCVS Evidence: Automated evidence pack for ' + branchName,
      tree: newTree.sha,
      parents: [baseBranch.commit.sha]
    });

    await this.octokit.git.updateRef({
      owner: this.config.owner,
      repo: this.config.repo,
      ref: 'heads/' + branchName,
      sha: newCommit.sha
    });
  }

  private async createPR(
    branchName: string, 
    orchestration: OrchestrationResult,
    goal: string
  ): Promise<{ html_url: string; number: number }> {
    const title = '[CCVS] Automated Evidence Pack: ' + goal;
    const body = this.generatePRBody(orchestration, goal);

    const { data: pr } = await this.octokit.pulls.create({
      owner: this.config.owner,
      repo: this.config.repo,
      title,
      head: branchName,
      base: this.config.baseBranch,
      body,
      draft: false
    });

    return { html_url: pr.html_url, number: pr.number };
  }

  private generatePRBody(orchestration: OrchestrationResult, goal: string): string {
    const { commit, levels, metrics, branchName } = orchestration;
    
    let levelDetails = '';
    for (const l of levels) {
      let agentDetails = '';
      for (const a of l.agents) {
        agentDetails += '- ' + a.agentId + ': ' + (a.success ? 'PASS' : 'FAIL') + ' (' + a.durationMs + 'ms)\n';
      }
      
      levelDetails += '### ' + l.level + ' (' + l.group + ')\n' +
        '- **Converged:** ' + (l.converged ? 'YES' : 'NO') + '\n' +
        '- **Score:** ' + (l.score * 100).toFixed(1) + '%\n' +
        '- **Iterations:** ' + l.iterations + '\n' +
        '- **Agents:**\n' + agentDetails + '\n';
    }

    const evidenceByLevel = orchestration.totalEvidence.reduce((acc: Record<string, EvidenceItem[]>, item: EvidenceItem) => {
      const level = item.level;
      if (!acc[level]) acc[level] = [];
      acc[level].push(item);
      return acc;
    }, {} as Record<string, EvidenceItem[]>);

    let evidenceDetails = '';
    const sortedLevels = Object.keys(evidenceByLevel).sort();
    for (const level of sortedLevels) {
      const items = evidenceByLevel[level];
      evidenceDetails += '#### ' + level + ' (' + items.length + ' items)\n';
      for (const item of items) {
        evidenceDetails += '- **' + item.name + '** (`' + item.type + '`): ' + item.description + '\n';
      }
      evidenceDetails += '\n';
    }

    return [
      '# CCVS Automated Evidence Pack',
      '',
      '**Goal:** ' + goal,
      '**Commit:** `' + commit + '`',
      '**Branch:** `' + branchName + '`',
      '',
      '## Orchestration Summary',
      '',
      '| Metric | Value |',
      '|--------|-------|',
      '| Total Duration | ' + (metrics.totalDurationMs / 1000).toFixed(1) + 's |',
      '| Total Agents | ' + metrics.totalAgents + ' |',
      '| Successful | ' + metrics.successfulAgents + ' |',
      '| Failed | ' + metrics.failedAgents + ' |',
      '| Total Evidence | ' + metrics.totalEvidence + ' |',
      '| Simulation Mode | ' + (metrics.simulationMode ? 'Yes' : 'No') + ' |',
      '',
      '## Level Results',
      '',
      levelDetails,
      '',
      '## Evidence Summary',
      '',
      evidenceDetails,
      '',
      '## Diffusion Trace',
      '',
      'Each agent ran internal diffusion loops (draft -> verify -> repair -> converge).',
      '',
      '---',
      '',
      '*Generated by DSG Multi-Agent CCVS Orchestrator*'
    ].join('\n');
  }

  private async addLabels(prNumber: number, labels: string[]): Promise<void> {
    await this.octokit.issues.addLabels({
      owner: this.config.owner,
      repo: this.config.repo,
      issue_number: prNumber,
      labels
    });
  }

  private async createStatusChecks(prNumber: number, orchestration: OrchestrationResult): Promise<void> {
    const allPassed = orchestration.levels.every(function(l) { return l.converged; });
    
    await this.octokit.repos.createCommitStatus({
      owner: this.config.owner,
      repo: this.config.repo,
      sha: orchestration.commit,
      state: allPassed ? 'success' : 'failure',
      context: 'ccvs/evidence-pack',
      description: allPassed ? 'CCVS evidence pack converged' : 'CCVS evidence pack failed to converge',
      target_url: 'https://github.com/' + this.config.owner + '/' + this.config.repo + '/pull/' + prNumber
    });
  }
}

export function createGHPRAutomation(config: GHPRAutomationConfig): GHPRAutomation {
  return new GHPRAutomation(config);
}