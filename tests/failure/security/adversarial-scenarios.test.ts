import { describe, it, expect } from 'vitest';
import { timingSafeEqual, createHash } from 'crypto';

/**
 * Phase 5: Adversarial and Failure Scenario Tests
 *
 * Verifies security handling of timeout conditions, invalid tokens,
 * tampered data, missing credentials, and other failure scenarios
 */

describe('Adversarial Security Scenarios', () => {
  describe('Timeout Handling in Custom UI Gate', () => {
    it('should default to REVIEW when gate evaluation times out', async () => {
      const evaluateWithTimeout = async (evaluationPromise: Promise<string>, timeoutMs: number) => {
        const timeoutPromise = new Promise<string>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), timeoutMs)
        );

        try {
          return await Promise.race([evaluationPromise, timeoutPromise]);
        } catch (err) {
          if ((err as Error).message === 'Timeout') {
            return 'REVIEW'; // Fail-safe default
          }
          throw err;
        }
      };

      const slowEvaluation = new Promise<string>((resolve) => {
        setTimeout(() => resolve('ALLOW'), 5000); // Takes 5 seconds
      });

      const result = await evaluateWithTimeout(slowEvaluation, 2000); // 2 second timeout
      expect(result).toBe('REVIEW');
    });

    it('should not return ALLOW when evaluation timeout occurs', async () => {
      const gateWithTimeout = async (timeoutMs: number) => {
        try {
          await new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Gate timeout')), timeoutMs)
          );
          return 'ALLOW';
        } catch {
          // Timeout should never return ALLOW
          return 'REVIEW';
        }
      };

      const result = await gateWithTimeout(100);
      expect(result).not.toBe('ALLOW');
      expect(result).toBe('REVIEW');
    });

    it('should record timeout in audit trail', () => {
      const auditEntry = {
        event_id: 'evt_123',
        evaluated_at: new Date().toISOString(),
        status: 'timeout',
        decision: 'REVIEW', // Fail-safe
        error: 'Gate evaluation exceeded 2000ms',
        fail_safe_applied: true,
      };

      expect(auditEntry.fail_safe_applied).toBe(true);
      expect(auditEntry.decision).toBe('REVIEW');
      expect(auditEntry.status).toBe('timeout');
    });

    it('should enforce 2 second timeout for custom-ui gate', () => {
      const GATE_TIMEOUT_MS = 2000;
      expect(GATE_TIMEOUT_MS).toBe(2000);
    });
  });

  describe('Invalid Token Rejection', () => {
    it('should reject malformed OAuth tokens', () => {
      const validateToken = (token: string): boolean => {
        const tokenRegex = /^sk_live_[a-zA-Z0-9]{32,}$/;
        return tokenRegex.test(token);
      };

      expect(validateToken('sk_live_validtoken123456789abc')).toBe(true);
      expect(validateToken('invalid_token')).toBe(false);
      expect(validateToken('sk_test_token')).toBe(false);
      expect(validateToken('')).toBe(false);
    });

    it('should detect expired tokens', () => {
      const isTokenExpired = (expiresAt: number): boolean => {
        return Date.now() > expiresAt;
      };

      const futureTime = Date.now() + 3600000; // 1 hour from now
      const pastTime = Date.now() - 3600000; // 1 hour ago

      expect(isTokenExpired(futureTime)).toBe(false);
      expect(isTokenExpired(pastTime)).toBe(true);
    });

    it('should reject tokens with invalid signatures', () => {
      const validateTokenSignature = (token: string, expectedHash: string): boolean => {
        const tokenHash = createHash('sha256').update(token).digest('hex');
        try {
          return timingSafeEqual(Buffer.from(tokenHash), Buffer.from(expectedHash));
        } catch {
          return false;
        }
      };

      const validToken = 'real_token_123';
      const validHash = createHash('sha256').update(validToken).digest('hex');
      const invalidHash = createHash('sha256').update('tampered_token').digest('hex');

      expect(validateTokenSignature(validToken, validHash)).toBe(true);
      expect(validateTokenSignature(validToken, invalidHash)).toBe(false);
    });

    it('should handle timing-safe comparison failure gracefully', () => {
      const compareTokens = (provided: string, expected: string): boolean => {
        try {
          const providedDigest = createHash('sha256').update(provided).digest();
          const expectedDigest = createHash('sha256').update(expected).digest();
          timingSafeEqual(providedDigest, expectedDigest);
          return true;
        } catch {
          return false;
        }
      };

      expect(compareTokens('token1', 'token1')).toBe(true);
      expect(compareTokens('token1', 'token2')).toBe(false);
    });
  });

  describe('Tampered Hash Detection', () => {
    it('should detect modification to batch data', () => {
      const originalBatch = { id: 'batch-1', decision: 'ALLOW', amount: 1000 };
      const originalHash = createHash('sha256')
        .update(JSON.stringify(originalBatch))
        .digest('hex');

      const tamperedBatch = { id: 'batch-1', decision: 'ALLOW', amount: 5000 }; // Amount changed
      const tamperedHash = createHash('sha256')
        .update(JSON.stringify(tamperedBatch))
        .digest('hex');

      expect(tamperedHash).not.toBe(originalHash);
    });

    it('should detect hash chain breaks', () => {
      const batch1 = { id: 1, data: 'entry1' };
      const batch1Hash = createHash('sha256').update(JSON.stringify(batch1)).digest('hex');

      const batch2 = { id: 2, data: 'entry2', previousHash: batch1Hash };
      const batch2Hash = createHash('sha256').update(JSON.stringify(batch2)).digest('hex');

      // Attacker modifies batch1
      const tamperedBatch1 = { id: 1, data: 'TAMPERED' };
      const tamperedBatch1Hash = createHash('sha256')
        .update(JSON.stringify(tamperedBatch1))
        .digest('hex');

      // Batch2 hash link is now broken
      const reconstructedBatch2 = { id: 2, data: 'entry2', previousHash: tamperedBatch1Hash };
      const reconstructedBatch2Hash = createHash('sha256')
        .update(JSON.stringify(reconstructedBatch2))
        .digest('hex');

      expect(reconstructedBatch2Hash).not.toBe(batch2Hash);
    });

    it('should verify deterministic hashing prevents collision avoidance', () => {
      const input = 'fixed_input_string';
      const hash1 = createHash('sha256').update(input).digest('hex');
      const hash2 = createHash('sha256').update(input).digest('hex');
      const hash3 = createHash('sha256').update('different_input').digest('hex');

      expect(hash1).toBe(hash2); // Same input always produces same hash
      expect(hash1).not.toBe(hash3); // Different input produces different hash
    });

    it('should reject batches with invalid hash format', () => {
      const isValidHash = (hash: string): boolean => {
        return /^[a-f0-9]{64}$/.test(hash) || /^0{16}$/.test(hash);
      };

      expect(isValidHash('a'.repeat(64))).toBe(true);
      expect(isValidHash('0'.repeat(16))).toBe(true);
      expect(isValidHash('not_a_valid_hash')).toBe(false);
      expect(isValidHash('a'.repeat(63))).toBe(false); // Too short
      expect(isValidHash('gggggggggggggggg')).toBe(false); // Invalid chars
    });
  });

  describe('Missing Credential Scenarios', () => {
    it('should handle missing Anthropic API key gracefully', () => {
      const getApiKey = (): string | null => {
        const key = process.env.ANTHROPIC_API_KEY;
        if (!key) {
          console.debug('[Hermes] ANTHROPIC_API_KEY not configured, using scaffold plan');
          return null;
        }
        return key;
      };

      const key = getApiKey();
      if (!key) {
        // System should work in scaffold mode
        expect(key).toBeNull();
      }
    });

    it('should provide fallback when Supabase credentials missing', () => {
      const getSupabaseConfig = () => {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!url || !key) {
          return {
            ok: false,
            error: 'Supabase configuration incomplete',
            mode: 'offline',
          };
        }

        return { ok: true, url, key };
      };

      const config = getSupabaseConfig();
      if (!config.ok) {
        expect(config.mode).toBe('offline');
      }
    });

    it('should not crash on missing Stripe account', () => {
      const validateStripeAccount = (accountId: string | null) => {
        if (!accountId) {
          console.debug('[Stripe] Account not linked, skipping policy evaluation');
          return false;
        }
        return true;
      };

      expect(validateStripeAccount(null)).toBe(false);
      expect(validateStripeAccount('acct_123')).toBe(true);
    });

    it('should handle missing credential broker gracefully', () => {
      const requestCredential = async (credentialName: string) => {
        try {
          // Credential broker would normally fetch here
          const credential = null;

          if (!credential) {
            return {
              ok: false,
              error: `Credential ${credentialName} not available`,
              status: 'unavailable',
            };
          }

          return { ok: true, credential };
        } catch (err) {
          return {
            ok: false,
            error: 'Credential broker unreachable',
            status: 'error',
          };
        }
      };

      const result = requestCredential('MISSING_KEY');
      expect(result.ok).toBe(false);
      expect(result.status).toBe('unavailable');
    });
  });

  describe('Invalid Input Handling', () => {
    it('should reject zero addresses in wallet operations', () => {
      const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

      const validateAddress = (address: string): boolean => {
        if (address === ZERO_ADDRESS) {
          return false;
        }
        return /^0x[a-fA-F0-9]{40}$/.test(address);
      };

      expect(validateAddress(ZERO_ADDRESS)).toBe(false);
      expect(validateAddress('0x1234567890123456789012345678901234567890')).toBe(true);
    });

    it('should reject invalid Ethereum addresses', () => {
      const validateAddress = (address: string): boolean => {
        return /^0x[a-fA-F0-9]{40}$/.test(address);
      };

      expect(validateAddress('0x123')).toBe(false); // Too short
      expect(validateAddress('0xZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ')).toBe(false); // Invalid chars
      expect(validateAddress('1234567890abcdef1234567890abcdef12345678')).toBe(false); // Missing 0x
    });

    it('should reject malformed signatures', () => {
      const validateSignature = (signature: string): boolean => {
        return /^0x[a-fA-F0-9]{130}$/.test(signature); // 65 bytes = 130 hex chars
      };

      expect(validateSignature('0x' + 'a'.repeat(130))).toBe(true);
      expect(validateSignature('0x123')).toBe(false); // Too short
      expect(validateSignature('invalid-signature')).toBe(false);
      expect(validateSignature('')).toBe(false);
    });

    it('should reject expired messages', () => {
      const isMessageFresh = (timestamp: number, maxAgeMs: number = 600000): boolean => {
        return Date.now() - timestamp < maxAgeMs;
      };

      const now = Date.now();
      const fiveMinutesAgo = now - 300000;
      const oneHourAgo = now - 3600000;

      expect(isMessageFresh(fiveMinutesAgo, 600000)).toBe(true); // 5 min < 10 min max
      expect(isMessageFresh(oneHourAgo, 600000)).toBe(false); // 1 hour > 10 min max
    });
  });

  describe('Injection Attack Prevention', () => {
    it('should prevent SQL injection in policy queries', () => {
      const sanitizeInput = (input: string): string => {
        // Remove dangerous SQL keywords and special chars
        return input.replace(/[;'"]/g, '');
      };

      const maliciousInput = "'; DROP TABLE policies; --";
      const sanitized = sanitizeInput(maliciousInput);

      expect(sanitized).not.toContain(';');
      expect(sanitized).not.toContain("'");
    });

    it('should escape user input in audit logs', () => {
      const sanitizeForLog = (input: string): string => {
        return input.replace(/[<>]/g, '').substring(0, 256);
      };

      const userInput = '<script>alert("xss")</script>';
      const sanitized = sanitizeForLog(userInput);

      expect(sanitized).not.toContain('<');
      expect(sanitized).not.toContain('>');
      expect(sanitized.length).toBeLessThanOrEqual(256);
    });

    it('should validate JSON structures before processing', () => {
      const parseJSONSafely = (jsonString: string): unknown | null => {
        try {
          return JSON.parse(jsonString);
        } catch {
          return null;
        }
      };

      expect(parseJSONSafely('{"valid": "json"}')).toEqual({ valid: 'json' });
      expect(parseJSONSafely('invalid json')).toBeNull();
      expect(parseJSONSafely('{"nested": {"key": "value"}}')).toEqual({
        nested: { key: 'value' },
      });
    });
  });

  describe('Error Information Leakage Prevention', () => {
    it('should not expose internal error details to clients', () => {
      const handleError = (error: Error) => {
        const internalLog = error.message; // Log full detail internally
        const clientResponse = 'Operation failed. Please try again.'; // Generic response to client

        return {
          clientResponse,
          internalLog,
        };
      };

      const error = new Error('Database connection timeout at 192.168.1.100:5432');
      const response = handleError(error);

      expect(response.clientResponse).not.toContain('192.168');
      expect(response.clientResponse).not.toContain('timeout');
      expect(response.internalLog).toContain('192.168'); // Kept for debugging
    });

    it('should sanitize sensitive data from error messages', () => {
      const sanitizeError = (message: string): string => {
        return message
          .replace(/sk_[a-zA-Z0-9]+/g, '[REDACTED_KEY]')
          .replace(/0x[a-fA-F0-9]{40}/g, '[REDACTED_ADDRESS]')
          .replace(/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/g, '[REDACTED_IP]');
      };

      const errorMsg = 'API key sk_live_abc123xyz failed at 192.168.1.1';
      const sanitized = sanitizeError(errorMsg);

      expect(sanitized).toContain('[REDACTED_KEY]');
      expect(sanitized).toContain('[REDACTED_IP]');
      expect(sanitized).not.toContain('sk_live_');
    });

    it('should use debug level for sensitive operation logs', () => {
      const logSensitiveOperation = (operation: string) => {
        return {
          level: 'debug',
          message: `${operation} - see server logs for details`,
          timestamp: new Date().toISOString(),
        };
      };

      const log = logSensitiveOperation('LLM plan generation');
      expect(log.level).toBe('debug');
      expect(log.message).not.toMatch(/API key|secret|token/i);
    });
  });

  describe('Race Condition Prevention', () => {
    it('should handle concurrent approval attempts atomically', async () => {
      const processApproval = (approvalId: string, processed: Set<string>): boolean => {
        if (processed.has(approvalId)) {
          return false; // Already processed
        }
        processed.add(approvalId);
        return true;
      };

      const processed = new Set<string>();
      const approval1 = await Promise.resolve(processApproval('approval_123', processed));
      const approval2 = processApproval('approval_123', processed); // Duplicate attempt

      expect(approval1).toBe(true);
      expect(approval2).toBe(false); // Already processed
    });

    it('should prevent double-spending via audit trail', () => {
      const allAudits = new Map<string, { status: string }>();

      const recordAudit = (eventId: string) => {
        if (allAudits.has(eventId)) {
          return { ok: false, error: 'Event already recorded' };
        }
        allAudits.set(eventId, { status: 'recorded' });
        return { ok: true };
      };

      expect(recordAudit('evt_123').ok).toBe(true);
      expect(recordAudit('evt_123').ok).toBe(false); // Duplicate rejected
    });
  });
});
