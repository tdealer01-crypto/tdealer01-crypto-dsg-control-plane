import React from 'react';

// Document wrapper
export function Document({ children }: { children: React.ReactNode }) {
  return (
    <div className="prose prose-sm max-w-4xl mx-auto p-6 bg-white rounded-lg">
      {children}
    </div>
  );
}

// Heading
export function Heading({ level, children }: { level: number; children: React.ReactNode }) {
  const headingClasses = {
    1: 'text-3xl font-bold mt-8 mb-4',
    2: 'text-2xl font-bold mt-6 mb-3',
    3: 'text-xl font-bold mt-4 mb-2',
  }[level] || 'text-lg font-bold mt-3 mb-2';

  const headingMap: Record<number, React.ComponentType<{children: React.ReactNode; className: string}>> = {
    1: ({ children, className }) => <h1 className={className}>{children}</h1>,
    2: ({ children, className }) => <h2 className={className}>{children}</h2>,
    3: ({ children, className }) => <h3 className={className}>{children}</h3>,
    4: ({ children, className }) => <h4 className={className}>{children}</h4>,
    5: ({ children, className }) => <h5 className={className}>{children}</h5>,
    6: ({ children, className }) => <h6 className={className}>{children}</h6>,
  };

  const HeadingTag = headingMap[level] || headingMap[2];
  return <HeadingTag className={headingClasses}>{children}</HeadingTag>;
}

// Paragraph
export function Paragraph({ children }: { children: React.ReactNode }) {
  return <p className="text-gray-700 leading-relaxed mb-4">{children}</p>;
}

// Inline code
export function InlineCode({ content }: { content: string }) {
  return (
    <code className="bg-gray-100 px-2 py-1 rounded text-red-600 font-mono text-sm">
      {content}
    </code>
  );
}

// Code block
export function CodeBlock({ language, content }: { language?: string; content: string }) {
  return (
    <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto mb-4">
      <code className={`language-${language || 'text'}`}>
        {content}
      </code>
    </pre>
  );
}

// Link
export function Link({ href, title, children }: { href: string; title?: string; children: React.ReactNode }) {
  return (
    <a href={href} title={title} className="text-blue-600 hover:underline">
      {children}
    </a>
  );
}

// List
export function List({ ordered, children }: { ordered?: boolean; children: React.ReactNode }) {
  const Tag = ordered ? 'ol' : 'ul';
  const className = ordered ? 'list-decimal ml-6 mb-4' : 'list-disc ml-6 mb-4';
  return <Tag className={className}>{children}</Tag>;
}

// List item
export function ListItem({ children }: { children: React.ReactNode }) {
  return <li className="text-gray-700 mb-2">{children}</li>;
}

// DSG Custom Components

// PolicyRule - แสดง rule ของ policy
export function PolicyRule({
  type = 'allow',
  condition,
  resource,
  action,
}: {
  type?: 'allow' | 'block' | 'review';
  condition?: string;
  resource?: string;
  action?: string;
}) {
  const colors = {
    allow: 'bg-green-50 border-green-300 text-green-900',
    block: 'bg-red-50 border-red-300 text-red-900',
    review: 'bg-yellow-50 border-yellow-300 text-yellow-900',
  };

  const icons = {
    allow: '✅',
    block: '❌',
    review: '⚠️',
  };

  return (
    <div className={`border-l-4 ${colors[type]} p-4 mb-4 rounded`}>
      <div className="flex items-center gap-2">
        <span className="text-xl">{icons[type]}</span>
        <span className="font-semibold capitalize">{type}</span>
      </div>
      {condition && <div className="mt-2 text-sm">Condition: <code className="bg-white/50 px-1 rounded">{condition}</code></div>}
      {resource && <div className="text-sm">Resource: <span className="font-mono bg-white/50 px-1 rounded">{resource}</span></div>}
      {action && <div className="text-sm">Action: <span className="font-mono bg-white/50 px-1 rounded">{action}</span></div>}
    </div>
  );
}

// GateEvaluator - Interactive gate test
export function GateEvaluator({
  policyId,
  interactive = true,
}: {
  policyId?: string;
  interactive?: boolean;
}) {
  const [testInput, setTestInput] = React.useState('');
  const [result, setResult] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);

  async function evaluateGate() {
    if (!testInput.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/dsg/v1/gates/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          policy_id: policyId,
          input: JSON.parse(testInput),
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ error: String(err) });
    } finally {
      setLoading(false);
    }
  }

  if (!interactive) {
    return (
      <div className="bg-blue-50 border border-blue-300 p-4 rounded mb-4">
        <div className="font-semibold text-blue-900">Gate Evaluator</div>
        <div className="text-sm text-blue-800">Policy ID: {policyId}</div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-300 p-4 rounded mb-4">
      <div className="font-semibold text-blue-900 mb-3">Test Gate Evaluation</div>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-blue-900 mb-1">
            Test Input (JSON)
          </label>
          <textarea
            className="w-full p-2 border border-blue-200 rounded bg-white text-sm font-mono"
            rows={4}
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            placeholder={`{\n  "confidence": 0.95,\n  "action": "approve"\n}`}
          />
        </div>
        <button
          onClick={evaluateGate}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 font-medium"
        >
          {loading ? 'Evaluating...' : 'Evaluate'}
        </button>
        {result && (
          <div className="bg-white p-3 rounded border border-blue-200">
            <div className="font-mono text-sm whitespace-pre-wrap">
              {JSON.stringify(result, null, 2)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Alert component
export function Alert({
  type = 'info',
  title,
  children,
}: {
  type?: 'info' | 'warning' | 'error' | 'success';
  title?: string;
  children: React.ReactNode;
}) {
  const colors = {
    info: 'bg-blue-50 border-blue-300 text-blue-900',
    warning: 'bg-yellow-50 border-yellow-300 text-yellow-900',
    error: 'bg-red-50 border-red-300 text-red-900',
    success: 'bg-green-50 border-green-300 text-green-900',
  };

  const icons = {
    info: 'ℹ️',
    warning: '⚠️',
    error: '❌',
    success: '✅',
  };

  return (
    <div className={`border-l-4 ${colors[type]} p-4 mb-4 rounded`}>
      <div className="flex items-start gap-3">
        <span className="text-xl mt-0.5">{icons[type]}</span>
        <div className="flex-1">
          {title && <div className="font-semibold mb-1">{title}</div>}
          <div className="text-sm">{children}</div>
        </div>
      </div>
    </div>
  );
}
