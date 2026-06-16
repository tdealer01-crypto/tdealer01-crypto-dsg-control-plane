import React from 'react';
import Markdoc from '@markdoc/markdoc';
import config from '@/markdoc.config';
import * as components from '@/lib/markdoc/components';
import fs from 'fs/promises';
import path from 'path';

/**
 * Demo page: Show Markdoc policy rendering
 *
 * This is a PoC page to demonstrate Markdoc integration
 * In production, policies would be fetched from database
 */
export default async function PoliciesDemoPage() {
  // Load example policy markdown
  const policyPath = path.join(process.cwd(), 'lib/markdoc/example-policy.md');
  const markdown = await fs.readFile(policyPath, 'utf-8');

  // Parse and render
  const ast = Markdoc.parse(markdown);
  const transformed = Markdoc.transform(ast, {
    config,
    variables: {
      policyId: 'policy-dsg-v1',
    },
  });

  const content = Markdoc.renderers.react(transformed, React, { components });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-slate-900">Policy Documentation</h1>
          <p className="text-sm text-slate-600 mt-1">Markdoc Rendering PoC</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-blue-50 border border-blue-300 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">✨ Markdoc Integration PoC</h2>
          <p className="text-sm text-blue-800">
            This page demonstrates Markdoc integration for rendering policies with:
          </p>
          <ul className="text-sm text-blue-800 list-disc ml-6 mt-2 space-y-1">
            <li>Markdown content with custom components</li>
            <li>PolicyRule blocks (ALLOW/BLOCK/REVIEW)</li>
            <li>Interactive GateEvaluator component</li>
            <li>Alert boxes for important notices</li>
            <li>Code blocks and formatted content</li>
          </ul>
        </div>

        {/* Rendered Markdoc content */}
        <div className="bg-white rounded-lg shadow-sm p-8">
          {content}
        </div>

        {/* Footer info */}
        <div className="mt-12 border-t border-slate-200 pt-8 text-sm text-slate-600">
          <h3 className="font-semibold text-slate-900 mb-3">Implementation Details</h3>
          <pre className="bg-slate-900 text-slate-100 p-4 rounded overflow-x-auto text-xs">
{`// API endpoint: POST /api/policies/render
const response = await fetch('/api/policies/render', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    markdown: policyText,
    policyId: 'policy-dsg-v1',
  })
});

const { content } = await response.json();
// Render content to HTML/React in client
`}
          </pre>
          <p className="mt-4 text-slate-600">
            See <code className="bg-slate-100 px-2 py-1 rounded">lib/markdoc/</code> for implementation.
          </p>
        </div>
      </main>
    </div>
  );
}
