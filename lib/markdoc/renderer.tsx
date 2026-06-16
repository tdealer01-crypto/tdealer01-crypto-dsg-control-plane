import React from 'react';
import Markdoc from '@markdoc/markdoc';
import config from '@/markdoc.config';
import * as components from './components';

export interface MarkdocRenderOptions {
  markdown: string;
  variables?: Record<string, any>;
}

/**
 * Parse and render Markdoc markdown to React
 */
export async function renderMarkdoc({
  markdown,
  variables = {},
}: MarkdocRenderOptions): Promise<React.ReactNode> {
  try {
    const ast = Markdoc.parse(markdown);
    const transformed = Markdoc.transform(ast, { variables, config });
    return Markdoc.renderers.react(transformed, React, { components });
  } catch (error) {
    console.error('Markdoc render error:', error);
    throw error;
  }
}

/**
 * Render Markdoc as a React component (for server components)
 */
export function MarkdocRenderer({ markdown, variables }: MarkdocRenderOptions) {
  const [content, setContent] = React.useState<React.ReactNode | null>(null);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    renderMarkdoc({ markdown, variables })
      .then(setContent)
      .catch(setError);
  }, [markdown, variables]);

  if (error) {
    return (
      <div className="bg-red-50 border border-red-300 p-4 rounded">
        <div className="font-semibold text-red-900">Render Error</div>
        <pre className="text-sm text-red-800 mt-2 whitespace-pre-wrap">
          {error.message}
        </pre>
      </div>
    );
  }

  if (!content) {
    return <div className="animate-pulse">Loading...</div>;
  }

  return <>{content}</>;
}
