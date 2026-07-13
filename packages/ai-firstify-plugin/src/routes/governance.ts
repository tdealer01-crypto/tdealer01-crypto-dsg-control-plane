import { Hono } from 'hono';
import {
  handleGovernanceRequest,
  handlePolicyManifest,
} from '../handlers/governance-handler';

const router = new Hono();

// Evaluate governance decision for AI model
router.post('/evaluate', handleGovernanceRequest);

// Get current policy manifest
router.get('/manifest', handlePolicyManifest);

export default router;
