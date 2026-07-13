import { Hono } from 'hono';
import {
  logAuditEvent,
  listAuditLogs,
  getAuditLog,
} from '../handlers/audit-handler';

const router = new Hono();

// List audit logs
router.get('/', listAuditLogs);

// Log audit event
router.post('/', logAuditEvent);

// Get audit log by ID
router.get('/:id', getAuditLog);

export default router;
