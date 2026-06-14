// CLI Entry Point for CCVS Multi-Agent Pipeline
import { runCCVSPipeline } from './simulation/pipeline';

interface CLIOptions {
  commit: string;
  goal: string;
  dryRun?: boolean;
  verbose?: boolean;
  maxIterations?: number;
  convergenceThreshold?: number;
  parallel?: boolean;
  createPR?: boolean;
}

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);
  const options: CLIOptions = {
    commit: '',
    goal: '',
    dryRun: true,
    verbose: true,
    maxIterations: 6,
    convergenceThreshold: 0.95,
    parallel: true,
    createPR: false
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--commit':
      case '-c':
        options.commit = args[++i];
        break;
      case '--goal':
      case '-g':
        options.goal = args[++i];
        break;
      case '--dry-run':
        options.dryRun = true;
        break;
      case '--execute':
        options.dryRun = false;
        break;
      case '--verbose':
      case '-v':
        options.verbose = true;
        break;
      case '--quiet':
      case '-q':
        options.verbose = false;
        break;
      case '--max-iterations':
        options.maxIterations = parseInt(args[++i], 10);
        break;
      case '--threshold':
        options.convergenceThreshold = parseFloat(args[++i]);
        break;
      case '--no-parallel':
        options.parallel = false;
        break;
      case '--create-pr':
        options.createPR = true;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
        break;
    }
  }

  if (!options.commit || !options.goal) {
    console.error('Error: --commit and --goal are required');
    printHelp();
    process.exit(1);
  }

  return options;
}

function printHelp(): void {
  console.log(`
CCVS Multi-Agent Diffusion Pipeline

Usage: npx tsx cli.ts --commit <sha> --goal <description> [options]

Required:
  --commit, -c     Git commit SHA to generate evidence for
  --goal, -g       Natural language goal for the evidence pack

Options:
  --dry-run        Run simulation only (default: true)
  --execute        Run real execution (sets --dry-run false)
  --verbose, -v    Verbose output (default: true)
  --quiet, -q      Suppress verbose output
  --max-iterations Maximum diffusion iterations per agent (default: 6)
  --threshold      Convergence threshold 0-1 (default: 0.95)
  --no-parallel    Run agents sequentially instead of in parallel
  --create-pr      Create GitHub PR with evidence (requires GITHUB_TOKEN)
  --help, -h       Show this help

Environment Variables:
  GITHUB_TOKEN         GitHub token for PR creation
  GITHUB_REPO_OWNER    Repository owner (default: tdealer01-crypto)
  GITHUB_REPO_NAME     Repository name (default: tdealer01-crypto-dsg-control-plane)
  DIFFUSION_ENDPOINT   DiffusionGemma endpoint URL
  DIFFUSION_API_KEY    DiffusionGemma API key

Examples:
  # Simulate evidence generation for a commit
  npx tsx cli.ts -c abc123 -g "Generate CCVS L1-L5 evidence for v1.2.3 release"

  # Execute real and create PR
  npx tsx cli.ts -c abc123 -g "CCVS evidence" --execute --create-pr

  # Custom thresholds
  npx tsx cli.ts -c abc123 -g "CCVS evidence" --max-iterations 8 --threshold 0.98
`);
}

// Main execution
async function main(): Promise<void> {
  const options = parseArgs();

  // Set environment variables from options
  if (options.maxIterations) process.env.MAX_ITERATIONS = String(options.maxIterations);
  if (options.convergenceThreshold) process.env.CONVERGENCE_THRESHOLD = String(options.convergenceThreshold);
  if (options.parallel === false) process.env.PARALLEL = 'false';
  if (options.createPR) process.env.CREATE_PR = 'true';

  const { runCCVSPipeline } = await import('./simulation/pipeline');

  try {
    const result = await runCCVSPipeline(options.commit, options.goal, {
      orchestrator: {
        maxTotalIterations: options.maxIterations || 6,
        convergenceThreshold: options.convergenceThreshold || 0.95,
        enableParallel: options.parallel !== false,
        simulationFirst: true,
        createPR: options.createPR || false
      },
      dryRun: options.dryRun !== false,
      verbose: options.verbose
    });

    if (result.success) {
      console.log('\nPipeline completed successfully!');
      if (result.prUrl) {
        console.log('PR created: ' + result.prUrl);
      }
      process.exit(0);
    } else {
      console.error('\nPipeline failed!');
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

main();