'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/Skeleton';

type ProofItem = {
  id: string;
  execution_id: string;
  decision: string;
  reason: string;
  proof_hash: string | null;
  proof_type: string;
  stability_score: number | null;
  created_at: string;
};

function formatDate(value?: string | null) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function ProofsPage() {
  const [items, setItems] = useState<ProofItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetch('/api/proofs?limit=20', { cache: 'no-store' })
      .then((res) => res.json().then((json) => ({ ok: res.ok, json })))
      .then(({ ok, json }) => {
        if (!alive) return;
        if (!ok) throw new Error(json.error || 'Failed to load proofs');
        setItems(json.items || []);
      })
      .catch((err) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : 'Failed to load proofs');
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <main className="min-h-screen bg-slate-950">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <PageHeader
          title="พิสูจน์"
          description="การตัดสินใจ DSG ล่าสุดพร้อมแฮชพิสูจน์และสัญญาณเสถียรภาพ"
        />

        {error ? (
          <Card variant="error" className="mb-6">{error}</Card>
        ) : null}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="ไม่มีพิสูจน์"
            description="ไม่พบการตัดสินใจที่มีพิสูจน์"
          />
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <Card key={item.id} variant="default">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-white">{item.decision}</p>
                    <p className="mt-1 text-sm text-gray-400">
                      {item.execution_id}
                    </p>
                  </div>
                  <Badge variant="info">{item.proof_type}</Badge>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-gray-300">
                  <p>เหตุผล: {item.reason}</p>
                  <p>แฮชพิสูจน์: {item.proof_hash || '-'}</p>
                  <p>เสถียรภาพ: {item.stability_score ?? '-'}</p>
                  <p>สร้างเมื่อ: {formatDate(item.created_at)}</p>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
