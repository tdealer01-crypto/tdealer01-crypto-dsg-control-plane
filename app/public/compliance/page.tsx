import React from 'react';
import Link from 'next/link';

export const metadata = {
  title: 'Compliance - DSG ONE',
  description: 'DSG ONE compliance certifications and audit-ready evidence mapping.',
};

export default function CompliancePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-4">Compliance & Certifications</h1>
          <p className="text-xl text-gray-600">
            DSG ONE is designed and operated to meet enterprise compliance requirements.
          </p>
        </div>

        {/* Compliance Status */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6">Compliance Status</h2>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                status: '✅ Audit-Ready',
                title: 'SOC 2 Type II',
                description: 'Audit-ready with full control mapping. Certified audit in Q4 2026.',
                details: [
                  'CC6.1: Authorization & RBAC',
                  'CC7.1: Monitoring & Audit Logs',
                  'CC7.2: System Monitoring',
                  'CC8.1: Change Management',
                  'CC9.2: Backup & Recovery',
                  'CC9.3: Media Protection',
                  'CC10.1: Incident Response',
                ],
              },
              {
                status: '✅ Compliant',
                title: 'WCAG 2.2 Level AA',
                description: 'Web Content Accessibility Guidelines compliance at Level AA.',
                details: [
                  'Color contrast 4.5:1 minimum',
                  'Keyboard navigation support',
                  'ARIA labels and landmarks',
                  'Form labels and error messages',
                  'Focus visible on all interactive elements',
                ],
              },
              {
                status: '✅ Compliant',
                title: 'GDPR',
                description: 'Data protection and privacy compliance with European regulations.',
                details: [
                  'Data processing agreements available',
                  'Right to deletion and data portability',
                  'Privacy policy at /privacy',
                  'Breach notification procedures',
                  'Data retention policies enforced',
                ],
              },
              {
                status: '✅ Compliant',
                title: 'CCPA',
                description: 'California Consumer Privacy Act compliance.',
                details: [
                  'User data access requests supported',
                  'Opt-out mechanisms for data sales (not applicable)',
                  'Privacy policy disclosures',
                  'Right to delete personal information',
                  '30-day response SLA',
                ],
              },
            ].map((item, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-6">
                <div className="text-sm font-semibold text-green-600 mb-2">{item.status}</div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm mb-4">{item.description}</p>
                <ul className="space-y-1">
                  {item.details.map((detail, dIdx) => (
                    <li key={dIdx} className="text-xs text-gray-500 flex items-start">
                      <span className="mr-2">•</span>
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* SOC 2 Control Mapping */}
        <section className="mb-16 border-t pt-12">
          <h2 className="text-2xl font-bold mb-6">SOC 2 Type II Control Matrix</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-300 bg-gray-50">
                  <th className="text-left py-3 px-4 font-semibold">Control</th>
                  <th className="text-left py-3 px-4 font-semibold">Description</th>
                  <th className="text-center py-3 px-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    control: 'CC6.1',
                    description:
                      'Authorization - The entity restricts access to assets based on least privilege and implements RBAC.',
                    status: '✅',
                  },
                  {
                    control: 'CC6.2',
                    description: 'Physical Access - Entity restricts physical access to infrastructure.',
                    status: 'N/A',
                  },
                  {
                    control: 'CC7.1',
                    description:
                      'Monitoring - Entity monitors system infrastructure and detects anomalies and security incidents.',
                    status: '✅',
                  },
                  {
                    control: 'CC7.2',
                    description:
                      'System Monitoring - Entity monitors systems for unauthorized access, capacity, and resource exhaustion.',
                    status: '✅',
                  },
                  {
                    control: 'CC8.1',
                    description:
                      'Change Management - Entity follows formal change control process to prevent unauthorized changes.',
                    status: '✅',
                  },
                  {
                    control: 'CC9.2',
                    description: 'Backup & Recovery - Entity maintains backups and tests recovery procedures.',
                    status: '✅',
                  },
                  {
                    control: 'CC9.3',
                    description: 'Media Protection - Entity protects data at rest and in transit.',
                    status: '✅',
                  },
                  {
                    control: 'CC10.1',
                    description: 'Incident Response - Entity detects, investigates, and responds to security incidents.',
                    status: '✅',
                  },
                  {
                    control: 'A1',
                    description: 'Availability - System designed for high availability and disaster recovery.',
                    status: '✅',
                  },
                  {
                    control: 'A2',
                    description: 'Processing Integrity - Authorized and complete data processing with error handling.',
                    status: '✅',
                  },
                  {
                    control: 'C1',
                    description: 'Confidentiality - Authorized access only; unauthorized disclosure prevented.',
                    status: '✅',
                  },
                  {
                    control: 'P',
                    description: 'Privacy - Personal data collected, used, and disclosed appropriately.',
                    status: '✅',
                  },
                ].map((row, idx) => (
                  <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-3 px-4 font-semibold text-blue-600">{row.control}</td>
                    <td className="py-3 px-4 text-gray-600">{row.description}</td>
                    <td className="py-3 px-4 text-center">
                      {row.status === '✅' && <span className="text-green-600 font-semibold">Implemented</span>}
                      {row.status === 'N/A' && <span className="text-gray-500">N/A</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-sm text-gray-600 mt-6">
            For detailed control evidence and implementation details, see{' '}
            <a href="/docs/SOC2_CONTROLS.md" className="text-blue-600 hover:underline font-semibold">
              docs/SOC2_CONTROLS.md
            </a>
            .
          </p>
        </section>

        {/* Accessibility */}
        <section className="mb-16 border-t pt-12">
          <h2 className="text-2xl font-bold mb-6">Accessibility (WCAG 2.2 Level AA)</h2>

          <div className="border border-blue-200 bg-blue-50 rounded-lg p-6 mb-6">
            <p className="text-gray-700">
              DSG ONE meets Web Content Accessibility Guidelines (WCAG) 2.2 Level AA standards to ensure all users,
              including those with disabilities, can access and use the platform.
            </p>
          </div>

          <div className="space-y-4">
            {[
              {
                criterion: 'Perceivable',
                requirements: [
                  'Color contrast ratio of at least 4.5:1 for normal text',
                  'Alternative text for images and icons',
                  'Resizable text (zoom support)',
                  'Visual indicators for focus',
                ],
              },
              {
                criterion: 'Operable',
                requirements: [
                  'Full keyboard navigation (no mouse required)',
                  'Focus visible on all interactive elements',
                  'Logical tab order',
                  'Skip links to main content',
                  'No keyboard traps',
                ],
              },
              {
                criterion: 'Understandable',
                requirements: [
                  'Clear and simple language',
                  'Form labels associated with inputs',
                  'Error messages linked to fields',
                  'Consistent navigation patterns',
                  'Language of page indicated (lang attribute)',
                ],
              },
              {
                criterion: 'Robust',
                requirements: [
                  'Valid HTML and ARIA markup',
                  'ARIA labels for icon buttons',
                  'Semantic landmarks (main, nav, aside, footer)',
                  'Tested with screen readers (NVDA, JAWS, VoiceOver)',
                  'Compatible with assistive technologies',
                ],
              },
            ].map((section, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-3">{section.criterion}</h3>
                <ul className="space-y-2">
                  {section.requirements.map((req, rIdx) => (
                    <li key={rIdx} className="flex items-start text-gray-600">
                      <span className="mr-3 text-green-600">✓</span>
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p className="text-sm text-gray-600 mt-6">
            Accessibility testing performed with axe-core and manual screen reader testing. Report available upon request.
          </p>
        </section>

        {/* Data Protection */}
        <section className="mb-16 border-t pt-12">
          <h2 className="text-2xl font-bold mb-6">Data Protection & Privacy</h2>

          <div className="space-y-6">
            {[
              {
                title: 'Encryption',
                icon: '🔐',
                description: 'All data encrypted at rest (AES-256) and in transit (TLS 1.3 minimum).',
              },
              {
                title: 'Data Retention',
                icon: '⏰',
                description:
                  'Audit logs retained for 30 days by default. Configurable retention per organization. Automatic deletion after retention period.',
              },
              {
                title: 'Data Deletion',
                icon: '🗑️',
                description:
                  'Users can request data deletion. Soft-delete preserves audit trail. Permanent deletion available with audit approval.',
              },
              {
                title: 'Data Processing',
                icon: '📋',
                description:
                  'Data Processing Agreements (DPA) available for EU organizations. GDPR Article 28 compliance.',
              },
              {
                title: 'Breach Notification',
                icon: '🚨',
                description:
                  'Incidents detected via monitoring. Notification within 72 hours per GDPR Article 34. Incident response playbook available.',
              },
              {
                title: 'Sub-processors',
                icon: '🤝',
                description:
                  'Third-party vendors (Vercel, Supabase, Sentry) are sub-processors. List available upon request. Amendments provided.',
              },
            ].map((item, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-start">
                  <div className="text-3xl mr-4">{item.icon}</div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                    <p className="text-gray-600">{item.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Audit & Certification */}
        <section className="mb-16 border-t pt-12">
          <h2 className="text-2xl font-bold mb-6">Audit & Certification Timeline</h2>

          <div className="space-y-4">
            {[
              {
                date: '2026-01-01',
                milestone: 'Baseline Controls Implemented',
                status: '✅ Complete',
              },
              {
                date: '2026-07-19',
                milestone: 'Audit-Ready Evidence Chain',
                status: '✅ Complete',
              },
              {
                date: '2026-09-01',
                milestone: 'Engage SOC 2 Auditor',
                status: '⏳ Planned',
              },
              {
                date: '2026-12-31',
                milestone: 'SOC 2 Type II Certification',
                status: '📅 Target',
              },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center border-b border-gray-200 pb-4">
                <div className="min-w-fit">
                  <div className="text-sm font-semibold text-gray-500">{item.date}</div>
                </div>
                <div className="flex-1 ml-6">
                  <h3 className="font-semibold">{item.milestone}</h3>
                </div>
                <div className="text-sm font-semibold">{item.status}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Contact & Resources */}
        <section className="border-t pt-12">
          <h2 className="text-2xl font-bold mb-6">Compliance Resources</h2>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="font-semibold mb-4">📄 Documentation</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="/privacy" className="text-blue-600 hover:underline">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="/terms" className="text-blue-600 hover:underline">
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="/security" className="text-blue-600 hover:underline">
                    Security Practices
                  </a>
                </li>
              </ul>
            </div>

            <div className="border border-gray-200 rounded-lg p-6">
              <h3 className="font-semibold mb-4">🔗 Key Documents</h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <a
                    href="/docs/SOC2_CONTROLS.md"
                    className="text-blue-600 hover:underline"
                  >
                    SOC 2 Controls Mapping
                  </a>
                </li>
                <li>
                  <a
                    href="/docs/INCIDENT_RESPONSE_PLAYBOOK.md"
                    className="text-blue-600 hover:underline"
                  >
                    Incident Response Playbook
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="font-semibold mb-3">Compliance Inquiries</h3>
            <p className="text-gray-600 mb-4">
              For compliance audits, certifications, or detailed control evidence:
            </p>
            <a
              href="mailto:compliance@dsg.pics"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
            >
              compliance@dsg.pics
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
