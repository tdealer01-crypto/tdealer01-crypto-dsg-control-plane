#!/usr/bin/env node

/**
 * DSG ONE launcher for the Trinity MCP server.
 *
 * This keeps the legacy Trinity backend contract available while allowing
 * the same MCP package to target a deployed DSG ONE control plane.
 */
async function main() {
  const dsgOneUrl = process.env.DSG_ONE_API_URL?.trim();
  if (!dsgOneUrl) {
    throw new Error('DSG_ONE_API_URL is required');
  }

  process.env.TRINITY_API_URL = dsgOneUrl.replace(/\/$/, '');
  await import('./index.js');
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[Trinity DSG ONE launcher] ${message}`);
  process.exit(1);
});
