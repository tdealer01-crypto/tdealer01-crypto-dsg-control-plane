/**
 * REPORT QUALITY RUBRIC TEST
 *
 * Validates that delivery-proof reports meet quality standards:
 * - 3+ specific findings (not generic AI filler)
 * - Actionability score >= 0.8
 * - 80%+ of reports pass rubric across scenarios
 */

import { describe, it, expect } from 'vitest';

describe('Delivery-Proof Report Quality', () => {
  interface ReportQualityTest {
    name: string;
    deliveryData: Record<string, unknown>;
    expectedFindings: string[]; // keywords that should appear in report
    minFindings: number;
  }

  const qualityTests: ReportQualityTest[] = [
    {
      name: 'Late delivery scenario',
      deliveryData: {
        orderId: 'order-late-001',
        status: 'delivered',
        plannedDeliveryTime: new Date(Date.now() - 86400000).toISOString(), // 24h ago
        actualDeliveryTime: new Date(Date.now() - 43200000).toISOString(), // 12h late
        attempts: 3,
      },
      expectedFindings: [
        'late',
        'delay',
        'missed',
        'retry', // at least 3 specific findings
      ],
      minFindings: 3,
    },
    {
      name: 'Failed delivery scenario',
      deliveryData: {
        orderId: 'order-failed-001',
        status: 'failed',
        attempts: 5,
        lastError: 'Recipient not at address',
        lastAttempt: new Date().toISOString(),
      },
      expectedFindings: [
        'failed',
        'unable',
        'retry',
        'address', // address-specific
      ],
      minFindings: 3,
    },
    {
      name: 'Multiple address issues',
      deliveryData: {
        orderId: 'order-multi-001',
        status: 'delivered',
        addressIssues: ['incomplete', 'ambiguous', 'missing_zip'],
        attempts: 4,
        resolution: 'confirmed via phone',
      },
      expectedFindings: [
        'address',
        'validation',
        'confirmation',
        'process', // process improvement
      ],
      minFindings: 3,
    },
    {
      name: 'Successful fast delivery',
      deliveryData: {
        orderId: 'order-fast-001',
        status: 'delivered',
        orderTime: new Date(Date.now() - 3600000).toISOString(), // 1h ago
        deliveryTime: new Date(Date.now() - 1800000).toISOString(), // 30min fast
        attempts: 1,
      },
      expectedFindings: [
        'excellent',
        'efficient',
        'maintain',
        'process', // process to maintain
      ],
      minFindings: 2, // lower for success case
    },
  ];

  qualityTests.forEach((test) => {
    it(`should generate quality report for: ${test.name}`, async () => {
      const response = await fetch(
        'http://localhost:3000/api/delivery-proof/scan',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ deliveryData: test.deliveryData }),
        }
      );

      expect(response.ok).toBe(true);
      const result = await response.json();

      const report = result.report || '';
      const reportLower = report.toLowerCase();

      // Count findings
      const foundFindings = test.expectedFindings.filter(
        (keyword) => reportLower.includes(keyword)
      );

      console.log(`
      Report for "${test.name}":
      - Length: ${report.length} chars
      - Found keywords: ${foundFindings.join(', ')}
      - Missing: ${test.expectedFindings
        .filter((k) => !foundFindings.includes(k))
        .join(', ')}
      - Report preview: ${report.substring(0, 200)}...
      `);

      // Rubric checks
      expect(report.length).toBeGreaterThan(200); // Minimum substantive content
      expect(foundFindings.length).toBeGreaterThanOrEqual(test.minFindings);

      // No generic filler
      expect(report).not.toMatch(/^As an AI/i); // avoid obvious AI preamble
      expect(report).not.toMatch(/^I notice that/i); // avoid filler

      // Should be specific and actionable
      const actionableWords = [
        'implement',
        'add',
        'consider',
        'review',
        'validate',
        'confirm',
        'improve',
        'process',
      ];
      const actionableCount = actionableWords.filter((word) =>
        reportLower.includes(word)
      ).length;

      expect(actionableCount).toBeGreaterThanOrEqual(1);
    });
  });

  it('should score report actionability >= 0.8', async () => {
    // Simple actionability scorer: counts actionable keywords + structure
    const testPayload = {
      deliveryData: {
        orderId: 'quality-test-001',
        status: 'delivered',
        attempts: 2,
        plannedTime: new Date(Date.now() - 86400000).toISOString(),
        actualTime: new Date(Date.now() - 43200000).toISOString(),
      },
    };

    const response = await fetch(
      'http://localhost:3000/api/delivery-proof/scan',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload),
      }
    );

    expect(response.ok).toBe(true);
    const result = await response.json();
    const report = result.report || '';

    // Scoring rubric
    let score = 0;

    // Has specific findings (not generic)
    if (
      report.includes('attempt') ||
      report.includes('retry') ||
      report.includes('delay')
    ) {
      score += 0.3;
    }

    // Has actionable recommendations
    if (
      report.match(
        /implement|add|consider|review|validate|improve|monitor/i
      )
    ) {
      score += 0.3;
    }

    // Has numerical data references
    if (report.match(/\d+/)) {
      score += 0.2;
    }

    // Has conclusion
    if (
      report.length > 300 &&
      (report.includes('therefore') || report.includes('recommend'))
    ) {
      score += 0.2;
    }

    console.log(`Actionability score: ${score.toFixed(2)}/1.0`);

    expect(score).toBeGreaterThanOrEqual(0.8);
  });
});
