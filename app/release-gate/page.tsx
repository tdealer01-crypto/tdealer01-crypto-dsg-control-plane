'use client';

import { useState } from 'react';
import { releaseGatePlans } from '@/lib/release-gate/plans';

export default function ReleaseGatePage() {
  const [url, setUrl] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheck() {
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const response = await fetch(`/api/release-gate/check?url=${encodeURIComponent(url)}`);
      if (!response.ok) {
        throw new Error('Check failed');
      }
      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(`Failed to check URL: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpgrade(plan: string) {
    try {
      const response = await fetch('/api/release-gate/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError('Stripe not configured. Please set STRIPE_SECRET_KEY.');
      }
    } catch (err) {
      setError(`Failed to start checkout: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto', fontFamily: 'system-ui' }}>
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ margin: '0 0 8px 0', fontSize: 32, fontWeight: 'bold' }}>Release Gate</h1>
        <p style={{ margin: '0', color: '#666', fontSize: 16 }}>Check if your app is ready to launch</p>
      </div>

      {/* Main Check Form */}
      <div
        style={{
          padding: 24,
          border: '1px solid #ddd',
          borderRadius: 8,
          marginBottom: 32,
          backgroundColor: '#f9f9f9',
        }}
      >
        <label style={{ display: 'block', marginBottom: 8, fontWeight: 'bold' }}>Your App URL</label>
        <div style={{ display: 'flex', gap: 12 }}>
          <input
            type="url"
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={loading}
            style={{
              flex: 1,
              padding: '12px 16px',
              border: '1px solid #ddd',
              borderRadius: 6,
              fontSize: 14,
              fontFamily: 'monospace',
            }}
          />
          <button
            onClick={handleCheck}
            disabled={loading || !url.trim()}
            style={{
              padding: '12px 24px',
              backgroundColor: loading ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              fontWeight: 'bold',
              cursor: loading ? 'default' : 'pointer',
              fontSize: 14,
            }}
          >
            {loading ? 'Checking...' : 'Check'}
          </button>
        </div>
        {error && <p style={{ color: '#d32f2f', marginTop: 12, fontSize: 14 }}>❌ {error}</p>}
      </div>

      {/* Results Section */}
      {result && (
        <div
          style={{
            padding: 24,
            border: '1px solid #ddd',
            borderRadius: 8,
            marginBottom: 32,
            backgroundColor: result.verdict === 'GO' ? '#e8f5e9' : '#fff3e0',
          }}
        >
          <h2 style={{ margin: '0 0 16px 0', fontSize: 24 }}>
            {result.verdict === 'GO' ? '✅ GO' : '⚠️ NO-GO'} - {result.message}
          </h2>

          {/* Tier Badge */}
          <div style={{ marginBottom: 16 }}>
            <span
              style={{
                display: 'inline-block',
                padding: '4px 12px',
                borderRadius: 20,
                backgroundColor: result.pro ? '#4caf50' : '#ff9800',
                color: 'white',
                fontSize: 12,
                fontWeight: 'bold',
              }}
            >
              {result.pro ? '⭐ PRO TIER' : '📝 FREE TIER'}
            </span>
          </div>

          {/* Checks */}
          {result.checks && (
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: 16 }}>Checks:</h3>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {result.checks.map((check: any) => (
                  <li
                    key={check.name}
                    style={{
                      marginBottom: 8,
                      color: check.status === 'pass' ? '#4caf50' : '#d32f2f',
                    }}
                  >
                    <strong>{check.name}</strong>
                    {check.detail && ` - ${check.detail}`}
                    {check.status === 'pass' ? ' ✅' : ' ❌'}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Features Available */}
          {result.features && (
            <div>
              <h3 style={{ margin: '0 0 12px 0', fontSize: 16 }}>Features:</h3>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {Object.entries(result.features).map(([key, value]) => (
                  <li key={key} style={{ marginBottom: 8 }}>
                    <strong>{key.replace(/([A-Z])/g, ' $1').toLowerCase()}</strong>: {String(value)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Upgrade CTA (if free user) */}
      {result && !result.pro && result.upgrade && (
        <div
          style={{
            padding: 24,
            border: '2px solid #007bff',
            borderRadius: 8,
            marginBottom: 32,
            backgroundColor: '#e3f2fd',
          }}
        >
          <h2 style={{ margin: '0 0 16px 0', fontSize: 20, color: '#1976d2' }}>
            {result.upgrade.message}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Pro Plan Card */}
            <div
              style={{
                padding: 20,
                border: '1px solid #ddd',
                borderRadius: 8,
                backgroundColor: 'white',
              }}
            >
              <h3 style={{ margin: '0 0 8px 0', fontSize: 18 }}>{result.upgrade.proPlan.name}</h3>
              <p style={{ margin: '0 0 16px 0', fontSize: 24, fontWeight: 'bold', color: '#4caf50' }}>
                {result.upgrade.proPlan.price}
              </p>
              <p style={{ margin: '0 0 16px 0', color: '#666', fontSize: 14 }}>
                {result.upgrade.proPlan.description}
              </p>
              <ul style={{ margin: '0 0 16px 0', paddingLeft: 20, fontSize: 13 }}>
                {result.upgrade.proPlan.features?.map((feature: string) => (
                  <li key={feature} style={{ marginBottom: 4 }}>
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => handleUpgrade('pro')}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  backgroundColor: '#4caf50',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                {result.upgrade.proPlan.ctaText}
              </button>
            </div>

            {/* Enterprise Plan Card */}
            <div
              style={{
                padding: 20,
                border: '1px solid #ddd',
                borderRadius: 8,
                backgroundColor: 'white',
              }}
            >
              <h3 style={{ margin: '0 0 8px 0', fontSize: 18 }}>{result.upgrade.enterprisePlan.name}</h3>
              <p style={{ margin: '0 0 16px 0', fontSize: 24, fontWeight: 'bold', color: '#ff9800' }}>
                {result.upgrade.enterprisePlan.price}
              </p>
              <p style={{ margin: '0 0 16px 0', color: '#666', fontSize: 14 }}>
                {result.upgrade.enterprisePlan.description}
              </p>
              <ul style={{ margin: '0 0 16px 0', paddingLeft: 20, fontSize: 13 }}>
                {result.upgrade.enterprisePlan.features?.map((feature: string) => (
                  <li key={feature} style={{ marginBottom: 4 }}>
                    {feature}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => window.location.href = result.upgrade.enterprisePlan.ctaLink}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  backgroundColor: '#ff9800',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                {result.upgrade.enterprisePlan.ctaText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pricing Plans Section */}
      <hr style={{ margin: '40px 0' }} />
      <h2 style={{ margin: '0 0 24px 0', fontSize: 24 }}>Plans & Pricing</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
        {releaseGatePlans.map((plan) => (
          <div
            key={plan.id}
            style={{
              padding: 24,
              border: '1px solid #ddd',
              borderRadius: 8,
              backgroundColor: plan.id === 'pro' ? '#e3f2fd' : 'white',
            }}
          >
            <h3 style={{ margin: '0 0 8px 0', fontSize: 18 }}>{plan.name}</h3>
            <p style={{ margin: '0 0 16px 0', fontSize: 22, fontWeight: 'bold' }}>{plan.price}</p>
            <p style={{ margin: '0 0 16px 0', color: '#666', fontSize: 13 }}>{plan.description}</p>
            <ul style={{ margin: '0 0 16px 0', paddingLeft: 20, fontSize: 13 }}>
              {plan.features.map((feature) => (
                <li key={feature} style={{ marginBottom: 6 }}
                >
                  ✅ {feature}
                </li>
              ))}
            </ul>
            {plan.id !== 'free' && (
              <button
                onClick={() => handleUpgrade(plan.id)}
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: plan.id === 'pro' ? '#007bff' : '#ff9800',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                Get Started
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
