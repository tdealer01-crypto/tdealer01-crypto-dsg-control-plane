import { Config } from '@markdoc/markdoc';

export const markdocConfig: Config = {
  variables: {
    title: 'DSG ONE',
    description: 'Enterprise AI Governance Platform',
    version: '1.0.0',
    locale: 'th',
    locales: ['th', 'en'],
    defaultLocale: 'th',
  },
  tags: {
    designButton: {
      render: 'DesignButton',
      attributes: {
        color: { type: String },
        variant: { type: String, default: 'primary' },
      },
    },
    colorSwatch: {
      render: 'ColorSwatch',
      attributes: {
        color: { type: String, required: true },
        name: { type: String, required: true },
        usage: { type: String },
      },
    },
    spacingTable: {
      render: 'SpacingTable',
    },
    componentSpec: {
      render: 'ComponentSpec',
      attributes: {
        name: { type: String, required: true },
        bg: { type: String },
        border: { type: String },
        rounded: { type: String },
        padding: { type: String },
        text: { type: String },
      },
    },
  },
  nodes: {
    document: { render: 'Document' },
    heading: {
      render: 'Heading',
      attributes: { id: { type: String }, level: { type: Number, required: true } },
    },
    paragraph: { render: 'Paragraph' },
    blockquote: { render: 'BlockQuote' },
    code: {
      render: 'CodeBlock',
      attributes: { content: { type: String, required: true }, language: { type: String } },
    },
    fence: {
      render: 'CodeBlock',
      attributes: { content: { type: String, required: true }, language: { type: String, required: true } },
    },
    hr: { render: 'HR' },
    list: { render: 'List' },
    item: { render: 'ListItem' },
    table: { render: 'Table' },
    thead: { render: 'THead' },
    tbody: { render: 'TBody' },
    tr: { render: 'TR' },
    th: { render: 'TH', attributes: { align: { type: String } } },
    td: { render: 'TD', attributes: { align: { type: String } } },
    link: { render: 'Link', attributes: { href: { type: String, required: true } } },
    image: { render: 'Image', attributes: { src: { type: String, required: true }, alt: { type: String } } },
    strong: { render: 'Strong' },
    em: { render: 'Em' },
  },
};
