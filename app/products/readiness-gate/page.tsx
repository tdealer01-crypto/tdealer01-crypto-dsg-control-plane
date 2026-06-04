'use client';

import Link from 'next/link';
import { CheckCircle2, GitBranch, BarChart3, Lock, Clock } from 'lucide-react';

export default function ReadinessGatePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-green-600 to-green-800 text-white py-20 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-block bg-green-500/30 rounded-full px-4 py-2 mb-6">
            <span className="text-sm font-semibold">Pre-Deploy Quality Gates</span>
          </div>

          <h1 className="text-5xl font-bold mb-6">Deploy With Confidence</h1>

          <p className="text-xl text-green-100 mb-8 max-w-2xl mx-auto">
            Automated readiness checks for your pull requests. Verify CI status, test coverage, security, and reviews before shipping to production.
          </p>

          <div className="flex gap-4 justify-center">
            <Link
              href="/dashboard/readiness-config"
              className="bg-white text-green-600 px-8 py-3 rounded-lg font-semibold hover:bg-green-50 transition"
            >
              Configure Gates
            </Link>
            <a
              href="#pricing"
              className="bg-green-500/30 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-500/40 transition border border-green-400"
            >
              View Pricing
            </a>
          </div>
        </div>
      </div>

      {/* 5 Core Checks */}
      <div className="bg-gray-50 py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-16">Five Critical Checks</h2>

          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {/* Check 1 */}
            <div className="bg-white p-8 rounded-xl shadow-sm">
              <div className="flex items-start gap-4">
                <GitBranch className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-bold mb-2">CI Status</h3>
                  <p className="text-gray-600">
                    All GitHub Actions workflows must pass. Blocks deployment if any checks fail. Integrates with GitHub App.
                  </p>
                </div>
              </div>
            </div>

            {/* Check 2 */}
            <div className="bg-white p-8 rounded-xl shadow-sm">
              <div className="flex items-start gap-4">
                <BarChart3 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-bold mb-2">Test Coverage</h3>
                  <p className="text-gray-600">
                    Code must meet minimum coverage threshold. Default 80%, configurable per org. Requires review if below target.
                  </p>
                </div>
              </div>
            </div>

            {/* Check 3 */}
            <div className="bg-white p-8 rounded-xl shadow-sm">
              <div className="flex items-start gap-4">
                <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-bold mb-2">Code Reviews</h3>
                  <p className="text-gray-600">
                    PR must have required number of approvals. Configurable: 1-5 reviewers. Tracks review history and dates.
                  </p>
                </div>
              </div>
            </div>

            {/* Check 4 */}
            <div className="bg-white p-8 rounded-xl shadow-sm">
              <div className="flex items-start gap-4">
                <Lock className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-bold mb-2">Secrets Detection</h3>
                  <p className="text-gray-600">
                    Scan diff for hardcoded credentials, API keys, tokens. Uses pattern matching. Optional or blocking.
                  </p>
                </div>
              </div>
            </div>

            {/* Check 5 (spans full width) */}
            <div className="bg-white p-8 rounded-xl shadow-sm md:col-span-2">
              <div className="flex items-start gap-4">
                <Clock className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-xl font-bold mb-2">Migrations & Dependencies</h3>
                  <p className="text-gray-600">
                    Detect pending database migrations, major dependency updates, and breaking changes. Flag for manual review.
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
              <div className="w-12 h-12 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                1
              </div>
              <div className="w-1 h-24 bg-gray-300 mt-4"></div>
            </div>
            <div className="pb-8">
              <h3 className="text-2xl font-bold mb-2">Push to GitHub</h3>
              <p className="text-gray-600">
                Developer pushes a branch and opens a PR. GitHub App automatically receives the webhook.
              </p>
            </div>
          </div>

          <div className="flex gap-8">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                2
              </div>
              <div className="w-1 h-24 bg-gray-300 mt-4"></div>
            </div>
            <div className="pb-8">
              <h3 className="text-2xl font-bold mb-2">Run Readiness Checks</h3>
              <p className="text-gray-600">
                DSG evaluates all 5 checks in parallel. CI status, coverage, reviews, secrets, migrations. Takes &lt;30s.
              </p>
            </div>
          </div>

          <div className="flex gap-8">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                3
              </div>
              <div className="w-1 h-24 bg-gray-300 mt-4"></div>
            </div>
            <div className="pb-8">
              <h3 className="text-2xl font-bold mb-2">Post Check Result</h3>
              <p className="text-gray-600">
                GitHub check shows &quot;ready&quot;, &quot;review required&quot;, or &quot;blocked&quot;. Blocking checks prevent merge.
              </p>
            </div>
          </div>

          <div className="flex gap-8">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                4
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-2">Auto-merge or Manual Deploy</h3>
              <p className="text-gray-600">
                If enabled: auto-merge when ready. Otherwise: show &quot;Ready to Deploy&quot; button. All decisions logged with timestamps.
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
              <h3 className="text-xl font-bold mb-3">🚀 High-Velocity Teams</h3>
              <p className="text-gray-600">
                Ship faster with confidence. Automated gates reduce manual review bottlenecks.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm">
              <h3 className="text-xl font-bold mb-3">🏢 Enterprise CI/CD</h3>
              <p className="text-gray-600">
                Enforce org-wide quality standards. Configurable per repo or org-level defaults.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-sm">
              <h3 className="text-xl font-bold mb-3">🔒 Security-First Teams</h3>
              <p className="text-gray-600">
                Automated secrets detection. Stop credentials from entering production code.
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
            <p className="text-gray-600 mb-8">5 readiness checks per day</p>

            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span>GitHub App integration</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span>5 core checks</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span>Check history (7 days)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span>Community support</span>
              </li>
            </ul>

            <Link
              href="/dashboard/readiness-config"
              className="block w-full bg-gray-200 text-gray-800 px-6 py-3 rounded-lg font-semibold text-center hover:bg-gray-300 transition"
            >
              Get Started Free
            </Link>
          </div>

          {/* Pro Tier */}
          <div className="border-2 border-green-600 rounded-xl p-8 bg-green-50 relative">
            <div className="absolute top-0 left-8 bg-green-600 text-white px-4 py-1 rounded-b-lg text-sm font-bold">
              Most Popular
            </div>

            <h3 className="text-2xl font-bold mb-2 mt-4">Pro</h3>
            <p className="text-gray-600 mb-6">For teams shipping frequently</p>
            <div className="text-4xl font-bold mb-2">
              $299
              <span className="text-lg text-gray-600">/month</span>
            </div>
            <p className="text-gray-600 mb-8">Unlimited readiness checks</p>

            <ul className="space-y-3 mb-8">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span>Everything in Freemium</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span>Unlimited daily checks</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span>Custom check thresholds</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span>Auto-merge on ready</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span>Check history (30 days)</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span>Email support</span>
              </li>
            </ul>

            <button className="block w-full bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 transition">
              Start Pro Trial (14 days free)
            </button>
          </div>
        </div>

        <p className="text-center text-gray-600 mt-8">
          Enterprise plans available.{' '}
          <Link href="/contact" className="text-green-600 hover:underline font-semibold">
            Contact sales
          </Link>
        </p>
      </div>

      {/* CTA Section */}
      <div className="bg-green-600 text-white py-16 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Deploy Safer?</h2>
          <p className="text-xl text-green-100 mb-8">
            Configure your readiness rules now. Zero setup required.
          </p>
          <Link
            href="/dashboard/readiness-config"
            className="inline-block bg-white text-green-600 px-8 py-3 rounded-lg font-semibold hover:bg-green-50 transition"
          >
            Configure Your Gates
          </Link>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="max-w-5xl mx-auto px-4 py-20">
        <h2 className="text-4xl font-bold text-center mb-16">FAQ</h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-xl font-bold mb-2">How is this different from branch protection?</h3>
            <p className="text-gray-600">
              GitHub branch protection requires contexts to pass; readiness gates automatically evaluate complex criteria (coverage, secrets, migrations) without manual setup per check.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-bold mb-2">Can I customize the checks?</h3>
            <p className="text-gray-600">
              Yes. Each check has thresholds: test coverage %, number of approvals, secrets detection sensitivity, migration detection. Customize per org or use presets.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-bold mb-2">Does auto-merge work with GitHub Copilot?</h3>
            <p className="text-gray-600">
              Yes. If auto-merge is enabled and all readiness checks pass, DSG automatically merges the PR. Respects branch protection rules.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-bold mb-2">What happens if a check fails?</h3>
            <p className="text-gray-600">
              The check result is posted to GitHub. Blocking checks prevent merge. Non-blocking checks require manual review. All decisions are logged.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-bold mb-2">Can I see check history?</h3>
            <p className="text-gray-600">
              Yes. Dashboard shows 7 days (free) or 30 days (pro) of check results. Filter by status, check type, or date. Export as JSON.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
