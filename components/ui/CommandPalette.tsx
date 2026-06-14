'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Input } from './Input';
import { Badge } from './Badge';

/**
 * Represents a command that can be executed through the command palette
 */
export interface Command {
  id: string;
  name: string;
  description?: string;
  icon?: React.ReactNode;
  shortcut?: string;
  onExecute: () => void | Promise<void>;
  category?: string;
}

/**
 * Global command registry and state manager
 */
class CommandRegistry {
  private commands: Map<string, Command> = new Map();
  private listeners: Set<() => void> = new Set();
  private lastUsedCommands: string[] = [];

  register(command: Command) {
    this.commands.set(command.id, command);
    this.notifyListeners();
  }

  unregister(id: string) {
    this.commands.delete(id);
    this.notifyListeners();
  }

  getCommands(): Command[] {
    return Array.from(this.commands.values());
  }

  getCommand(id: string): Command | undefined {
    return this.commands.get(id);
  }

  recordUsage(commandId: string) {
    this.lastUsedCommands = [
      commandId,
      ...this.lastUsedCommands.filter((id) => id !== commandId),
    ].slice(0, 5);
    this.notifyListeners();
  }

  getLastUsedCommands(): Command[] {
    return this.lastUsedCommands
      .map((id) => this.commands.get(id))
      .filter((cmd): cmd is Command => !!cmd);
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener());
  }
}

// Global singleton instance
const globalCommandRegistry = new CommandRegistry();

/**
 * Hook to register and manage commands
 */
export function useCommands(commands: Command[]): void {
  useEffect(() => {
    commands.forEach((cmd) => globalCommandRegistry.register(cmd));

    return () => {
      commands.forEach((cmd) => globalCommandRegistry.unregister(cmd.id));
    };
  }, [commands]);
}

/**
 * Fuzzy search algorithm
 */
function fuzzySearch(query: string, text: string): number {
  const lowerQuery = query.toLowerCase();
  const lowerText = text.toLowerCase();

  if (!query) return 0;
  if (lowerText.includes(lowerQuery)) return 100; // Exact substring match

  let queryIdx = 0;
  let score = 0;
  let matchStreak = 0;

  for (let i = 0; i < lowerText.length && queryIdx < lowerQuery.length; i++) {
    if (lowerText[i] === lowerQuery[queryIdx]) {
      queryIdx++;
      score += 10 + matchStreak;
      matchStreak += 2;
    } else {
      matchStreak = 0;
    }
  }

  return queryIdx === lowerQuery.length ? score : 0;
}

/**
 * Ranks a command based on search query
 */
function rankCommand(command: Command, query: string): number {
  if (!query) return 0;

  const nameScore = fuzzySearch(query, command.name) * 2;
  const descScore = fuzzySearch(query, command.description || '');
  const categoryScore = fuzzySearch(query, command.category || '');

  return nameScore + descScore + categoryScore;
}

/**
 * CommandPalette component
 */
interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [commands, setCommands] = useState<Command[]>([]);
  const [filteredCommands, setFilteredCommands] = useState<Command[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLDivElement>(null);

  // Subscribe to command registry changes
  useEffect(() => {
    const handleUpdate = () => {
      const lastUsed = globalCommandRegistry.getLastUsedCommands();
      const allCommands = globalCommandRegistry.getCommands();

      // Show last used commands first if no search query
      if (!searchQuery) {
        const unused = allCommands.filter((cmd) => !lastUsed.find((u) => u.id === cmd.id));
        setCommands([...lastUsed, ...unused]);
      } else {
        setCommands(allCommands);
      }
    };

    const unsubscribe = globalCommandRegistry.subscribe(handleUpdate);
    handleUpdate();

    return unsubscribe;
  }, [searchQuery]);

  // Filter and sort commands based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredCommands(commands);
      setSelectedIndex(0);
      return;
    }

    const scored = commands
      .map((cmd) => ({
        command: cmd,
        score: rankCommand(cmd, searchQuery),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    setFilteredCommands(scored.map((item) => item.command));
    setSelectedIndex(0);
  }, [searchQuery, commands]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  // Scroll selected item into view
  useEffect(() => {
    selectedItemRef.current?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => (prev + 1) % filteredCommands.length || 0);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev === 0 ? Math.max(filteredCommands.length - 1, 0) : prev - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            executeCommand(filteredCommands[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    },
    [filteredCommands, selectedIndex, onClose]
  );

  const executeCommand = async (command: Command) => {
    try {
      globalCommandRegistry.recordUsage(command.id);
      await command.onExecute();
      onClose();
      setSearchQuery('');
    } catch (error) {
      console.error(`Error executing command ${command.id}:`, error);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm pt-12"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={containerRef}
        className="w-[90%] max-w-2xl max-h-[60vh] flex flex-col rounded-2xl border border-[rgba(247,220,120,0.16)] bg-[#0B0B0F] shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[rgba(247,220,120,0.10)]">
          <Input
            ref={inputRef}
            placeholder="Search commands... (Press Esc to close)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            leftIcon={<span className="text-[#F7DC78]">⌘</span>}
            className="bg-[rgba(255,255,255,0.02)] text-lg"
          />
        </div>

        {/* Commands List */}
        <div className="flex-1 overflow-y-auto">
          {filteredCommands.length === 0 ? (
            <div className="flex items-center justify-center h-full p-8">
              <div className="text-center">
                <p className="text-[#AAB3C5] mb-2">No commands found</p>
                <p className="text-sm text-[#AAB3C5]/60">
                  Try a different search term
                </p>
              </div>
            </div>
          ) : (
            filteredCommands.map((command, index) => (
              <div
                key={command.id}
                ref={index === selectedIndex ? selectedItemRef : null}
                onClick={() => executeCommand(command)}
                className={`px-6 py-3 cursor-pointer transition-colors border-b border-[rgba(247,220,120,0.05)] ${
                  index === selectedIndex
                    ? 'bg-[rgba(247,220,120,0.12)] border-l-4 border-l-[#F7DC78]'
                    : 'hover:bg-[rgba(247,220,120,0.06)]'
                }`}
              >
                <div className="flex items-center gap-3">
                  {command.icon && (
                    <span className="text-xl text-[#F7DC78]">{command.icon}</span>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-[#F8FAFC] truncate">
                        {command.name}
                      </h3>
                      {command.category && (
                        <Badge variant="info" className="text-xs py-0.5 px-1.5">
                          {command.category}
                        </Badge>
                      )}
                    </div>
                    {command.description && (
                      <p className="text-xs text-[#AAB3C5]/70 truncate">
                        {command.description}
                      </p>
                    )}
                  </div>
                  {command.shortcut && (
                    <kbd className="hidden md:flex items-center gap-1 px-2 py-1 rounded border border-[rgba(247,220,120,0.16)] bg-[rgba(247,220,120,0.04)] text-xs text-[#F7DC78] whitespace-nowrap">
                      {command.shortcut}
                    </kbd>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Hint */}
        {filteredCommands.length > 0 && (
          <div className="px-6 py-3 border-t border-[rgba(247,220,120,0.10)] bg-[rgba(0,0,0,0.3)] flex items-center justify-between text-xs text-[#AAB3C5]">
            <div className="flex gap-4">
              <span>
                <span className="text-[#F7DC78]">↑↓</span> Navigate
              </span>
              <span>
                <span className="text-[#F7DC78]">Enter</span> Execute
              </span>
              <span>
                <span className="text-[#F7DC78]">Esc</span> Close
              </span>
            </div>
            <span className="text-[#AAB3C5]/50">
              {selectedIndex + 1} of {filteredCommands.length}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Hook to control the command palette
 */
export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen((prev) => !prev),
  };
}

/**
 * Hook to get command registry for advanced usage
 */
export function useCommandRegistry() {
  return globalCommandRegistry;
}
