'use client';

import React, { useState } from 'react';

interface Tab {
  key: string;
  label: string;
  content: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  className?: string;
}

export function Tabs({ tabs, defaultTab, className = '' }: TabsProps) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.key);
  const current = tabs.find(t => t.key === active);

  return (
    <div className={className}>
      <div className="flex gap-0 border-b border-[rgba(247,220,120,0.12)]">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActive(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              active === tab.key
                ? 'border-[#D4AF37] text-[#F7DC78]'
                : 'border-transparent text-[#AAB3C5] hover:text-[#F8FAFC]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="pt-4">{current?.content}</div>
    </div>
  );
}
