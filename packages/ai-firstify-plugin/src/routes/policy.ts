import { Hono } from 'hono';
import {
  createPolicy,
  listPolicies,
  getPolicy,
  updatePolicy,
  deletePolicy,
} from '../handlers/policy-handler';

const router = new Hono();

// List all policies
router.get('/', listPolicies);

// Create new policy
router.post('/', createPolicy);

// Get policy by ID
router.get('/:id', getPolicy);

// Update policy by ID
router.put('/:id', updatePolicy);

// Delete policy by ID
router.delete('/:id', deletePolicy);

export default router;
