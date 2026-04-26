'use client';

import { useState } from 'react';

export default function ReleaseGatePage() {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function runCheck() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/release-gate/check?url=${encodeURIComponent(url)}`);
      const data = await res.json();
      setResult(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
      <h1>Release Gate</h1>
      <p>Check if your app is ready to launch</p>

      <input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://your-app.com"
        style={{ width: '100%', padding: 8 }}
      />

      <button onClick={runCheck} disabled={!url || loading} style={{ marginTop: 12 }}>
        {loading ? 'Checking...' : 'Run Check'}
      </button>

      {result && (
        <div style={{ marginTop: 20 }}>
          <h2>
            Verdict: {result.verdict}
          </h2>

          <ul>
            {result.checks?.map((c: any) => (
              <li key={c.name}>
                {c.name}: {c.ok ? 'OK' : 'FAIL'} {c.status ?? ''}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
