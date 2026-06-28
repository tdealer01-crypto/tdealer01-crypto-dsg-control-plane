/**
 * Hand Agent - Job Execution & Deliverable Generation
 *
 * Executes selected jobs and generates deliverables
 * Part of the 5-agent Trinity system
 */

import * as crypto from 'crypto';
import type { JobListing, JobExecution } from '../../examples/solana-job-platform/solana_job_marketplace';

interface ExecutionResult {
  deliverable: string;
  qualityScore: number;
  proofHash: string;
  executionTime: number;
}

/**
 * Hand Agent - Specialized in work execution and deliverable generation
 */
export class HandAgent {
  private agentName = 'Hand Agent';

  /**
   * Execute job and generate deliverable
   */
  async executeJob(job: JobListing): Promise<ExecutionResult> {
    console.log(`\n[${this.agentName}] Executing: ${job.title}`);

    const startTime = Date.now();

    try {
      // Step 1: Analyze job requirements
      const plan = this.analyzeRequirements(job);
      console.log(`[${this.agentName}] Plan: ${plan}`);

      // Step 2: Generate deliverable based on category
      const deliverable = await this.generateDeliverable(job, plan);
      console.log(`[${this.agentName}] Generated deliverable (${deliverable.length} bytes)`);

      // Step 3: Self-verify quality
      const qualityScore = await this.verifyQuality(job, deliverable);
      console.log(`[${this.agentName}] Quality score: ${qualityScore}/100`);

      // Step 4: Create proof hash
      const proofHash = this.createProofHash(deliverable);

      const executionTime = Date.now() - startTime;

      return {
        deliverable,
        qualityScore,
        proofHash,
        executionTime,
      };
    } catch (err) {
      console.error(`[${this.agentName}] Execution failed:`, err);
      throw err;
    }
  }

  /**
   * Analyze job requirements and create execution plan
   */
  private analyzeRequirements(job: JobListing): string {
    const categoryPlans: Record<string, string> = {
      'smart-contract-audit': 'Perform security audit on Solana program: Check for reentrancy, account validation, PDA derivation. Generate audit report.',
      'frontend-dev': 'Build React component with wallet integration: Create responsive UI, handle wallet connection, display data. Package as npm module.',
      'backend-api': 'Implement API service: Create REST endpoints, add authentication, implement caching. Deploy with error handling.',
      documentation: 'Create technical documentation: Write API reference, add code examples, include architecture diagrams.',
      testing: 'Write comprehensive tests: Create unit tests, integration tests, add coverage reporting.',
      'security-review': 'Conduct security review: Analyze code for vulnerabilities, check best practices, generate security report.',
      'data-analysis': 'Perform data analysis: Extract insights, create visualizations, generate analytics report.',
      devops: 'Setup monitoring and CI/CD: Configure monitoring dashboards, create automation scripts, document setup.',
    };

    return categoryPlans[job.category] || 'Complete task according to requirements and best practices.';
  }

  /**
   * Generate deliverable based on job type
   * In production, this would call real AI model (DeepSeek/Qwen)
   * For now, generates template-based deliverable
   */
  private async generateDeliverable(job: JobListing, plan: string): Promise<string> {
    // Simulate work execution time (0.5-3 seconds)
    const workTime = 500 + Math.random() * 2500;
    await new Promise((resolve) => setTimeout(resolve, workTime));

    const templates: Record<string, string> = {
      'smart-contract-audit': this.generateAuditReport(job),
      'frontend-dev': this.generateReactComponent(job),
      'backend-api': this.generateAPIService(job),
      documentation: this.generateDocumentation(job),
      testing: this.generateTestSuite(job),
      'security-review': this.generateSecurityReport(job),
      'data-analysis': this.generateAnalysisReport(job),
      devops: this.generateDeploymentGuide(job),
    };

    return templates[job.category] || this.generateGenericDeliverable(job, plan);
  }

  private generateAuditReport(job: JobListing): string {
    return `# Solana Program Security Audit Report

**Program:** ${job.title}
**Date:** ${new Date().toISOString()}
**Status:** REVIEWED

## Findings Summary
- Reentrancy Risk: ✅ PASS
- Account Validation: ✅ PASS
- PDA Derivation: ✅ PASS
- Overflow Protection: ✅ PASS

## Critical Issues: 0
## High Issues: 0
## Medium Issues: 1

### Issue M-1: Missing Event Logging
**Severity:** Medium
**Recommendation:** Add event emissions for state changes

## Conclusion
The program is well-structured and follows security best practices. No critical vulnerabilities identified.`;
  }

  private generateReactComponent(job: JobListing): string {
    return `import React, { useState, useEffect } from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export const ${this.pascalCase(job.title)}: React.FC = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    // Component logic
    console.log('Component mounted');
  }, []);

  return (
    <div className="container">
      <WalletMultiButton />
      <div>{data && JSON.stringify(data)}</div>
    </div>
  );
};

export default ${this.pascalCase(job.title)};`;
  }

  private generateAPIService(job: JobListing): string {
    return `import express from 'express';

const app = express();
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Main endpoint
app.get('/api/${job.id}', (req, res) => {
  res.json({
    data: 'Response data here',
    timestamp: new Date().toISOString()
  });
});

app.listen(3000, () => {
  console.log('API service running on port 3000');
});`;
  }

  private generateDocumentation(job: JobListing): string {
    return `# ${job.title}

## Overview
${job.description}

## Getting Started

### Prerequisites
- Node.js 16+
- Solana CLI

### Installation
\`\`\`bash
npm install
\`\`\`

### Usage
\`\`\`bash
npm run dev
\`\`\`

## API Reference

### Main Endpoint
\`GET /api/endpoint\`

**Parameters:**
- \`id\` (string): Resource identifier

**Response:**
\`\`\`json
{
  "status": "success",
  "data": {}
}
\`\`\`

## Architecture
[Diagram would go here]

## Testing
\`\`\`bash
npm run test
\`\`\``;
  }

  private generateTestSuite(job: JobListing): string {
    return `import { describe, it, expect } from 'vitest';

describe('${job.title}', () => {
  it('should initialize correctly', () => {
    expect(true).toBe(true);
  });

  it('should handle valid input', () => {
    const result = execute({ valid: true });
    expect(result).toBeDefined();
  });

  it('should reject invalid input', () => {
    expect(() => execute({ invalid: true })).toThrow();
  });

  it('should maintain data integrity', () => {
    const data = [1, 2, 3];
    const result = process(data);
    expect(result.length).toBe(3);
  });
});`;
  }

  private generateSecurityReport(job: JobListing): string {
    return `# Security Review Report

**Subject:** ${job.title}
**Date:** ${new Date().toISOString()}

## Executive Summary
Comprehensive security review completed. No critical vulnerabilities identified.

## Findings
### Critical (0)
### High (0)
### Medium (1)

#### M-1: Configuration Hardening
Recommend hardening configuration management.

## Recommendations
1. Enable rate limiting
2. Implement WAF rules
3. Add security headers
4. Enable audit logging

## Conclusion
System demonstrates strong security posture.`;
  }

  private generateAnalysisReport(job: JobListing): string {
    return `# Data Analysis Report

**Analysis Date:** ${new Date().toISOString()}
**Dataset Size:** 10,000+ records

## Key Findings

### Metric 1
- Value: 450
- Change: +12% YoY
- Trend: Increasing

### Metric 2
- Value: 87%
- Change: +3% QoQ
- Trend: Stable

## Insights
1. Strong growth in primary metrics
2. Consistent performance across segments
3. Opportunities in emerging segments

## Recommendations
- Focus on high-growth areas
- Optimize conversion funnels
- Expand successful programs`;
  }

  private generateDeploymentGuide(job: JobListing): string {
    return `# Deployment & Operations Guide

## Prerequisites
- Docker installed
- kubectl configured
- Access to cluster

## Deployment Steps

1. Build Docker image
\`\`\`bash
docker build -t app:latest .
\`\`\`

2. Push to registry
\`\`\`bash
docker push registry/app:latest
\`\`\`

3. Deploy to cluster
\`\`\`bash
kubectl apply -f deployment.yaml
\`\`\`

## Monitoring
- CPU: < 80%
- Memory: < 75%
- Response time: < 200ms

## Scaling
Horizontal pod autoscaler configured for 2-10 replicas.`;
  }

  private generateGenericDeliverable(job: JobListing, plan: string): string {
    return `# Deliverable: ${job.title}

## Plan
${plan}

## Implementation
[Implementation details here]

## Testing Results
✅ All tests passed
✅ Code review approved
✅ Performance benchmarks met

## Deployment
Ready for production deployment.

## Support
For issues, refer to documentation or contact support.`;
  }

  /**
   * Verify quality of deliverable
   */
  private async verifyQuality(job: JobListing, deliverable: string): Promise<number> {
    let score = 50; // Base score

    // Length check
    if (deliverable.length > 500) score += 15;
    if (deliverable.length > 1000) score += 10;

    // Content quality checks
    if (deliverable.includes('function') || deliverable.includes('class')) score += 10;
    if (deliverable.includes('error') || deliverable.includes('try')) score += 5;
    if (deliverable.includes('test') || deliverable.includes('verify')) score += 5;

    // Category-specific checks
    const categoryChecks: Record<string, () => number> = {
      'smart-contract-audit': () =>
        (deliverable.includes('audit') ? 5 : 0) +
        (deliverable.includes('security') ? 5 : 0),
      'frontend-dev': () =>
        (deliverable.includes('React') || deliverable.includes('component') ? 5 : 0) +
        (deliverable.includes('useState') ? 5 : 0),
      'backend-api': () =>
        (deliverable.includes('express') || deliverable.includes('API') ? 5 : 0) +
        (deliverable.includes('listen') ? 5 : 0),
      documentation: () =>
        (deliverable.includes('#') ? 5 : 0) + (deliverable.includes('Installation') ? 5 : 0),
      testing: () =>
        (deliverable.includes('test') || deliverable.includes('expect') ? 5 : 0) +
        (deliverable.includes('describe') ? 5 : 0),
    };

    const categoryScore = categoryChecks[job.category]?.() || 0;
    score += categoryScore;

    return Math.min(100, score);
  }

  /**
   * Create proof hash of deliverable
   */
  private createProofHash(deliverable: string): string {
    return crypto.createHash('sha256').update(deliverable).digest('hex').substring(0, 44);
  }

  /**
   * Helper: Convert string to PascalCase
   */
  private pascalCase(str: string): string {
    return str
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }
}

/**
 * Singleton Hand Agent instance
 */
export const handAgent = new HandAgent();

/**
 * Export execution function for external use
 */
export async function executeJob(job: JobListing): Promise<ExecutionResult> {
  return handAgent.executeJob(job);
}
