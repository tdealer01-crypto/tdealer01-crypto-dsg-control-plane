import { NextResponse } from 'next/server';
import { requireRuntimeAccess } from '../../../../lib/authz-runtime';
import { fetchAuditLogsForExport } from '../../../../lib/security/audit-export';
import { internalErrorMessage, logApiError } from '../../../../lib/security/api-error';

export const dynamic = 'force-dynamic';

const MAX_LIMIT = 1000;
const DEFAULT_LIMIT = 100;

function clampLimit(value: string | null) {
  const parsed = Number(value || DEFAULT_LIMIT);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_LIMIT;
  return Math.min(Math.floor(parsed), MAX_LIMIT);
}

function maskSecrets(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(maskSecrets);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const output: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    const normalized = key.toLowerCase();
    if (
      normalized.includes('secret') ||
      normalized.includes('token') ||
      normalized.includes('api_key') ||
      normalized.includes('apikey') ||
      normalized.includes('password') ||
      normalized.includes('authorization')
    ) {
      output[key] = '[redacted]';
      continue;
    }
    output[key] = maskSecrets(item);
  }
  return output;
}

function csvEscape(value: unknown) {
  const text = typeof value === 'string' ? value : JSON.stringify(value ?? '');
  return `"${String(text).replace(/"/g, '""')}"`;
}

function toCsv(rows: Array<Record<string, unknown>>) {
  const headers = ['id', 'execution_id', 'decision', 'reason', 'evidence', 'created_at'];
  const lines = [headers.join(',')];

  for (const row of rows) {
    lines.push(headers.map((header) => csvEscape(row[header])).join(','));
  }

  return `${lines.join('\n')}\n`;
}

function exportFileName(format: string) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `dsg-audit-export-${stamp}.${format}`;
}

export async function GET(request: Request) {
  try {
    const access = await requireRuntimeAccess(request, 'monitor');
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const url = new URL(request.url);
    const format = String(url.searchParams.get('format') || 'json').toLowerCase();
    const limit = clampLimit(url.searchParams.get('limit'));

    if (!['json', 'csv'].includes(format)) {
      return NextResponse.json({ error: 'format must be json or csv' }, { status: 400 });
    }

    const result = await fetchAuditLogsForExport(access.orgId, limit);
    if (!result.ok) {
      const reason = 'reason' in result ? result.reason : 'query-error';
      const status = reason === 'relation-missing' ? 503 : 500;
      return NextResponse.json({ ok: false, error: reason }, { status });
    }

    const rows = maskSecrets(result.rows) as Array<Record<string, unknown>>;

    if (format === 'csv') {
      return new Response(toCsv(rows), {
        headers: {
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition': `attachment; filename="${exportFileName('csv')}"`,
          'cache-control': 'no-store',
        },
      });
    }

    return NextResponse.json(
      {
        ok: true,
        format: 'json',
        org_id: access.orgId,
        actor_type: access.actorType,
        exported_at: new Date().toISOString(),
        limit,
        count: rows.length,
        rows,
      },
      {
        headers: {
          'cache-control': 'no-store',
          'content-disposition': `attachment; filename="${exportFileName('json')}"`,
        },
      },
    );
  } catch (error) {
    logApiError('api/audit/export', error, { stage: 'unhandled' });
    return NextResponse.json({ error: internalErrorMessage() }, { status: 500 });
  }
}
