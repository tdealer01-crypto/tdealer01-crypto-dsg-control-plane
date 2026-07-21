import React from 'react';

/**
 * React components for every `render: 'X'` name declared in markdocConfig
 * (markdoc/config.ts). Markdoc's react renderer resolves each rendered node
 * against this map; a missing entry makes React throw "Element type is
 * invalid ... but got: undefined" on ordinary markdown content, which is how
 * both /design and /docs/[lang] previously crashed with a 500.
 */
export function createMarkdocComponents() {
  return {
    // Design-system-specific tags (stub implementations).
    DesignButton: (_props: { color?: string; variant?: string; children?: React.ReactNode }) => null,
    ColorSwatch: (_props: { color?: string; name?: string; usage?: string }) => null,
    SpacingTable: () => null,
    ComponentSpec: (_props: Record<string, unknown>) => null,

    // Base markdown nodes.
    Document: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
    Heading: ({ id, level, children }: { id?: string; level?: number; children?: React.ReactNode }) =>
      React.createElement(`h${level ?? 2}`, { id }, children),
    Paragraph: ({ children }: { children?: React.ReactNode }) =>
      React.createElement('p', null, children),
    BlockQuote: ({ children }: { children?: React.ReactNode }) =>
      React.createElement('blockquote', null, children),
    CodeBlock: ({ content, language }: { content?: string; language?: string }) =>
      React.createElement(
        'pre',
        null,
        React.createElement('code', { className: language ? `language-${language}` : undefined }, content),
      ),
    HR: () => React.createElement('hr'),
    List: ({ ordered, children }: { ordered?: boolean; children?: React.ReactNode }) =>
      React.createElement(ordered ? 'ol' : 'ul', null, children),
    ListItem: ({ children }: { children?: React.ReactNode }) =>
      React.createElement('li', null, children),
    Table: ({ children }: { children?: React.ReactNode }) =>
      React.createElement('table', null, children),
    THead: ({ children }: { children?: React.ReactNode }) =>
      React.createElement('thead', null, children),
    TBody: ({ children }: { children?: React.ReactNode }) =>
      React.createElement('tbody', null, children),
    TR: ({ children }: { children?: React.ReactNode }) =>
      React.createElement('tr', null, children),
    TH: ({ align, children }: { align?: string; children?: React.ReactNode }) =>
      React.createElement('th', { style: align ? { textAlign: align as 'left' | 'center' | 'right' } : undefined }, children),
    TD: ({ align, children }: { align?: string; children?: React.ReactNode }) =>
      React.createElement('td', { style: align ? { textAlign: align as 'left' | 'center' | 'right' } : undefined }, children),
    Link: ({ href, children }: { href?: string; children?: React.ReactNode }) =>
      React.createElement(
        'a',
        {
          href,
          target: href?.startsWith('http') ? '_blank' : undefined,
          rel: href?.startsWith('http') ? 'noopener noreferrer' : undefined,
        },
        children,
      ),
    Image: ({ src, alt }: { src?: string; alt?: string }) =>
      React.createElement('img', { src, alt }),
    Strong: ({ children }: { children?: React.ReactNode }) =>
      React.createElement('strong', null, children),
    Em: ({ children }: { children?: React.ReactNode }) =>
      React.createElement('em', null, children),
  };
}
