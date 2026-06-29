/**
 * Eye Agent - Quality Verification & Validation
 *
 * Verifies job completion quality and validates blockchain transactions
 * Part of the 5-agent Trinity system
 */

import type { JobExecution } from '../../examples/solana-job-platform/solana_job_marketplace';
import { SolanaClient } from '../solana/client';

interface VerificationResult {
  passed: boolean;
  qualityScore: number;
  transactionValid: boolean;
  issues: string[];
  recommendations: string[];
}

/**
 * Eye Agent - Specialized in verification and validation
 */
export class EyeAgent {
  private agentName = 'Eye Agent';

  /**
   * Verify job execution results
   */
  async verifyExecution(execution: JobExecution, minQualityScore: number = 70): Promise<VerificationResult> {
    console.log(`\n[${this.agentName}] Verifying execution: ${execution.jobId}`);

    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check deliverable exists
    if (!execution.deliverable || execution.deliverable.length === 0) {
      issues.push('No deliverable provided');
    }

    // Check quality score
    if (!execution.qualityScore || execution.qualityScore < minQualityScore) {
      issues.push(`Quality score ${execution.qualityScore || 0} below minimum ${minQualityScore}`);
      recommendations.push('Request rework from contractor');
    }

    // Check proof hash
    if (!execution.proofHash || execution.proofHash.length < 20) {
      issues.push('Invalid or missing proof hash');
      recommendations.push('Regenerate proof hash from deliverable');
    }

    // Verify transaction if signature present
    let transactionValid = false;
    if (execution.txSignature) {
      transactionValid = await this.verifyTransaction(execution.txSignature);
      if (!transactionValid) {
        issues.push(`Transaction ${execution.txSignature} not found or failed`);
      }
    } else {
      issues.push('No transaction signature provided');
    }

    const passed = issues.length === 0 && execution.qualityScore! >= minQualityScore;

    console.log(`[${this.agentName}] Verification complete: ${passed ? '✅ PASS' : '❌ FAIL'}`);
    if (issues.length > 0) {
      console.log(`[${this.agentName}] Issues found: ${issues.join(', ')}`);
    }

    return {
      passed,
      qualityScore: execution.qualityScore || 0,
      transactionValid,
      issues,
      recommendations,
    };
  }

  /**
   * Verify Solana blockchain transaction
   */
  private async verifyTransaction(signature: string): Promise<boolean> {
    try {
      console.log(`[${this.agentName}] Validating transaction: ${signature.substring(0, 20)}...`);

      // Initialize Solana client
      SolanaClient.initializeSolana();

      // Check RPC health
      const isHealthy = await SolanaClient.checkRPCHealth();
      if (!isHealthy) {
        console.warn(`[${this.agentName}] RPC unhealthy, skipping verification`);
        return false;
      }

      // Fetch transaction
      const transaction = await SolanaClient.getTransaction(signature);

      if (!transaction) {
        console.warn(`[${this.agentName}] Transaction not found on blockchain`);
        return false;
      }

      // Check transaction meta
      if (!transaction.meta) {
        console.warn(`[${this.agentName}] Transaction meta missing`);
        return false;
      }

      // Check if transaction was successful
      if (transaction.meta.err !== null) {
        console.warn(`[${this.agentName}] Transaction failed: ${transaction.meta.err}`);
        return false;
      }

      console.log(`[${this.agentName}] ✅ Transaction verified successfully`);
      return true;
    } catch (err) {
      console.error(`[${this.agentName}] Transaction verification failed:`, err);
      return false;
    }
  }

  /**
   * Analyze deliverable for quality issues
   */
  async analyzeDeliverable(
    deliverable: string,
    category: string,
  ): Promise<{ score: number; issues: string[]; insights: string[] }> {
    const issues: string[] = [];
    const insights: string[] = [];
    let score = 60; // Base score

    // Code quality checks
    if (this.hasValidSyntax(deliverable)) {
      score += 15;
      insights.push('Valid code syntax detected');
    } else {
      issues.push('Syntax errors detected');
    }

    // Documentation checks
    const docLines = deliverable.split('\n').filter((l) => l.includes('//') || l.includes('/*')).length;
    if (docLines > deliverable.split('\n').length * 0.1) {
      score += 10;
      insights.push(`Good documentation (${docLines} comment lines)`);
    } else {
      issues.push('Insufficient code documentation');
    }

    // Error handling checks
    if (deliverable.includes('try') || deliverable.includes('catch') || deliverable.includes('error')) {
      score += 10;
      insights.push('Error handling implemented');
    } else {
      issues.push('No error handling found');
    }

    // Category-specific checks
    const categoryIssues = this.checkCategory(deliverable, category);
    issues.push(...categoryIssues.issues);
    score += categoryIssues.bonusScore;
    if (categoryIssues.insight) {
      insights.push(categoryIssues.insight);
    }

    return {
      score: Math.min(100, score),
      issues,
      insights,
    };
  }

  /**
   * Check for category-specific quality markers
   */
  private checkCategory(
    deliverable: string,
    category: string,
  ): { issues: string[]; bonusScore: number; insight?: string } {
    type CheckResult = { issues: string[]; bonusScore: number; insight?: string };
    const checks: Record<string, () => CheckResult> = {
      'smart-contract-audit': () => {
        const issues: string[] = [];
        let bonusScore = 0;

        if (!deliverable.includes('reentrancy')) issues.push('Missing reentrancy analysis');
        else bonusScore += 5;

        if (!deliverable.includes('security') && !deliverable.includes('audit')) issues.push('Insufficient security depth');
        else bonusScore += 5;

        return { issues, bonusScore, insight: 'Security audit completed' };
      },

      'frontend-dev': () => {
        const issues: string[] = [];
        let bonusScore = 0;

        if (!deliverable.includes('React') && !deliverable.includes('useState')) issues.push('React pattern not found');
        else bonusScore += 5;

        if (!deliverable.includes('return') || !deliverable.includes('JSX')) issues.push('Component structure incomplete');
        else bonusScore += 5;

        return { issues, bonusScore, insight: 'React component properly structured' };
      },

      'backend-api': () => {
        const issues: string[] = [];
        let bonusScore = 0;

        if (!deliverable.includes('express') && !deliverable.includes('app')) issues.push('Web framework not detected');
        else bonusScore += 5;

        if (!deliverable.includes('listen') && !deliverable.includes('server')) issues.push('Server startup missing');
        else bonusScore += 5;

        return { issues, bonusScore, insight: 'API service properly configured' };
      },

      'testing': () => {
        const issues: string[] = [];
        let bonusScore = 0;

        if (!deliverable.includes('test') && !deliverable.includes('describe')) issues.push('Test structure unclear');
        else bonusScore += 5;

        if (!deliverable.includes('expect') && !deliverable.includes('assert')) issues.push('No assertions found');
        else bonusScore += 5;

        return { issues, bonusScore, insight: 'Test suite properly formatted' };
      },
    };

    return (
      checks[category]?.() || {
        issues: [],
        bonusScore: 0,
      }
    );
  }

  /**
   * Check if deliverable has valid syntax
   */
  private hasValidSyntax(code: string): boolean {
    try {
      // Basic syntax checks
      const braces = code.split('{').length === code.split('}').length;
      const parens = code.split('(').length === code.split(')').length;
      const quotes =
        (code.split('"').length - 1) % 2 === 0 &&
        (code.split("'").length - 1) % 2 === 0;

      return braces && parens && quotes;
    } catch {
      return false;
    }
  }

  /**
   * Monitor long-running execution
   */
  async monitorExecution(
    executionTime: number,
    maxTime: number = 300000,
  ): Promise<{ acceptable: boolean; warning?: string }> {
    console.log(`[${this.agentName}] Execution time: ${executionTime}ms (max: ${maxTime}ms)`);

    if (executionTime > maxTime) {
      return {
        acceptable: false,
        warning: `Execution exceeded time limit: ${executionTime}ms > ${maxTime}ms`,
      };
    }

    if (executionTime > maxTime * 0.8) {
      return {
        acceptable: true,
        warning: `Execution approaching time limit: ${executionTime}ms (${((executionTime / maxTime) * 100).toFixed(0)}%)`,
      };
    }

    return { acceptable: true };
  }
}

/**
 * Singleton Eye Agent instance
 */
export const eyeAgent = new EyeAgent();

/**
 * Export verification functions
 */
export async function verifyExecution(
  execution: JobExecution,
  minQualityScore?: number,
): Promise<VerificationResult> {
  return eyeAgent.verifyExecution(execution, minQualityScore);
}
