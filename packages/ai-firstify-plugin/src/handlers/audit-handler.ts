import type { Context } from 'hono';
import { getSupabaseClient } from '../lib/supabase-client';
import type { AuditLog } from '../lib/types';

export async function logAuditEvent(c: Context) {
  try {
    const supabase = getSupabaseClient();
    const body = (await c.req.json()) as Partial<AuditLog> & {
      orgId?: string;
      decision?: string;
      decisionReason?: string;
      proofReference?: string;
      policyId?: string;
      complianceTags?: string[];
    };

    const orgId = body.orgId || c.req.header('x-org-id');
    if (!orgId) {
      return c.json({ error: 'Organization ID is required' }, 400);
    }

    if (!body.eventType || !body.resourceType || !body.action) {
      return c.json(
        {
          error: 'Missing required fields: eventType, resourceType, action',
        },
        400
      );
    }

    const { data, error } = await supabase
      .from('ai_audit_logs')
      .insert({
        org_id: orgId,
        event_type: body.eventType,
        resource_type: body.resourceType,
        resource_id: body.resourceId || '',
        action: body.action,
        user_id: body.userId,
        actor_type: 'user',
        actor_id: body.userId,
        decision: body.decision,
        decision_reason: body.decisionReason,
        proof_reference: body.proofReference,
        policy_id: body.policyId,
        request_metadata: JSON.stringify(body.details || {}),
        execution_details: JSON.stringify(body.details || {}),
        ip_address: body.ipAddress,
        compliance_tags: body.complianceTags || [],
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return c.json({ error: 'Failed to log audit event', details: error.message }, 500);
    }

    const log: AuditLog = {
      id: data.id,
      eventType: data.event_type,
      resourceType: data.resource_type,
      resourceId: data.resource_id,
      action: data.action,
      userId: data.user_id || 'system',
      details: JSON.parse(data.execution_details as string),
      timestamp: new Date(data.created_at),
      ipAddress: data.ip_address || undefined,
    };

    return c.json(log, 201);
  } catch (error) {
    console.error('Audit logging error:', error);
    return c.json(
      {
        error: 'Failed to log audit event',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
}

export async function listAuditLogs(c: Context) {
  try {
    const supabase = getSupabaseClient();
    const orgId = c.req.header('x-org-id');

    if (!orgId) {
      return c.json({ error: 'Organization ID is required' }, 400);
    }

    const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!) : 50;
    const offset = c.req.query('offset') ? parseInt(c.req.query('offset')!) : 0;
    const eventType = c.req.query('eventType');
    const resourceType = c.req.query('resourceType');
    const resourceId = c.req.query('resourceId');

    let query = supabase
      .from('ai_audit_logs')
      .select('*', { count: 'exact' })
      .eq('org_id', orgId);

    if (eventType) {
      query = query.eq('event_type', eventType);
    }

    if (resourceType) {
      query = query.eq('resource_type', resourceType);
    }

    if (resourceId) {
      query = query.eq('resource_id', resourceId);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Supabase error:', error);
      return c.json({ error: 'Failed to list audit logs', details: error.message }, 500);
    }

    const logs: AuditLog[] = (data || []).map((row) => ({
      id: row.id,
      eventType: row.event_type,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      action: row.action,
      userId: row.user_id || 'system',
      details: JSON.parse(row.execution_details as string),
      timestamp: new Date(row.created_at),
      ipAddress: row.ip_address || undefined,
    }));

    return c.json({
      logs,
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Audit log listing error:', error);
    return c.json(
      {
        error: 'Failed to list audit logs',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
}

export async function getAuditLog(c: Context) {
  try {
    const supabase = getSupabaseClient();
    const id = c.req.param('id');
    const orgId = c.req.header('x-org-id');

    if (!id) {
      return c.json({ error: 'Audit log ID is required' }, 400);
    }

    if (!orgId) {
      return c.json({ error: 'Organization ID is required' }, 400);
    }

    const { data, error } = await supabase
      .from('ai_audit_logs')
      .select('*')
      .eq('id', id)
      .eq('org_id', orgId)
      .single();

    if (error || !data) {
      console.error('Supabase error:', error);
      return c.json({ error: 'Audit log not found' }, 404);
    }

    const log: AuditLog = {
      id: data.id,
      eventType: data.event_type,
      resourceType: data.resource_type,
      resourceId: data.resource_id,
      action: data.action,
      userId: data.user_id || 'system',
      details: JSON.parse(data.execution_details as string),
      timestamp: new Date(data.created_at),
      ipAddress: data.ip_address || undefined,
    };

    return c.json(log);
  } catch (error) {
    console.error('Audit log retrieval error:', error);
    return c.json(
      {
        error: 'Failed to retrieve audit log',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500
    );
  }
}
