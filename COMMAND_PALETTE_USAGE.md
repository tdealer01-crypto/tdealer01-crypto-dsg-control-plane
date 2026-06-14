# CommandPalette Component Usage Guide

## Overview

The `CommandPalette` component provides a fast command execution interface accessible via **Ctrl+K** (or **Cmd+K** on Mac). It features:

- **Fuzzy Search**: Intelligently filter commands by name, description, or category
- **Last 5 Commands**: Recently used commands appear first for quick re-execution
- **Keyboard Navigation**: Full keyboard support with arrow keys, Enter to execute, Esc to close
- **Dark Theme**: Seamlessly integrated with DSG dark design tokens
- **Type-Safe**: Full TypeScript support with Command interface
- **Global Registry**: Register commands from anywhere in your application

## Basic Setup

### 1. Add CommandPalette to Your Root Layout

In your main layout or root component:

```tsx
'use client';

import { CommandPalette, useCommandPalette } from '@/components/ui';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { isOpen, close } = useCommandPalette();

  return (
    <html>
      <body>
        {children}
        <CommandPalette isOpen={isOpen} onClose={close} />
      </body>
    </html>
  );
}
```

### 2. Register Commands from Any Page

Use the `useCommands` hook to register commands from any component:

```tsx
'use client';

import { useCommands, type Command } from '@/components/ui';

export function DashboardPage() {
  const commands: Command[] = [
    {
      id: 'dashboard-refresh',
      name: 'Refresh Dashboard',
      description: 'Reload all dashboard data',
      icon: '🔄',
      shortcut: 'Ctrl+R',
      category: 'Dashboard',
      onExecute: async () => {
        // Your refresh logic
        window.location.reload();
      },
    },
    {
      id: 'dashboard-settings',
      name: 'Dashboard Settings',
      description: 'Open dashboard configuration',
      icon: '⚙️',
      shortcut: 'Ctrl+,',
      category: 'Dashboard',
      onExecute: () => {
        // Navigate to settings
        window.location.href = '/dashboard/settings';
      },
    },
  ];

  useCommands(commands);

  return (
    <div>
      <h1>Dashboard</h1>
      {/* Your dashboard content */}
    </div>
  );
}
```

## Advanced Usage

### Using the Command Registry Directly

For more control, use `useCommandRegistry()`:

```tsx
import { useCommandRegistry, type Command } from '@/components/ui';

export function MyComponent() {
  const registry = useCommandRegistry();

  useEffect(() => {
    const command: Command = {
      id: 'my-command',
      name: 'My Command',
      onExecute: () => console.log('Executed!'),
    };

    registry.register(command);

    return () => registry.unregister('my-command');
  }, [registry]);

  return null;
}
```

### Manually Controlling the Palette

Use `useCommandPalette()` to manually open/close:

```tsx
import { useCommandPalette } from '@/components/ui';

export function MyButton() {
  const { open, close, toggle } = useCommandPalette();

  return (
    <>
      <button onClick={toggle}>Toggle Palette</button>
      <button onClick={open}>Open Palette</button>
      <button onClick={close}>Close Palette</button>
    </>
  );
}
```

## Command Interface

```tsx
export interface Command {
  // Unique identifier
  id: string;

  // Display name (shows in list)
  name: string;

  // Optional description (shows below name, searchable)
  description?: string;

  // Optional icon/emoji to display before name
  icon?: React.ReactNode;

  // Optional keyboard shortcut hint (displayed in list, not functional)
  shortcut?: string;

  // Optional category (shows as badge, searchable)
  category?: string;

  // Function to execute when command is selected
  // Can be sync or async
  onExecute: () => void | Promise<void>;
}
```

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+K` / `Cmd+K` | Toggle command palette |
| `↑` / `↓` | Navigate commands |
| `Enter` | Execute selected command |
| `Esc` | Close palette |

## Styling & Design

The component uses DSG dark theme tokens:

- **Background**: `#0B0B0F` (deep dark)
- **Accent**: `#F7DC78` (gold)
- **Text**: `#F8FAFC` (light)
- **Muted**: `#AAB3C5` (gray)
- **Borders**: `rgba(247,220,120,0.16)` (gold with transparency)

All styling is built with Tailwind CSS and matches existing DSG ONE components.

## Best Practices

1. **Use Unique IDs**: Always use unique command IDs to avoid conflicts
2. **Register on Page Load**: Use `useCommands()` to auto-register/unregister commands
3. **Handle Async**: Commands can be async; errors are logged to console
4. **Keep It Fast**: Use lightweight operations or defer heavy work
5. **Provide Descriptions**: Help users understand what each command does
6. **Use Categories**: Organize commands by feature/module
7. **Add Icons**: Make commands visually distinct

## Example: Complete Setup

```tsx
'use client';

import { useCommands, type Command } from '@/components/ui';

export function ControlPanelPage() {
  const commands: Command[] = [
    // Navigation commands
    {
      id: 'nav-dashboard',
      name: 'Go to Dashboard',
      description: 'Navigate to main dashboard',
      icon: '📊',
      category: 'Navigation',
      onExecute: () => (window.location.href = '/dashboard'),
    },
    {
      id: 'nav-settings',
      name: 'Go to Settings',
      description: 'Navigate to settings page',
      icon: '⚙️',
      category: 'Navigation',
      onExecute: () => (window.location.href = '/settings'),
    },

    // Action commands
    {
      id: 'action-export',
      name: 'Export Data',
      description: 'Export current data as CSV',
      icon: '📥',
      shortcut: 'Ctrl+E',
      category: 'Actions',
      onExecute: async () => {
        // Export logic
        console.log('Exporting...');
      },
    },
    {
      id: 'action-refresh',
      name: 'Refresh',
      description: 'Reload all data',
      icon: '🔄',
      shortcut: 'Ctrl+R',
      category: 'Actions',
      onExecute: () => window.location.reload(),
    },
  ];

  useCommands(commands);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Control Panel</h1>
      <p className="text-gray-400 mt-2">Press Ctrl+K to open command palette</p>
    </div>
  );
}
```

## File Location

- **Component**: `/components/ui/CommandPalette.tsx`
- **Exports**: `components/ui/index.ts`

## TypeScript Support

The component is fully typed with:
- `Command` interface
- `useCommands(commands: Command[])` hook
- `useCommandPalette()` hook return type
- `useCommandRegistry()` for advanced usage

All hooks are exported from `components/ui`.
