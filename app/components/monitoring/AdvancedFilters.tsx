'use client';

import { useState } from 'react';
import { Filter, X } from 'lucide-react';

export interface FilterConfig {
  severity?: 'low' | 'medium' | 'high';
  status?: 'new' | 'acknowledged' | 'resolved';
  alertType?: string;
  dateRange?: {
    startDate: string;
    endDate: string;
  };
  searchText?: string;
}

interface AdvancedFiltersProps {
  onFiltersChange: (filters: FilterConfig) => void;
  availableTypes?: string[];
}

export function AdvancedFilters({
  onFiltersChange,
  availableTypes = [
    'budget_daily',
    'budget_monthly',
    'budget_warning',
    'execution_failed',
    'tool_approval_failed',
  ],
}: AdvancedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [filters, setFilters] = useState<FilterConfig>({});
  const [activeFilterCount, setActiveFilterCount] = useState(0);

  const updateFilter = (key: keyof FilterConfig, value: any) => {
    const newFilters: FilterConfig = { ...filters };

    if (value === null || value === undefined || value === '') {
      delete newFilters[key];
    } else {
      (newFilters as any)[key] = value;
    }

    setFilters(newFilters);

    const count = Object.keys(newFilters).length;
    setActiveFilterCount(count);

    onFiltersChange(newFilters);
  };

  const clearAllFilters = () => {
    setFilters({});
    setActiveFilterCount(0);
    onFiltersChange({});
  };

  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
      >
        <Filter className="w-4 h-4" />
        Filters
        {activeFilterCount > 0 && (
          <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-semibold text-white bg-blue-600 rounded-full">
            {activeFilterCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 p-4 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm">Advanced Filters</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Search */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Search Text
              </label>
              <input
                type="text"
                placeholder="Search title or message..."
                value={filters.searchText || ''}
                onChange={(e) => updateFilter('searchText', e.target.value || null)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={filters.status || ''}
                onChange={(e) => updateFilter('status', e.target.value || null)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="new">New</option>
                <option value="acknowledged">Acknowledged</option>
                <option value="resolved">Resolved</option>
              </select>
            </div>

            {/* Severity */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Severity
              </label>
              <select
                value={filters.severity || ''}
                onChange={(e) => updateFilter('severity', e.target.value || null)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Severities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>

            {/* Alert Type */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Alert Type
              </label>
              <select
                value={filters.alertType || ''}
                onChange={(e) => updateFilter('alertType', e.target.value || null)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                {availableTypes.map((type) => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Date Range
              </label>
              <div className="space-y-2">
                <div>
                  <label className="text-xs text-gray-500">Start Date</label>
                  <input
                    type="date"
                    value={filters.dateRange?.startDate || thirtyDaysAgo}
                    onChange={(e) =>
                      updateFilter('dateRange', {
                        ...(filters.dateRange || {}),
                        startDate: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500">End Date</label>
                  <input
                    type="date"
                    value={filters.dateRange?.endDate || today}
                    onChange={(e) =>
                      updateFilter('dateRange', {
                        ...(filters.dateRange || {}),
                        endDate: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-200 flex gap-2">
            <button
              onClick={clearAllFilters}
              disabled={activeFilterCount === 0}
              className="flex-1 px-3 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Clear All
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="flex-1 px-3 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
