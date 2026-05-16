'use client';

import { useState } from 'react';

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback for environments without clipboard API
    }
  }

  return (
    <button
      onClick={() => void handleCopy()}
      className="absolute right-3 top-3 rounded-lg border border-slate-700 bg-slate-800 px-2 py-1 text-xs font-medium text-slate-300 transition hover:border-emerald-400/40 hover:text-emerald-200"
    >
      {copied ? 'Copied ✓' : 'Copy'}
    </button>
  );
}
