import { Config } from '@markdoc/markdoc';

export const markdocConfig: Config = {
  variables: {
    title: 'DSG ONE',
    description: 'Enterprise AI Governance Platform',
    version: '1.0.0',
    locale: 'en',
    locales: ['en', 'th'],
    defaultLocale: 'en',
  },
  headings: {
    anchorPrefix: 'heading-',
  },
  tags: {
    callout: {
      render: 'Callout',
      attributes: {
        type: {
          type: String,
          default: 'info',
          matches: ['info', 'warning', 'error', 'success'],
        },
        title: {
          type: String,
          required: true,
        },
      },
    },
    tabs: {
      render: 'Tabs',
      attributes: {
        items: {
          type: Array,
          required: true,
        },
      },
    },
    tab: {
      render: 'Tab',
      attributes: {
        label: {
          type: String,
          required: true,
        },
      },
    },
    code: {
      render: 'CodeBlock',
      attributes: {
        language: {
          type: String,
          required: true,
        },
        filename: {
          type: String,
        },
      },
    },
  },
  nodes: {
    document: {
      render: 'Document',
    },
    heading: {
      render: 'Heading',
      attributes: {
        id: { type: String },
        level: { type: Number, required: true },
      },
    },
    paragraph: {
      render: 'Paragraph',
    },
    blockquote: {
      render: 'BlockQuote',
    },
    code: {
      render: 'CodeBlock',
      attributes: {
        content: { type: String, required: true },
        language: { type: String },
        filename: { type: String },
      },
    },
    fence: {
      render: 'CodeBlock',
      attributes: {
        content: { type: String, required: true },
        language: { type: String, required: true },
        filename: { type: String },
      },
    },
    hr: {
      render: 'HR',
    },
    ul: {
      render: 'List',
    },
    ol: {
      render: 'OrderedList',
    },
    li: {
      render: 'ListItem',
    },
    table: {
      render: 'Table',
    },
    thead: {
      render: 'THead',
    },
    tbody: {
      render: 'TBody',
    },
    tr: {
      render: 'TR',
    },
    th: {
      render: 'TH',
      attributes: {
        align: { type: String },
      },
    },
    td: {
      render: 'TD',
      attributes: {
        align: { type: String },
      },
    },
    link: {
      render: 'Link',
      attributes: {
        href: { type: String, required: true },
      },
    },
    image: {
      render: 'Image',
      attributes: {
        src: { type: String, required: true },
        alt: { type: String },
      },
    },
    strong: {
      render: 'Strong',
    },
    em: {
      render: 'Em',
    },
    inlineCode: {
      render: 'InlineCode',
    },
  },
};
