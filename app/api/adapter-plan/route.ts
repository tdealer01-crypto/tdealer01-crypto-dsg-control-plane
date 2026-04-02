import { NextResponse } from "next/server";
import { getDSGCoreCompatibility } from "../../../lib/core-compat";
import { applyRateLimit, buildRateLimitHeaders, getRateLimitKey } from "../../../lib/security/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const rateLimit = await applyRateLimit({
    key: getRateLimitKey(request, 'adapter-plan'),
    limit: 30,
    windowMs: 60_000,
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: buildRateLimitHeaders(rateLimit, 30) }
    );
  }

  const compatibility = await getDSGCoreCompatibility();
  const profile = compatibility.inferred.profile;

  const readPlan =
    profile === "dsg_one_runtime"
      ? {
          profile,
          health: "/api/health",
          ledger: "/api/ledger",
          metrics: {
            source: "/api/executions",
            synthesized: true,
          },
          audit: {
            supported: false,
            reason: "No verified /audit/events surface was found in DSG-ONE runtime repo truth.",
          },
          execute: {
            recommended_next_step: "/api/execute-v2",
            verified_write_path: false,
          },
        }
      : profile === "canonical_gate"
        ? {
            profile,
            health: "/health",
            ledger: "/ledger/verify",
            metrics: {
              source: null,
              synthesized: false,
            },
            audit: {
              supported: false,
              reason: "No verified audit surface was found in the canonical gate repo truth.",
            },
            execute: {
              recommended_next_step: "/evaluate",
              verified_write_path: false,
            },
          }
        : {
            profile,
            health: compatibility.inferred.recommended_paths.health,
            ledger: compatibility.inferred.recommended_paths.ledger,
            metrics: {
              source: compatibility.inferred.recommended_paths.metrics,
              synthesized: false,
            },
            audit: {
              supported: Boolean(compatibility.inferred.recommended_paths.audit),
              reason: "No single verified endpoint profile matched cleanly.",
            },
            execute: {
              recommended_next_step: compatibility.inferred.recommended_paths.execute,
              verified_write_path: false,
            },
          };

  return NextResponse.json({
    ok: true,
    timestamp: new Date().toISOString(),
    target_url: compatibility.target_url,
    inferred_profile: compatibility.inferred.profile,
    inference_reason: compatibility.inferred.reason,
    read_plan: readPlan,
    note: "This is a verified read-side adapter plan derived from repo truth and read-only probes. Execute-path recommendations are still non-write verified.",
  }, { headers: buildRateLimitHeaders(rateLimit, 30) });
}
