// Integration points between lead lifecycle and email sequences
// This module bridges lead discovery, trial tracking, and sequence automation

import { triggerSequenceForLead } from './sequences';

type Lead = any;

// Call this after a lead is discovered
export async function onLeadDiscovered(lead: Lead) {
  try {
    await triggerSequenceForLead({
      leadId: lead.id,
      event: 'lead_discovered',
      lead,
    });
  } catch (err) {
    console.error('[Email Integration] Failed to trigger sequence for discovered lead:', err);
    // Don't throw - sequence trigger failure shouldn't block lead save
  }
}

// Call this after a trial starts for a lead
export async function onTrialStarted(lead: Lead) {
  try {
    await triggerSequenceForLead({
      leadId: lead.id,
      event: 'trial_started',
      lead,
    });
  } catch (err) {
    console.error('[Email Integration] Failed to trigger sequence for trial start:', err);
  }
}

// Call this after a lead's ICP score is updated
export async function onICPScoreUpdated(lead: Lead, previousScore: number | null) {
  try {
    // Trigger if score crossed into "high priority" threshold
    if (lead.icp_score && (!previousScore || previousScore < 75) && lead.icp_score >= 75) {
      await triggerSequenceForLead({
        leadId: lead.id,
        event: 'high_icp_score',
        lead,
      });
    }
  } catch (err) {
    console.error('[Email Integration] Failed to trigger sequence for high ICP score:', err);
  }
}
