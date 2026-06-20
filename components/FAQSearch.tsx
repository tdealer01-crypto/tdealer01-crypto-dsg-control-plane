'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/Input';

interface FAQEntry {
  id: string;
  question: string;
  answer: string;
  category: string;
  created_at: string;
}

interface FAQSearchProps {
  isAdmin?: boolean;
  onEdit?: (entry: FAQEntry) => void;
  onDelete?: (id: string) => void;
}

export function FAQSearch({ isAdmin = false, onEdit, onDelete }: FAQSearchProps) {
  const [entries, setEntries] = useState<FAQEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<FAQEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const categories = [
    'all',
    'general',
    'billing',
    'account',
    'technical',
    'shipping',
    'returns',
  ];

  useEffect(() => {
    fetchFAQ();
  }, []);

  useEffect(() => {
    filterEntries();
  }, [searchQuery, selectedCategory, entries]);

  const fetchFAQ = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/support/faq');
      if (!response.ok) throw new Error('Failed to fetch FAQ');
      const data = await response.json();
      setEntries(data.entries || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load FAQ');
    } finally {
      setIsLoading(false);
    }
  };

  const filterEntries = () => {
    let filtered = entries;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter((e) => e.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (e) =>
          e.question.toLowerCase().includes(query) ||
          e.answer.toLowerCase().includes(query)
      );
    }

    setFilteredEntries(filtered);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this FAQ entry?')) return;

    try {
      const response = await fetch(`/api/support/faq/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete');
      setEntries(entries.filter((e) => e.id !== id));
      if (onDelete) onDelete(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading FAQ...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="space-y-4">
        <Input
          label="Search FAQ"
          type="text"
          placeholder="Type to search questions and answers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />

        {/* Category Filter */}
        <div>
          <label className="text-xs font-semibold uppercase tracking-widest text-[#AAB3C5]">
            Category
          </label>
          <div className="mt-2 flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedCategory === cat
                    ? 'bg-[#F7DC78] text-[#050507]'
                    : 'border border-[rgba(247,220,120,0.16)] text-[#AAB3C5] hover:border-[rgba(247,220,120,0.35)]'
                }`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-[rgba(225,6,0,0.15)] border border-[rgba(225,6,0,0.35)] text-red-200">
          {error}
        </div>
      )}

      {/* Results */}
      {filteredEntries.length === 0 ? (
        <div className="text-center py-8 text-[#AAB3C5]">
          {searchQuery || selectedCategory !== 'all'
            ? 'No FAQ entries found matching your search.'
            : 'No FAQ entries yet.'}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEntries.map((entry) => (
            <div key={entry.id} className="rounded-lg border border-[rgba(247,220,120,0.16)] bg-[#14151C] overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                className="w-full px-6 py-4 text-left flex items-start justify-between gap-4 hover:bg-[rgba(247,220,120,0.05)] transition-colors"
              >
                <div className="flex-1">
                  <h3 className="font-semibold text-[#F8FAFC]">{entry.question}</h3>
                  <p className="mt-1 text-xs text-[#AAB3C5]">{entry.category}</p>
                </div>
                <svg
                  className={`w-5 h-5 text-[#AAB3C5] transition-transform ${
                    expandedId === entry.id ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </button>

              {expandedId === entry.id && (
                <>
                  <div className="px-6 py-4 border-t border-[rgba(247,220,120,0.16)] bg-[rgba(255,255,255,0.02)]">
                    <p className="text-sm text-[#AAB3C5] leading-relaxed">{entry.answer}</p>
                  </div>
                  {isAdmin && (
                    <div className="px-6 py-3 border-t border-[rgba(247,220,120,0.16)] flex gap-2">
                      <button
                        onClick={() => onEdit?.(entry)}
                        className="text-sm px-3 py-1.5 rounded bg-[rgba(51,209,122,0.15)] text-emerald-300 hover:bg-[rgba(51,209,122,0.25)]"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="text-sm px-3 py-1.5 rounded bg-[rgba(225,6,0,0.15)] text-red-300 hover:bg-[rgba(225,6,0,0.25)]"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
