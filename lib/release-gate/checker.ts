export type CheckResult = {
  name: string;
  ok: boolean;
  status?: number;
};

async function check(url: string, path: string): Promise<CheckResult> {
  try {
    const res = await fetch(`${url}${path}`);
    return { name: path, ok: res.ok, status: res.status };
  } catch {
    return { name: path, ok: false };
  }
}

export async function runReleaseGate(url: string) {
  const checks = await Promise.all([
    check(url, '/terms'),
    check(url, '/privacy'),
    check(url, '/support'),
    check(url, '/api/health'),
    check(url, '/api/readiness'),
  ]);

  const ok = checks.every((c) => c.ok);

  return {
    ok,
    verdict: ok ? 'GO' : 'NO-GO',
    checks,
  };
}
