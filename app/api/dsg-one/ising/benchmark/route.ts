/**
 * Phase 5 API Endpoint: Ising Benchmark Service
 *
 * POST /api/dsg-one/ising/benchmark
 * Run benchmark suite programmatically
 *
 * GET /api/dsg-one/ising/benchmark
 * Fetch latest benchmark results
 */

import { NextRequest, NextResponse } from 'next/server';
import { benchmarkIsingVsZ3, loadBenchmarkCases, exportBenchmarkReport } from '@/lib/dsg-one/ising-benchmark';
import type { BenchmarkReport } from '@/lib/dsg-one/ising-benchmark';

// In-memory cache for last benchmark result (simple implementation)
let lastBenchmarkReport: BenchmarkReport | null = null;
let benchmarkInProgress = false;

/**
 * POST: Trigger benchmark run
 *
 * Request body:
 * {
 *   "cases": ["small", "medium", "large"],  // optional, defaults to all
 *   "modes": ["z3-only", "ising-z3-verify"] // optional, defaults to all
 * }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    if (benchmarkInProgress) {
      return NextResponse.json(
        { error: 'Benchmark already in progress' },
        { status: 429 },
      );
    }

    benchmarkInProgress = true;
    const startTime = Date.now();

    try {
      const body = await request.json().catch(() => ({}));
      const { cases: requestedCases } = body as { cases?: string[] };

      // Load all available cases
      const allCases = await loadBenchmarkCases();

      // Filter by requested cases
      const casesToRun = requestedCases
        ? allCases.filter((c) => requestedCases.includes(c.id))
        : allCases;

      if (casesToRun.length === 0) {
        return NextResponse.json(
          { error: 'No valid test cases selected' },
          { status: 400 },
        );
      }

      // Run benchmark
      const report = await benchmarkIsingVsZ3(casesToRun);

      // Cache result
      lastBenchmarkReport = report;

      // Auto-export reports
      try {
        await exportBenchmarkReport(report);
      } catch (exportError) {
        console.warn('Failed to export benchmark report:', exportError);
        // Don't fail the response, just warn
      }

      const totalTimeMs = Date.now() - startTime;

      return NextResponse.json({
        status: 'success',
        report: {
          generatedAt: report.generatedAt,
          summary: report.summary,
          totalTimeMs,
          caseCount: report.cases.length,
          resultCount: Array.from(report.results.values()).flat().length,
        },
      });
    } finally {
      benchmarkInProgress = false;
    }
  } catch (error) {
    benchmarkInProgress = false;
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

/**
 * GET: Fetch latest benchmark results
 *
 * Query params:
 * ?format=json|markdown|summary
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    if (!lastBenchmarkReport) {
      return NextResponse.json(
        { error: 'No benchmark results available. Run POST to generate.' },
        { status: 404 },
      );
    }

    const format = request.nextUrl.searchParams.get('format') || 'summary';

    switch (format) {
      case 'json':
        return NextResponse.json(lastBenchmarkReport.json);

      case 'markdown':
        return new NextResponse(lastBenchmarkReport.markdown, {
          headers: { 'Content-Type': 'text/markdown' },
        });

      case 'summary':
      default:
        return NextResponse.json({
          generatedAt: lastBenchmarkReport.generatedAt,
          summary: lastBenchmarkReport.summary,
          cases: lastBenchmarkReport.cases.map((c) => ({
            id: c.id,
            name: c.name,
            variables: c.variables,
            constraints: c.constraints,
          })),
          caseCount: lastBenchmarkReport.cases.length,
          resultCount: Array.from(lastBenchmarkReport.results.values()).flat().length,
        });
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
