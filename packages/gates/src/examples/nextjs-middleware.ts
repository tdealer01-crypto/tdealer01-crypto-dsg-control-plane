/**
 * Next.js Middleware Integration Example
 *
 * Use this middleware to gate API requests in Next.js applications.
 *
 * @example
 * ```typescript
 * // middleware.ts or middleware.js (in project root or src/)
 * import { createGateMiddleware } from '@dsg-platform/gates/examples';
 * import type { NextRequest } from 'next/server';
 *
 * const gateMiddleware = createGateMiddleware({
 *   apiKey: process.env.DSG_API_KEY,
 *   orgId: process.env.DSG_ORG_ID,
 *   protectedPaths: ['/api/admin/*', '/api/deploy/*', '/api/finance/*']
 * });
 *
 * export function middleware(request: NextRequest) {
 *   return gateMiddleware(request);
 * }
 *
 * export const config = {
 *   matcher: ['/api/:path*']
 * };
 * ```
 */

import { DSGGatesClient, GatePolicyConfig } from '../index';

export interface GateMiddlewareConfig {
  /** DSG API key */
  apiKey: string;

  /** Organization ID */
  orgId: string;

  /** Agent ID (default: 'nextjs-app') */
  agentId?: string;

  /** Protected path patterns (glob patterns) */
  protectedPaths: string[];

  /** Default policy (optional) */
  defaultPolicy?: GatePolicyConfig;

  /** Whether to block on error or allow through */
  blockOnError?: boolean;

  /** Custom header for DSG execution ID */
  executionIdHeader?: string;
}

/**
 * Create a Next.js middleware for gate evaluation
 */
export function createGateMiddleware(config: GateMiddlewareConfig) {
  const client = new DSGGatesClient({
    apiKey: config.apiKey,
    orgId: config.orgId,
    agentId: config.agentId || 'nextjs-app',
    defaultPolicy: config.defaultPolicy,
  });

  return async (request: any) => {
    // Check if path is protected
    const pathname = request.nextUrl.pathname;
    const isProtected = matchesPattern(pathname, config.protectedPaths);

    if (!isProtected) {
      return undefined; // Allow through
    }

    try {
      // Build gate request
      const executionId = request.headers.get(config.executionIdHeader || 'x-dsg-execution-id') ||
        `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const gateRequest = {
        executionId,
        agentId: config.agentId || 'nextjs-app',
        orgId: config.orgId,
        action: `${request.method} ${pathname}`,
        input: {
          method: request.method,
          path: pathname,
          headers: Object.fromEntries(request.headers),
        },
        context: {
          source: 'api' as const,
          timestamp: new Date().toISOString(),
          metadata: {
            userAgent: request.headers.get('user-agent'),
            userIp: request.ip,
          },
        },
      };

      // Evaluate gate
      const response = await client.evaluateGate(gateRequest, config.defaultPolicy);

      // Block if decision is BLOCK
      if (response.decision === 'BLOCK') {
        return new Response(
          JSON.stringify({
            error: 'Access denied by gate policy',
            reason: response.reason,
            executionId: response.executionId,
          }),
          {
            status: 403,
            headers: {
              'Content-Type': 'application/json',
              'x-dsg-execution-id': response.executionId,
              'x-dsg-decision': response.decision,
            },
          },
        );
      }

      // Add gate response headers
      const responseHeaders = new Headers(request.headers);
      responseHeaders.set('x-dsg-execution-id', response.executionId);
      responseHeaders.set('x-dsg-decision', response.decision);
      responseHeaders.set('x-dsg-risk-score', response.riskScore.toString());

      // Continue to the route handler
      return undefined;
    } catch (error) {
      if (config.blockOnError) {
        return new Response(
          JSON.stringify({
            error: 'Gate evaluation error',
            message: error instanceof Error ? error.message : 'Unknown error',
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          },
        );
      }

      // Log error but allow through
      console.error('[DSG Gate Error]', error);
      return undefined;
    }
  };
}

/**
 * Helper: Match path against glob patterns
 */
function matchesPattern(pathname: string, patterns: string[]): boolean {
  return patterns.some((pattern) => {
    // Convert glob pattern to regex
    const regex = globToRegex(pattern);
    return regex.test(pathname);
  });
}

/**
 * Helper: Convert glob pattern to regex
 */
function globToRegex(glob: string): RegExp {
  let regex = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
    .replace(/\*/g, '[^/]*') // * matches anything except /
    .replace(/\/\*\*\//g, '(?:/.*)?/'); // ** matches any path

  return new RegExp(`^${regex}$`);
}

/**
 * Express middleware variant
 */
export function createExpressGateMiddleware(config: GateMiddlewareConfig) {
  const client = new DSGGatesClient({
    apiKey: config.apiKey,
    orgId: config.orgId,
    agentId: config.agentId || 'express-app',
    defaultPolicy: config.defaultPolicy,
  });

  return async (req: any, res: any, next: Function) => {
    // Check if path is protected
    const pathname = req.path;
    const isProtected = matchesPattern(pathname, config.protectedPaths);

    if (!isProtected) {
      return next(); // Allow through
    }

    try {
      // Build gate request
      const executionId = req.headers['x-dsg-execution-id'] ||
        `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const gateRequest = {
        executionId,
        agentId: config.agentId || 'express-app',
        orgId: config.orgId,
        action: `${req.method} ${pathname}`,
        input: {
          method: req.method,
          path: pathname,
          query: req.query,
        },
        context: {
          source: 'api' as const,
          timestamp: new Date().toISOString(),
          metadata: {
            userAgent: req.headers['user-agent'],
            userIp: req.ip,
          },
        },
      };

      // Evaluate gate
      const response = await client.evaluateGate(gateRequest, config.defaultPolicy);

      // Set response headers
      res.set('x-dsg-execution-id', response.executionId);
      res.set('x-dsg-decision', response.decision);
      res.set('x-dsg-risk-score', response.riskScore.toString());

      // Block if decision is BLOCK
      if (response.decision === 'BLOCK') {
        return res.status(403).json({
          error: 'Access denied by gate policy',
          reason: response.reason,
          executionId: response.executionId,
        });
      }

      return next();
    } catch (error) {
      if (config.blockOnError) {
        return res.status(500).json({
          error: 'Gate evaluation error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // Log error but allow through
      console.error('[DSG Gate Error]', error);
      return next();
    }
  };
}
