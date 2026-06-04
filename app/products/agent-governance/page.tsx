'use client';

import Link from 'next/link';
import { CheckCircle2, Shield, Lock, Eye, GitBranch, Zap } from 'lucide-react';

export default function AgentGovernancePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-block bg-blue-500/30 rounded-full px-4 py-2 mb-6">
            <span className="text-sm font-semibold">GitHub Coding Agent Governance</span>
          </div>

          <h1 className="text-5xl font-bold mb-6">
            Control AI Agents Before They Change Your Code
          </h1>

          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Gate Claude Code, OpenHands, Aider, and other AI coding agents. Approve changes before execution.
            Every modification tracked in your audit log.
          </p>

          <div className="flex gap-4 justify-center">
            <Link
              href="https://github.com/apps/dsg-agent-governance"
              className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition"
            >
              Install GitHub App (Free)
            </Link>
            <Link
              href="#pricing"
              className="bg-blue-500/30 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-500/40 transition border border-blue-400"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </div>

      {/* Demo/Video Section */}
      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="bg-gray-100 rounded-xl h-96 flex items-center justify-center mb-16">
          <div className="text-center">
            <Zap className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">Demo video coming soon</p>
            <p className="text-sm text-gray-500 mt-2">See gate decisions in real-time</p>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="bg-gray-50 py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">Core Features</h2>

          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {/* Feature 1: Gate Every Proposal */}
            <div className="bg-white p-8 rounded-xl shadow-sm">
              <div className="flex items-start gap-4">
                <Eye className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-bold mb-2">See Every Change</h3>
                  <p className="text-gray-600">
                    Your AI agent proposes file changes. DSG intercepts the proposal and shows you exactly
                    what will happen before it executes.
                  </p>
                </div>
              </div>
            </div>

            {/* Feature 2: Approval Workflow */}
            <div className="bg-white p-8 rounded-xl shadow-sm">
              <div className="flex items-start gap-4">
                <Shield className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-bold mb-2">Approval Gate</h3>
                  <p className="text-gray-600">
                    Block sensitive changes until approved. Quick approve/reject buttons. Automatic rejection
                    after 24h if not actioned.
                  </p>
                </div>
              </div>
            </div>

            {/* Feature 3: Full Audit Trail */}
            <div className="bg-white p-8 rounded-xl shadow-sm">
              <div className="flex items-start gap-4">
                <Lock className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-bold mb-2">Audit Trail</h3>
                  <p className="text-gray-600">
                    Every gate decision is logged with cryptographic proof. Request hash, decision hash, and
                    policy version recorded forever.
                  </p>
                </div>
              </div>
            </div>

            {/* Feature 4: Protect Core Files */}
            <div className="bg-white p-8 rounded-xl shadow-sm">
              <div className="flex items-start gap-4">
                <GitBranch className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-bold mb-2">Protect Core Files</h3>
                  <p className="text-gray-600">
                    Define which paths require approval. Protect migrations, core libraries, config files,
                    and sensitive code.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="max-w-5xl mx-auto px-4 py-20">
        <h2 className="text-4xl font-bold text-center mb-16">How It Works</h2>

        <div className="space-y-8">
          <div className="flex gap-8">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                1
              </div>
              <div className="w-1 h-24 bg-gray-300 mt-4"></div>
            </div>
            <div className="pb-8">
              <h3 className="text-2xl font-bold mb-2">Install GitHub App</h3>
              <p className="text-gray-600">
                One-click install of DSG Agent Governance on your GitHub account. Grant minimal permissions
                to read PRs and write checks.
              </p>
            </div>
          </div>

          <div className="flex gap-8">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                2
              </div>
              <div className="w-1 h-24 bg-gray-300 mt-4"></div>
            </div>
            <div className="pb-8">
              <h3 className="text-2xl font-bold mb-2">Configure Policy</h3>
              <p className="text-gray-600">
                Define which paths require approval. Protect lib/, migrations/, config/, and other
                sensitive areas. Whitelist trusted paths.
              </p>
            </div>
          </div>

          <div className="flex gap-8">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                3
              </div>
              <div className="w-1 h-24 bg-gray-300 mt-4"></div>
            </div>
            <div className="pb-8">
              <h3 className="text-2xl font-bold mb-2">AI Agent Proposes</h3>
              <p className="text-gray-600">
                Claude Code, OpenHands, or your AI agent submits a pull request with proposed changes.
                The gate automatically evaluates the changes.
              </p>
            </div>
          </div>

          <div className="flex gap-8">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                4
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-2">You Approve or Reject</h3>
              <p className="text-gray-600">
                See the gate decision on the PR. Review file changes. Approve to merge or reject to revise.
                Every decision logged with proof.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Use Cases */}
      <div className="bg-gray-50 py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">Perfect For</h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-sm">
              <h3 className="text-xl font-bold mb-3">🏢 Enterprise Teams</h3>
              <p className="text-gray-600">
                Enforce compliance and governance while using AI coding assistants. Audit every change.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm">
              <h3 className="text-xl font-bold mb-3">🔒 Security-First Teams</h3>
              <p className="text-gray-600">
                Protect sensitive code, migrations, and configs from unexpected AI modifications.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm">
              <h3 className="text-xl font-bold mb-3">⚖️ Regulated Industries</h3>
              <p className="text-gray-600">
                Finance, healthcare, and compliance teams need proof of who approved what and why.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="max-w-5xl mx-auto px-4 py-20" id="pricing">
        <h2 className="text-4xl font-bold text-center mb-16">Pricing</h2>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Freemium Tier */}
          <div className="border-2 border-gray-200 rounded-xl p-8">
            <h3 className="text-2xl font-bold mb-2">Freemium</h3>
            <p className="text-gray-600 mb-6">Perfect for getting started</p>
            <div className="text-4xl font-bold mb-2">
              Free
              <span className="text-lg text-gray-600">/month</span>
            </div>
            <p className="text-gray-600 mb-8">10 gate decisions per month</p>

            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span>GitHub App installation</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span>Policy-driven gates</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span>Basic audit log</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span>Community support</span>
              </li>
            </ul>

            <Link
              href="https://github.com/apps/dsg-agent-governance"
              className="block w-full bg-gray-200 text-gray-800 px-6 py-3 rounded-lg font-semibold text-center hover:bg-gray-300 transition"
            >
              Install Free
            </Link>
          </div>

          {/* Pro Tier */}
          <div className="border-2 border-blue-600 rounded-xl p-8 bg-blue-50 relative">
            <div className="absolute top-0 left-8 bg-blue-600 text-white px-4 py-1 rounded-b-lg text-sm font-bold">
              Most Popular
            </div>

            <h3 className="text-2xl font-bold mb-2 mt-4">Pro</h3>
            <p className="text-gray-600 mb-6">For teams serious about AI governance</p>
            <div className="text-4xl font-bold mb-2">
              $99
              <span className="text-lg text-gray-600">/month</span>
            </div>
            <p className="text-gray-600 mb-8">Unlimited gate decisions</p>

            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span>Everything in Freemium</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span>Unlimited gate decisions</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span>Approval workflows</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span>Slack/email notifications</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span>Advanced audit logs</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span>Email support</span>
              </li>
            </ul>

            <button className="block w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition">
              Start Pro Trial (14 days free)
            </button>
          </div>
        </div>

        <p className="text-center text-gray-600 mt-8">
          Enterprise plans available.{' '}
          <Link href="/contact" className="text-blue-600 hover:underline font-semibold">
            Contact sales
          </Link>
        </p>
      </div>

      {/* CTA Section */}
      <div className="bg-blue-600 text-white py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Control Your AI Agents?</h2>
          <p className="text-xl text-blue-100 mb-8">
            Install the GitHub App now. It takes 30 seconds and you get 10 free gate decisions.
          </p>
          <Link
            href="https://github.com/apps/dsg-agent-governance"
            className="inline-block bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition"
          >
            Install from GitHub Marketplace
          </Link>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-5xl mx-auto px-4 py-20">
        <h2 className="text-4xl font-bold text-center mb-16">FAQ</h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-bold mb-2">How do I install the GitHub App?</h3>
            <p className="text-gray-600">
              Click the "Install" button, authorize the app in your GitHub account, and select which
              repositories to protect. Setup takes 30 seconds.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-bold mb-2">Can I use this with Claude Code?</h3>
            <p className="text-gray-600">
              Yes! DSG works with Claude Code, OpenHands, Aider, Kimi, and any AI agent that can open pull
              requests in GitHub.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-bold mb-2">What's the difference between Freemium and Pro?</h3>
            <p className="text-gray-600">
              Freemium is 10 gate decisions/month (perfect for trying it out). Pro is unlimited decisions,
              approval workflows, notifications, and support.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-bold mb-2">Is my code private?</h3>
            <p className="text-gray-600">
              Yes. We only see PR diffs to evaluate against your policy. We never store, log, or sell your
              code. Read our privacy policy for details.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-bold mb-2">Can I export audit logs?</h3>
            <p className="text-gray-600">
              Yes (Pro tier). Export JSON audit logs with SHA-256 proofs for compliance, SOC2, or other
              regulatory requirements.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
