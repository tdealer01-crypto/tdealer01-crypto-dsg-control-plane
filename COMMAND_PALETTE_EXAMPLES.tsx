/**
 * CommandPalette Integration Examples
 * Real-world usage patterns for the command palette component
 */

import { useCommands, useCommandPalette, type Command } from '@/components/ui';
import { useRouter } from 'next/navigation';
import { useCallback } from 'react';

/**
 * Example 1: Dashboard with Navigation Commands
 */
export function DashboardWithCommands() {
  const router = useRouter();

  const navigationCommands: Command[] = [
    {
      id: 'nav-home',
      name: 'Home',
      description: 'Go to dashboard home',
      icon: '🏠',
      category: 'Navigation',
      shortcut: 'Ctrl+H',
      onExecute: () => router.push('/dashboard'),
    },
    {
      id: 'nav-analytics',
      name: 'Analytics',
      description: 'View analytics and reports',
      icon: '📊',
      category: 'Navigation',
      shortcut: 'Ctrl+A',
      onExecute: () => router.push('/dashboard/analytics'),
    },
    {
      id: 'nav-settings',
      name: 'Settings',
      description: 'Application settings',
      icon: '⚙️',
      category: 'Navigation',
      shortcut: 'Ctrl+,',
      onExecute: () => router.push('/settings'),
    },
  ];

  useCommands(navigationCommands);

  return (
    <div className="p-8">
      <h1>Dashboard</h1>
      <p className="text-gray-400">Press Ctrl+K to open command palette</p>
    </div>
  );
}

/**
 * Example 2: Data Management Commands
 */
export function DataManagementPage() {
  const handleExport = useCallback(async () => {
    // Simulate export
    const data = JSON.stringify({ example: 'data' });
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target?.result as string);
            console.log('Imported data:', data);
            // Process imported data
          } catch (error) {
            console.error('Import failed:', error);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, []);

  const dataCommands: Command[] = [
    {
      id: 'data-export',
      name: 'Export Data',
      description: 'Export all data as JSON',
      icon: '📥',
      category: 'Data',
      shortcut: 'Ctrl+E',
      onExecute: handleExport,
    },
    {
      id: 'data-import',
      name: 'Import Data',
      description: 'Import data from JSON file',
      icon: '📤',
      category: 'Data',
      shortcut: 'Ctrl+I',
      onExecute: handleImport,
    },
    {
      id: 'data-clear',
      name: 'Clear All Data',
      description: 'Remove all data (cannot undo)',
      icon: '🗑️',
      category: 'Data',
      onExecute: async () => {
        if (confirm('Are you sure? This cannot be undone.')) {
          console.log('Clearing data...');
          // Clear data logic
        }
      },
    },
  ];

  useCommands(dataCommands);

  return (
    <div className="p-8">
      <h1>Data Management</h1>
    </div>
  );
}

/**
 * Example 3: User Settings & Profile Commands
 */
export function SettingsPage() {
  const handleThemeToggle = useCallback(() => {
    const isDark = document.documentElement.classList.contains('dark');
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    }
  }, []);

  const handleLogout = useCallback(() => {
    // Call logout API
    console.log('Logging out...');
    window.location.href = '/logout';
  }, []);

  const settingsCommands: Command[] = [
    {
      id: 'settings-theme',
      name: 'Toggle Theme',
      description: 'Switch between light and dark mode',
      icon: '🌙',
      category: 'Settings',
      shortcut: 'Ctrl+T',
      onExecute: handleThemeToggle,
    },
    {
      id: 'settings-profile',
      name: 'Edit Profile',
      description: 'Update your profile information',
      icon: '👤',
      category: 'Settings',
      onExecute: () => {
        // Navigate to profile edit
        console.log('Opening profile editor');
      },
    },
    {
      id: 'settings-notifications',
      name: 'Notification Settings',
      description: 'Configure notification preferences',
      icon: '🔔',
      category: 'Settings',
      onExecute: () => {
        console.log('Opening notification settings');
      },
    },
    {
      id: 'user-logout',
      name: 'Logout',
      description: 'Sign out of your account',
      icon: '🚪',
      category: 'User',
      shortcut: 'Ctrl+L',
      onExecute: handleLogout,
    },
  ];

  useCommands(settingsCommands);

  return (
    <div className="p-8">
      <h1>Settings</h1>
    </div>
  );
}

/**
 * Example 4: Documentation & Help Commands
 */
export function HelpCenter() {
  const handleOpenDocs = useCallback(() => {
    window.open('/docs', '_blank');
  }, []);

  const handleOpenAPI = useCallback(() => {
    window.open('/api/docs', '_blank');
  }, []);

  const helpCommands: Command[] = [
    {
      id: 'help-docs',
      name: 'Documentation',
      description: 'Read the full documentation',
      icon: '📚',
      category: 'Help',
      onExecute: handleOpenDocs,
    },
    {
      id: 'help-api',
      name: 'API Reference',
      description: 'View API documentation',
      icon: '🔧',
      category: 'Help',
      onExecute: handleOpenAPI,
    },
    {
      id: 'help-support',
      name: 'Contact Support',
      description: 'Get help from our support team',
      icon: '💬',
      category: 'Help',
      onExecute: () => {
        window.location.href = 'mailto:support@example.com';
      },
    },
  ];

  useCommands(helpCommands);

  return (
    <div className="p-8">
      <h1>Help Center</h1>
    </div>
  );
}

/**
 * Example 5: Complex Multi-Page Application
 * Shows how to organize commands across multiple pages
 */
export function AppRoot() {
  const router = useRouter();
  const { isOpen, close } = useCommandPalette();

  // Global commands available everywhere
  const globalCommands: Command[] = [
    {
      id: 'search',
      name: 'Search',
      description: 'Open global search',
      icon: '🔍',
      category: 'Global',
      shortcut: 'Ctrl+/',
      onExecute: () => {
        console.log('Opening search...');
      },
    },
    {
      id: 'command-help',
      name: 'Command Help',
      description: 'Show keyboard shortcuts',
      icon: '❓',
      category: 'Global',
      shortcut: '?',
      onExecute: () => {
        window.open('/help/commands', '_blank');
      },
    },
  ];

  useCommands(globalCommands);

  return (
    <div>
      {/* Your app content */}
      <p>Press Ctrl+K for command palette</p>
    </div>
  );
}

/**
 * Example 6: Conditional Commands Based on User Role
 */
import { useEffect, useState } from 'react';

export function RoleBasedCommands() {
  const [userRole, setUserRole] = useState<'admin' | 'user'>('user');

  const adminCommands: Command[] = [
    {
      id: 'admin-users',
      name: 'Manage Users',
      description: 'View and manage all users',
      icon: '👥',
      category: 'Admin',
      onExecute: () => window.location.href = '/admin/users',
    },
    {
      id: 'admin-logs',
      name: 'View Logs',
      description: 'View system logs',
      icon: '📋',
      category: 'Admin',
      onExecute: () => window.location.href = '/admin/logs',
    },
  ];

  const userCommands: Command[] = [
    {
      id: 'user-profile',
      name: 'My Profile',
      description: 'View your profile',
      icon: '👤',
      category: 'User',
      onExecute: () => window.location.href = '/profile',
    },
  ];

  const commands = userRole === 'admin' ? adminCommands : userCommands;
  useCommands(commands);

  return (
    <div className="p-8">
      <h1>Role-Based Commands Example</h1>
      <p>Current role: {userRole}</p>
      <button onClick={() => setUserRole(userRole === 'admin' ? 'user' : 'admin')}>
        Toggle Role
      </button>
    </div>
  );
}

/**
 * Layout integration example
 */
export function RootLayout({ children }: { children: React.ReactNode }) {
  const { isOpen, close } = useCommandPalette();

  return (
    <html>
      <body>
        {children}

        {/* Import CommandPalette from @/components/ui */}
        {/* <CommandPalette isOpen={isOpen} onClose={close} /> */}
      </body>
    </html>
  );
}
