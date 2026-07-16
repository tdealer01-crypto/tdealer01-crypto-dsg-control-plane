// Vitest setup file - runs before any tests
// Set environment variables needed for MCP OAuth tests

if (process.env.VITEST) {
  process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || 'test-oauth-secret-key-for-mcp';
  process.env.MCP_OAUTH_CLIENT_ID = process.env.MCP_OAUTH_CLIENT_ID || 'claude-ai-connector-v1';
  process.env.MCP_OAUTH_CLIENT_SECRET =
    process.env.MCP_OAUTH_CLIENT_SECRET || 'test-client-secret-123';
  process.env.MCP_OAUTH_REDIRECT_URIS =
    process.env.MCP_OAUTH_REDIRECT_URIS ||
    'https://claude.ai/auth/callback/dsg-mcp,https://localhost:3000/callback';
}
