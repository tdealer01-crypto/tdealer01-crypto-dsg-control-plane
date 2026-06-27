const config = {
  nodes: {
    document: {
      render: 'Document',
    },
    heading: {
      render: 'Heading',
      attributes: {
        level: {
          type: Number,
          required: true,
        },
      },
    },
    paragraph: {
      render: 'Paragraph',
    },
    code: {
      render: 'InlineCode',
      attributes: {
        content: {
          type: String,
        },
      },
    },
    fence: {
      render: 'CodeBlock',
      attributes: {
        language: {
          type: String,
        },
        content: {
          type: String,
        },
      },
    },
    link: {
      render: 'Link',
      attributes: {
        href: {
          type: String,
        },
        title: {
          type: String,
        },
      },
    },
    list: {
      render: 'List',
      attributes: {
        ordered: {
          type: Boolean,
          default: false,
        },
      },
    },
    item: {
      render: 'ListItem',
    },
  },
  tags: {
    PolicyRule: {
      render: 'PolicyRule',
      attributes: {
        condition: {
          type: String,
        },
        type: {
          type: String,
          default: 'allow',
        },
        resource: {
          type: String,
        },
        action: {
          type: String,
        },
      },
    },
    GateEvaluator: {
      render: 'GateEvaluator',
      attributes: {
        policyId: {
          type: String,
        },
        interactive: {
          type: Boolean,
          default: true,
        },
      },
    },
    Alert: {
      render: 'Alert',
      attributes: {
        type: {
          type: String,
          default: 'info',
          matches: ['info', 'warning', 'error', 'success'],
        },
        title: {
          type: String,
        },
      },
    },
  },
};

export default config;
