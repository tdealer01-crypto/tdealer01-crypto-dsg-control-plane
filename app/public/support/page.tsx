import React from 'react';

export const metadata = {
  title: 'Support - DSG ONE',
  description: 'Get help with DSG ONE — support contact, SLA, response times, and resources.',
};

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-4">Support</h1>
          <p className="text-xl text-gray-600">
            We&apos;re here to help. Get support from our team with guaranteed response times.
          </p>
        </div>

        {/* SLA & Response Times */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6">Support SLA</h2>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                severity: 'Critical',
                description: 'Production outage, security incident, data loss',
                response: '1 hour',
                resolution: '4 hours',
                color: 'bg-red-50 border-red-200',
              },
              {
                severity: 'High',
                description: 'Significant feature degradation, performance issue',
                response: '4 hours',
                resolution: '8 hours',
                color: 'bg-orange-50 border-orange-200',
              },
              {
                severity: 'Medium',
                description: 'Minor feature not working, error messages',
                response: '1 business day',
                resolution: '3 business days',
                color: 'bg-yellow-50 border-yellow-200',
              },
              {
                severity: 'Low',
                description: 'Feature request, documentation clarification',
                response: '3 business days',
                resolution: '10 business days',
                color: 'bg-blue-50 border-blue-200',
              },
            ].map((sla, idx) => (
              <div key={idx} className={`border rounded-lg p-6 ${sla.color}`}>
                <h3 className="text-lg font-semibold mb-2">{sla.severity}</h3>
                <p className="text-sm text-gray-600 mb-4">{sla.description}</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">First Response:</span>
                    <span className="font-semibold">{sla.response}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Target Resolution:</span>
                    <span className="font-semibold">{sla.resolution}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="text-sm text-gray-500 mt-6">
            SLAs apply to enterprise customers. Community support may have longer response times.
          </p>
        </section>

        {/* Support Channels */}
        <section className="mb-16 border-t pt-12">
          <h2 className="text-2xl font-bold mb-6">How to Get Support</h2>

          <div className="space-y-6">
            {[
              {
                channel: '🚨 Critical Issues',
                contact: '+1 (650) 308-4160',
                email: 'critical@dsg.pics',
                availability: '24/7/365',
                description: 'Production outage or security incident? Call for immediate assistance.',
              },
              {
                channel: '📧 Email Support',
                contact: 'support@dsg.pics',
                email: 'support@dsg.pics',
                availability: 'Business hours (Mon-Fri, 9am-6pm PT)',
                description: 'General support requests, feature questions, troubleshooting.',
              },
              {
                channel: '🔒 Security Issues',
                contact: 'security@dsg.pics',
                email: 'security@dsg.pics',
                availability: '24/7 monitored',
                description: 'Report security vulnerabilities or suspected breaches.',
              },
              {
                channel: '📋 Compliance Requests',
                contact: 'compliance@dsg.pics',
                email: 'compliance@dsg.pics',
                availability: 'Business hours',
                description: 'SOC 2 audits, certifications, compliance documentation.',
              },
              {
                channel: '💬 Community',
                contact: 'GitHub Discussions',
                email: 'github.com/tdealer01-crypto/discussions',
                availability: 'Community-supported',
                description: 'Questions, feature ideas, connect with other users.',
              },
            ].map((item, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold">{item.channel}</h3>
                  <span className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-semibold">
                    {item.availability}
                  </span>
                </div>
                <p className="text-gray-600 mb-3">{item.description}</p>
                <div className="flex flex-col sm:flex-row gap-4 text-sm">
                  <div>
                    <div className="text-gray-500">Contact</div>
                    <a href={`mailto:${item.email}`} className="text-blue-600 hover:underline font-mono">
                      {item.contact}
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Self-Service Resources */}
        <section className="mb-16 border-t pt-12">
          <h2 className="text-2xl font-bold mb-6">Self-Service Resources</h2>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                icon: '📚',
                title: 'Documentation',
                items: ['API Reference', 'Quickstart Guide', 'FAQ', 'Tutorials'],
                link: '/docs',
              },
              {
                icon: '🐛',
                title: 'Troubleshooting',
                items: ['Known Issues', 'Incident Response', 'Performance Tips', 'Error Reference'],
                link: '/docs/troubleshooting',
              },
              {
                icon: '🔐',
                title: 'Security',
                items: ['Security Practices', 'Compliance', 'Incident Response', 'Vulnerability Reporting'],
                link: '/security',
              },
              {
                icon: '📊',
                title: 'Status',
                items: ['System Status', 'Maintenance Window', 'Uptime History', 'Incident Reports'],
                link: 'https://status.dsg.pics',
              },
            ].map((resource, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition">
                <div className="text-3xl mb-3">{resource.icon}</div>
                <h3 className="text-lg font-semibold mb-3">{resource.title}</h3>
                <ul className="space-y-1 mb-4">
                  {resource.items.map((item, iIdx) => (
                    <li key={iIdx} className="text-sm text-gray-600 flex items-center">
                      <span className="mr-2">→</span>
                      {item}
                    </li>
                  ))}
                </ul>
                <a href={resource.link} className="text-blue-600 hover:underline text-sm font-semibold">
                  Learn more
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* Support Tiers */}
        <section className="mb-16 border-t pt-12">
          <h2 className="text-2xl font-bold mb-6">Support Tiers</h2>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                tier: 'Community',
                price: 'Free',
                features: [
                  'Community forum access',
                  'GitHub issues',
                  'Email support (3 business days)',
                  'Self-service docs',
                  'Status page',
                ],
              },
              {
                tier: 'Professional',
                price: '$500/month',
                features: [
                  'Email support (1 business day)',
                  'Priority queue',
                  'Phone support (business hours)',
                  'Custom onboarding',
                  'Quarterly reviews',
                  'SLA guarantees',
                ],
              },
              {
                tier: 'Enterprise',
                price: 'Custom',
                features: [
                  '24/7 phone support',
                  'Dedicated account manager',
                  '1-hour response SLA',
                  'Custom training',
                  'Security audits',
                  'Compliance consulting',
                ],
              },
            ].map((tier, idx) => (
              <div key={idx} className={`border rounded-lg p-6 ${idx === 1 ? 'ring-2 ring-blue-500 shadow-lg' : ''}`}>
                <h3 className="text-xl font-bold mb-2">{tier.tier}</h3>
                <p className="text-2xl font-bold text-blue-600 mb-6">{tier.price}</p>
                <ul className="space-y-3">
                  {tier.features.map((feature, fIdx) => (
                    <li key={fIdx} className="flex items-start text-sm">
                      <span className="mr-2 text-green-600">✓</span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-16 border-t pt-12">
          <h2 className="text-2xl font-bold mb-6">Frequently Asked Questions</h2>

          <div className="space-y-4">
            {[
              {
                q: 'How do I report a bug?',
                a: 'Please email support@dsg.pics with details about what happened, steps to reproduce, and any error messages. Include correlation IDs from the audit log if available.',
              },
              {
                q: 'What is your uptime SLA?',
                a: 'We target 99.9% uptime (43 minutes downtime/month). Check our status page at status.dsg.pics for real-time updates.',
              },
              {
                q: 'Can I get a custom support plan?',
                a: 'Yes! Enterprise customers can customize support plans. Contact enterprise@dsg.pics for details.',
              },
              {
                q: 'What is your data backup schedule?',
                a: 'We maintain daily automated backups with 7-day point-in-time recovery. Data is encrypted at rest and in transit.',
              },
              {
                q: 'How do I report a security vulnerability?',
                a: 'Please email security@dsg.pics with details. Do not disclose publicly until we have patched the issue.',
              },
            ].map((item, idx) => (
              <details key={idx} className="border border-gray-200 rounded-lg p-4">
                <summary className="cursor-pointer font-semibold text-gray-900">
                  {item.q}
                </summary>
                <p className="text-gray-600 mt-3">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="border-t pt-12 text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-gray-600 mb-6">
            Have questions? Our support team is ready to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:support@dsg.pics"
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
            >
              Email Support
            </a>
            <a
              href="https://status.dsg.pics"
              className="px-6 py-3 border-2 border-blue-600 text-blue-600 rounded-lg font-semibold hover:bg-blue-50"
            >
              Check Status
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
