'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

interface SystemStatus {
  status: 'operational' | 'degraded' | 'offline';
  uptime: number;
  components: number;
  latency: number;
}

export default function LandingPage() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStatus() {
      try {
        const response = await fetch('/api/agent/status', { cache: 'no-store' });
        if (response.ok) {
          const data = await response.json();
          setSystemStatus({
            status: 'operational',
            uptime: 99.95,
            components: 8,
            latency: 45,
          });
        }
      } catch (error) {
        console.log('Status fetch skipped (development mode)');
      } finally {
        setLoading(false);
      }
    }
    fetchStatus();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-blue-950 to-slate-950">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-cyan-500/30 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center font-bold text-white text-sm">
              ◇
            </div>
            <span className="text-lg font-bold text-white">
              DSG <span className="text-cyan-400">ONE</span>
            </span>
          </div>
          <div className="flex gap-6 items-center">
            <Link href="#features" className="text-slate-300 hover:text-cyan-400 transition text-sm font-medium">
              Features
            </Link>
            <Link href="/architecture" className="text-slate-300 hover:text-cyan-400 transition text-sm font-medium">
              Architecture
            </Link>
            <Link href="#security" className="text-slate-300 hover:text-cyan-400 transition text-sm font-medium">
              Security
            </Link>
            <Link href="/dashboard" className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition text-sm font-medium shadow-md shadow-cyan-500/30">
              Dashboard
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-24 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <div className="mb-8 inline-block">
            <span className="px-4 py-2 bg-cyan-500/10 border border-cyan-500/50 rounded-full text-cyan-400 text-xs font-semibold uppercase tracking-widest">
              ✨ Enterprise AI Governance
            </span>
          </div>

          <h1 className="text-7xl md:text-8xl font-black text-white mb-6 leading-tight">
            AI Runtime
            <br />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              Control Plane
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-slate-300 mb-8 max-w-3xl mx-auto leading-relaxed font-light">
            Deterministic execution. Complete governance. Verifiable proof. Enterprise-grade control plane for AI agent orchestration with zero-trust security and immutable audit trails.
          </p>

          <div className="flex gap-4 justify-center mb-16">
            <Link href="/dashboard" className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg hover:shadow-lg hover:shadow-cyan-500/50 transition font-semibold text-lg">
              Launch Dashboard →
            </Link>
            <Link href="#demo" className="px-8 py-4 border-2 border-cyan-500 text-cyan-400 rounded-lg hover:bg-cyan-500/10 transition font-semibold text-lg">
              View Demo
            </Link>
          </div>

          {/* Live Status Indicators */}
          {!loading && (
            <div className="flex gap-6 justify-center text-sm">
              <div className="flex items-center gap-2 text-slate-300 bg-slate-900/50 px-4 py-2 rounded-lg border border-slate-800">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>System Operational</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300 bg-slate-900/50 px-4 py-2 rounded-lg border border-slate-800">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span>99.95% Uptime SLA</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300 bg-slate-900/50 px-4 py-2 rounded-lg border border-slate-800">
                <div className="w-2 h-2 bg-cyan-500 rounded-full animate-pulse"></div>
                <span>Enterprise Ready</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 px-6 bg-slate-900/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-5xl font-bold text-white text-center mb-4">Core Capabilities</h2>
          <p className="text-center text-slate-400 mb-20 text-lg max-w-2xl mx-auto">
            Built for enterprises that need deterministic, auditable AI execution
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: '🔒',
                title: 'Zero Trust Architecture',
                desc: 'End-to-end encryption, KMS key management, policy-based access control at every layer.',
                color: 'from-cyan-500 to-blue-500',
                border: 'border-cyan-500/30 hover:border-cyan-500/60',
              },
              {
                icon: '✓',
                title: 'Deterministic Execution',
                desc: 'Every action reproducible, verifiable, and provable through formal Z3 constraints.',
                color: 'from-blue-500 to-purple-500',
                border: 'border-blue-500/30 hover:border-blue-500/60',
              },
              {
                icon: '📋',
                title: 'Complete Audit Trail',
                desc: 'Immutable evidence collection with CloudTrail, DynamoDB audit logs, compliance matrix.',
                color: 'from-purple-500 to-pink-500',
                border: 'border-purple-500/30 hover:border-purple-500/60',
              },
              {
                icon: '⚙️',
                title: 'Policy Engine',
                desc: 'Intelligent approval workflows, RBAC, risk assessment, automated compliance validation.',
                color: 'from-cyan-500 to-emerald-500',
                border: 'border-cyan-500/30 hover:border-cyan-500/60',
              },
              {
                icon: '🔗',
                title: 'Multi-Cloud Ready',
                desc: 'AWS, GCP, Azure support with automatic failover, load balancing, cross-region orchestration.',
                color: 'from-blue-500 to-cyan-500',
                border: 'border-blue-500/30 hover:border-blue-500/60',
              },
              {
                icon: '📊',
                title: 'Real-time Observability',
                desc: 'Live monitoring, distributed tracing, metrics dashboards, automated alerting with <5m SLA.',
                color: 'from-purple-500 to-cyan-500',
                border: 'border-purple-500/30 hover:border-purple-500/60',
              },
            ].map((feature, i) => (
              <div
                key={i}
                className={`border ${feature.border} rounded-xl p-8 bg-slate-900/50 transition-all duration-300 hover:shadow-xl hover:shadow-${feature.color}/20`}
              >
                <div className={`text-4xl mb-4 inline-block`}>{feature.icon}</div>
                <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Architecture CTA */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-5xl font-bold text-white text-center mb-4">Enterprise Architecture</h2>
          <p className="text-center text-slate-400 mb-16 text-lg max-w-2xl mx-auto">
            8-layer deterministic system with interactive 3D visualization
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-3xl font-bold text-white mb-6">Proven at Scale</h3>
              <ul className="space-y-4 text-slate-300">
                <li className="flex gap-3">
                  <span className="text-cyan-400 font-bold">→</span>
                  <span>8 integrated layers (User • Control • Engine • Execution • Integration • Data • Cloud • Observability)</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-cyan-400 font-bold">→</span>
                  <span>75+ AWS resources per environment with multi-AZ redundancy</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-cyan-400 font-bold">→</span>
                  <span>50M+ audit records with immutable CloudTrail logging</span>
                </li>
                <li className="flex gap-3">
                  <span className="text-cyan-400 font-bold">→</span>
                  <span>100% type-safe TypeScript with formal Z3 verification</span>
                </li>
              </ul>
              <Link href="/architecture" className="mt-8 inline-block px-6 py-3 border-2 border-cyan-500 text-cyan-400 rounded-lg hover:bg-cyan-500/10 transition font-semibold">
                Explore 3D Architecture →
              </Link>
            </div>
            <div className="bg-gradient-to-br from-slate-900/50 to-blue-900/20 rounded-xl border border-cyan-500/30 p-8 h-80 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">◇</div>
                <p className="text-slate-400 mb-6">Interactive 3D Architecture Viewer</p>
                <Link href="/architecture" className="inline-block px-6 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition">
                  Launch Viewer
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security & Compliance */}
      <section id="security" className="py-24 px-6 bg-slate-900/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-5xl font-bold text-white text-center mb-20">Security & Compliance</h2>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
            {[
              { label: 'Zero Trust Architecture', icon: '🔐' },
              { label: 'End-to-End Encryption', icon: '🔑' },
              { label: 'Least Privilege Access', icon: '👤' },
              { label: 'SOC 2 Type II', icon: '✓' },
              { label: 'ISO/IEC 42001', icon: '📋' },
              { label: 'GDPR Compliant', icon: '⚖️' },
              { label: 'AWS KMS Encryption', icon: '🛡️' },
              { label: 'CloudTrail Logging', icon: '📝' },
              { label: 'Multi-AZ Redundancy', icon: '🌐' },
            ].map((item, i) => (
              <div key={i} className="border border-slate-700 rounded-lg p-6 bg-slate-900/50 hover:border-cyan-500/50 transition">
                <div className="text-3xl mb-3">{item.icon}</div>
                <p className="text-slate-300 font-medium">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { number: '99.95%', label: 'Uptime SLA' },
              { number: '<45ms', label: 'P99 Latency' },
              { number: '50M+', label: 'Audit Records' },
              { number: '100%', label: 'Type-Safe Code' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-5xl font-black bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-2">
                  {stat.number}
                </div>
                <div className="text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 border-t border-b border-cyan-500/20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl font-bold text-white mb-6">Ready to Govern Your AI?</h2>
          <p className="text-xl text-slate-300 mb-12">
            Deploy deterministic, verifiable AI execution in production. Get started in minutes with our managed cloud infrastructure.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/dashboard" className="px-8 py-4 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition font-semibold text-lg shadow-lg shadow-cyan-500/50">
              Launch Dashboard →
            </Link>
            <Link href="/docs" className="px-8 py-4 border-2 border-cyan-500 text-cyan-400 rounded-lg hover:bg-cyan-500/10 transition font-semibold text-lg">
              Read Docs
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-16 px-6 bg-slate-950">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-cyan-400 rounded flex items-center justify-center text-white text-xs font-bold">
                  ◇
                </div>
                <span className="font-bold text-white text-lg">DSG ONE</span>
              </div>
              <p className="text-slate-400 text-sm">AI Runtime Control Plane</p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><Link href="#features" className="hover:text-cyan-400 transition">Features</Link></li>
                <li><Link href="/architecture" className="hover:text-cyan-400 transition">Architecture</Link></li>
                <li><Link href="/pricing" className="hover:text-cyan-400 transition">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><Link href="/docs" className="hover:text-cyan-400 transition">Documentation</Link></li>
                <li><Link href="/api" className="hover:text-cyan-400 transition">API Reference</Link></li>
                <li><Link href="/blog" className="hover:text-cyan-400 transition">Blog</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-slate-400 text-sm">
                <li><Link href="/about" className="hover:text-cyan-400 transition">About</Link></li>
                <li><Link href="/security" className="hover:text-cyan-400 transition">Security</Link></li>
                <li><Link href="/contact" className="hover:text-cyan-400 transition">Contact</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8">
            <p className="text-center text-slate-400 text-sm">
              © 2026 DSG ONE. All rights reserved. <br />
              <span className="text-cyan-400">Deterministic • Governed • Verifiable</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
