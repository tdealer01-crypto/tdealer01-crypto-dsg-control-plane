import type { Context } from 'hono';
import type { AuditLog } from '../lib/types';

// In-memory storage for demo purposes
const auditLogs: AuditLog[] = [];

export async function logAuditEvent(c: Context) {
  try {
    const body = (await c.req.json()) as Partial<AuditLog>;

    if (!body.eventType || !body.resourceType || !body.action) {
      return c.json(
        {
          error: 'Missing required fields: eventType, resourceType, action',
        },
        400
      );
    }

    const log: AuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      eventType: body.eventType,
      resourceType: body.resourceType,
      resourceId: body.resourceId || '',
      action: body.action,
      userId: body.userId || 'system',
      details: body.details || {},
      timestamp: new Date(),
      ipAddress: body.ipAddress,
    };

    auditLogs.push(log);

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
    const limit = c.req.query('limit') ? parseInt(c.req.query('limit')!) : 50;
    const offset = c.req.query('offset') ? parseInt(c.req.query('offset')!) : 0;
    const eventType = c.req.query('eventType');
    const resourceType = c.req.query('resourceType');

    let filtered = auditLogs;

    if (eventType) {
      filtered = filtered.filter((log) => log.eventType === eventType);
    }

    if (resourceType) {
      filtered = filtered.filter((log) => log.resourceType === resourceType);
    }

    const paginated = filtered.slice(offset, offset + limit);

    return c.json({
      logs: paginated,
      total: filtered.length,
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
    const id = c.req.param('id');
    const log = auditLogs.find((l) => l.id === id);

    if (!log) {
      return c.json({ error: 'Audit log not found' }, 404);
    }

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
