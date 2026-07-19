import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'Security - DSG ONE',
  description: 'Learn how DSG ONE protects your data with encryption, RBAC, and continuous monitoring.',
};

export default function SecurityPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-4">Security</h1>
          <p className="text-xl text-gray-600">
            DSG ONE is built with enterprise security as a foundation, not an afterthought.
          </p>
        </div>

        {/* Security Pillars */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6">Security Pillars</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                icon: '🔐',
                title: 'Encryption',
                description:
                  'Data encrypted at rest (AES-256) and in transit (TLS 1.3). Secrets stored in encrypted vault, never logged.',
              },
              {
                icon: '👥',
                title: 'Role-Based Access Control',
                description:
                  'Fine-grained permissions with admin/operator/viewer roles. Custom roles for organizations. Principle of least privilege enforced.',
              },
              {
                icon: '🔍',
                title: 'Continuous Monitoring',
                description:
                  'Real-time audit logging with correlation IDs. Sentry for error tracking. PostHog for anomaly detection.',
              },
              {
                icon: '🔄',
                title: 'Session Management',
                description:
                  '30-minute inactivity timeout. Max 5 concurrent sessions per user. Immediate revocation on permission changes.',
              },
              {
                icon: '🛡️',
                title: 'Single Sign-On (SSO)',
                description:
                  'SAML 2.0 and OIDC federation with IdP group sync. Just-in-time provisioning. No password storage required.',
              },
              {
                icon: '📋',
                title: 'Audit Trail',
                description:
                  'Immutable audit logs for compliance. Exportable in JSON/CSV for SIEM integration. 30-day retention.',
              },
            ].map((pillar, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-6">
                <div className="text-4xl mb-3">{pillar.icon}</div>
                <h3 className="text-lg font-semibold mb-2">{pillar.title}</h3>
                <p className="text-gray-600 text-sm">{pillar.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* RBAC Details */}
        <section className="mb-16 border-t pt-12">
          <h2 className="text-2xl font-bold mb-6">Role-Based Access Control</h2>
          <p className="text-gray-600 mb-6">
            Every action in DSG ONE is protected by permission checks. Users are assigned roles with specific permissions.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-300">
                  <th className="text-left py-3 px-4 font-semibold">Role</th>
                  <th className="text-left py-3 px-4 font-semibold">Permissions</th>
                  <th className="text-left py-3 px-4 font-semibold">Use Case</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    role: 'Admin',
                    permissions: 'All permissions (full access)',
                    useCase: 'Organization owner, system administrator',
                  },
                  {
                    role: 'Operator',
                    permissions: 'Read all, manage audit logs, API keys, webhooks, notifications',
                    useCase: 'DevOps engineer, incident responder',
                  },
                  {
                    role: 'Viewer',
                    permissions: 'Read-only access to dashboards and audit trail',
                    useCase: 'Auditor, compliance officer, management',
                  },
                  {
                    role: 'Custom',
                    permissions: 'Organization-defined permission subsets',
                    useCase: 'Restricted access for contractors, limited team members',
                  },
                ].map((row, idx) => (
                  <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{row.role}</td>
                    <td className="py-3 px-4 text-gray-600">{row.permissions}</td>
                    <td className="py-3 px-4 text-gray-600">{row.useCase}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* SSO & Provisioning */}
        <section className="mb-16 border-t pt-12">
          <h2 className="text-2xl font-bold mb-6">Identity & Access Management</h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">SAML 2.0</h3>
              <p className="text-gray-600 mb-2">
                Connect to enterprise identity providers (Okta, Azure AD, Google Workspace, etc.) via SAML 2.0 federation.
              </p>
              <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
                <li>Encrypted SAML assertions with signature validation</li>
                <li>Automatic user provisioning on first login</li>
                <li>IdP group mapping to DSG roles (JIT provisioning)</li>
                <li>Single logout (SLO) support</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">OpenID Connect (OIDC)</h3>
              <p className="text-gray-600 mb-2">
                Modern OAuth 2.0-based federation for seamless integration with cloud identity platforms.
              </p>
              <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
                <li>JWT ID token verification with audience/issuer validation</li>
                <li>Standard OpenID Connect discovery endpoints</li>
                <li>Group claims extraction for automatic role assignment</li>
                <li>Refresh token support for long-lived sessions</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2">SCIM 2.0 Provisioning</h3>
              <p className="text-gray-600 mb-2">
                Automate user lifecycle management with System for Cross-domain Identity Management (RFC 7643).
              </p>
              <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
                <li>Automated user creation on IdP → DSG sync</li>
                <li>Update user attributes (name, email, groups)</li>
                <li>Soft-delete users (preserve audit trail)</li>
                <li>Filter users by email, status, or groups</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Audit & Compliance */}
        <section className="mb-16 border-t pt-12">
          <h2 className="text-2xl font-bold mb-6">Audit & Compliance</h2>

          <div className="space-y-6">
            <div className="border border-gray-200 rounded-lg p-6 bg-blue-50">
              <h3 className="font-semibold mb-2">🎯 Audit Trail</h3>
              <p className="text-sm text-gray-600">
                Every action is logged with timestamp, actor, action type, resource, result, and correlation ID. Logs are
                immutable and retained for 30 days by default.
              </p>
            </div>

            <div className="border border-gray-200 rounded-lg p-6 bg-green-50">
              <h3 className="font-semibold mb-2">📊 SIEM Integration</h3>
              <p className="text-sm text-gray-600">
                Export audit logs in JSON or CSV format for integration with SIEM systems (Splunk, ELK, Datadog, etc.).
                Filter by action, severity, actor, or date range.
              </p>
            </div>

            <div className="border border-gray-200 rounded-lg p-6 bg-purple-50">
              <h3 className="font-semibold mb-2">✅ SOC 2 Ready</h3>
              <p className="text-sm text-gray-600">
                DSG ONE is audit-ready for SOC 2 Type II certification. See{' '}
                <Link href="/compliance" className="font-semibold text-blue-600 hover:underline">
                  compliance page
                </Link>{' '}
                for control mapping and evidence.
              </p>
            </div>
          </div>
        </section>

        {/* Incident Response */}
        <section className="mb-16 border-t pt-12">
          <h2 className="text-2xl font-bold mb-6">Incident Response</h2>
          <p className="text-gray-600 mb-6">
            We maintain a detailed incident response playbook for detecting, investigating, and containing security incidents.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: 'Detection',
                description: 'Real-time alerts via Sentry, PostHog, and audit log monitoring',
              },
              {
                title: 'Investigation',
                description: 'Correlation IDs enable full request tracing and root cause analysis',
              },
              {
                title: 'Containment',
                description: 'Immediate session revocation, role removal, and IP blocking',
              },
            ].map((item, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Questions */}
        <section className="border-t pt-12">
          <h2 className="text-2xl font-bold mb-6">Have Security Questions?</h2>
          <p className="text-gray-600 mb-4">
            Our security team is here to help. Please contact us at:
          </p>
          <a
            href="mailto:security@dsg.pics"
            className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
          >
            security@dsg.pics
          </a>
        </section>
      </div>
    </main>
  );
}
