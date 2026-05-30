/**
 * Command Parser
 * Parse and validate slash commands
 */

export interface ParsedCommand {
  command: string;
  args: string[];
  isValid: boolean;
}

export function parseInput(input: string): ParsedCommand | null {
  const trimmed = input.trim();
  if (!trimmed.startsWith('/')) {
    return null;
  }

  const parts = trimmed.slice(1).split(/\s+/);
  const command = parts[0].toLowerCase();
  const args = parts.slice(1);

  return {
    command,
    args,
    isValid: isValidCommand(command),
  };
}

export function isValidCommand(cmd: string): boolean {
  const validCommands = [
    'help',
    'history',
    'config',
    'save',
    'load',
    'retry',
    'clear',
    'reset',
    'evidence',
    'export',
  ];
  return validCommands.includes(cmd);
}

export const SLASH_COMMANDS = {
  help: {
    name: 'help',
    description: 'Show available commands',
    usage: '/help',
  },
  history: {
    name: 'history',
    description: 'Show execution history',
    usage: '/history',
  },
  config: {
    name: 'config',
    description: 'Configure allowed commands and paths',
    usage: '/config',
  },
  save: {
    name: 'save',
    description: 'Save current conversation',
    usage: '/save <session-name>',
  },
  load: {
    name: 'load',
    description: 'Load a saved conversation',
    usage: '/load <session-id>',
  },
  retry: {
    name: 'retry',
    description: 'Retry last execution',
    usage: '/retry',
  },
  clear: {
    name: 'clear',
    description: 'Clear current chat',
    usage: '/clear',
  },
  reset: {
    name: 'reset',
    description: 'Start new session',
    usage: '/reset',
  },
  evidence: {
    name: 'evidence',
    description: 'Show execution evidence details',
    usage: '/evidence <execution-id>',
  },
  export: {
    name: 'export',
    description: 'Export conversation as JSON',
    usage: '/export',
  },
};

export function getHelpText(): string {
  const lines = [
    'DSG Brain Commands:',
    '',
    ...Object.values(SLASH_COMMANDS).map(
      (cmd) => `${cmd.usage.padEnd(25)} - ${cmd.description}`
    ),
    '',
    'Type any task to execute via DSG Brain.',
  ];
  return lines.join('\n');
}
