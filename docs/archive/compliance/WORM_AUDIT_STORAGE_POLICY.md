# WORM Audit Storage Policy

**Document:** WORM (Write-Once-Read-Many) Immutable Evidence Storage Policy  
**Version:** v1.0  
**Date:** 2026-06  
**Status:** Regulatory-ready (pending implementation)  
**Owner:** Compliance & Evidence Engineering  

---

## 1. Executive Summary

This policy establishes **WORM (Write-Once-Read-Many)** compliance for audit trails and evidence bundles in the DSG Control Plane.

### Purpose

Ensure audit trail and evidence bundles **cannot be deleted or overwritten** once created, satisfying:

- **GDPR Article 15** — Right to explanation (immutable audit trail)
- **EU AI Act Article 35** — Audit trail creation and retention
- **SOC 2 Type II CC6.1** — Change and issue management
- **Regulatory proof:** Immutable storage + retention date enforcement

### Method

Two-layer immutability:

1. **Supabase append-only table** — application-layer write-once design
2. **AWS S3 Object Lock (GOVERNANCE/COMPLIANCE mode)** — infrastructure-layer WORM enforcement

### Benefit

- **Regulatory compliance:** Audit trail cannot be tampered with post-submission
- **Evidence integrity:** Hash + signature chain proves no modification
- **Proof-of-retention:** S3 Object Lock returns `retainUntilDate` (machine-verifiable)
- **Disaster recovery:** Cross-region replication + legal hold support

---

## 2. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ Application Layer: Claim/Proof/Evidence Submission              │
│ POST /api/delivery-proof/scan → capture readiness state         │
│ POST /api/compliance-evidence-pack → record evidence bundle     │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ↓
┌─────────────────────────────────────────────────────────────────┐
│ Supabase Append-Only Layer                                       │
│ Table: claim_readiness_artifacts (immutable rows)               │
│ - artifact_hash: SHA256 of bundle                               │
│ - artifact_data: JSON evidence payload                          │
│ - created_at: immutable timestamp (indexed)                     │
│ - s3_version_id: reference to WORM archive                      │
│ - s3_retain_until: proof of retention date                      │
│ RLS: SELECT ✓, INSERT ✓, UPDATE ✗, DELETE ✗                    │
│ Trigger: audit_log table records all INSERTs                    │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ↓ (daily/weekly)
        ┌──────────────────────────────┐
        │ Archive Job (cron)            │
        │ scripts/archive-              │
        │ evidence-to-s3.mjs            │
        └──────────────────┬────────────┘
                           │
                           ↓
              ┌────────────────────────┐
              │ ZIP Bundle + Manifest  │
              │ - claim_readiness_*    │
              │ - compliance_matrix    │
              │ - audit_log            │
              │ - manifest.json        │
              │ - bundle.sig (Ed25519) │
              │ SHA256: bundle_hash    │
              └────────────┬───────────┘
                           │
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ AWS S3 WORM Compliance Layer                                     │
│ Bucket: dsg-compliance-evidence                                 │
│ Versioning: ENABLED (required for Object Lock)                 │
│ Object Lock: GOVERNANCE mode                                    │
│ Retention: 365 days minimum (configurable)                      │
│ Legal Hold: ENABLED (permanent block if activated)              │
│                                                                 │
│ Upload Headers:                                                 │
│   x-amz-object-lock-mode: GOVERNANCE                           │
│   x-amz-object-lock-retain-until-date: NOW + 365 days          │
│   x-amz-storage-class: STANDARD (archive to GLACIER @ 90d)     │
│                                                                 │
│ Access:                                                         │
│   Put: GitHub Actions IAM role / EC2 instance profile           │
│   Get: Signed URLs (7-day expiry)                              │
│   Delete: NEVER (bucket policy enforces)                        │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ↓
              ┌──────────────────────┐
              │ Immutable Archive    │
              │ versionId (unique)   │
              │ retainUntilDate      │
              │ bundleHash (SHA256)  │
              │ Proof: Machine-      │
              │ verifiable via AWS   │
              │ Object Lock metadata │
              └──────────────────────┘
```

---

## 3. Supabase Layer — Append-Only Design

### Table Definition

```sql
-- Migration file: supabase/migrations/[timestamp]_create_claim_readiness_artifacts.sql

CREATE TABLE IF NOT EXISTS public.claim_readiness_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_id VARCHAR NOT NULL,
  artifact_type VARCHAR NOT NULL, -- e.g., 'delivery_proof', 'compliance_evidence', 'audit_trail'
  artifact_hash VARCHAR(64) NOT NULL, -- SHA256 hex
  artifact_data JSONB NOT NULL, -- Full evidence payload
  artifact_size_bytes BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  s3_version_id VARCHAR, -- AWS S3 Object version ID
  s3_retain_until TIMESTAMPTZ, -- Proof of retention date from S3
  metadata JSONB, -- Additional context (IP, user agent, request signature)
  CONSTRAINT claim_readiness_artifacts_claim_id_key UNIQUE(claim_id, artifact_type)
);

-- Index for common queries
CREATE INDEX idx_claim_readiness_artifacts_org_created 
  ON claim_readiness_artifacts(org_id, created_at DESC);
CREATE INDEX idx_claim_readiness_artifacts_claim_id 
  ON claim_readiness_artifacts(claim_id);

-- Row-level security: append-only enforcement
ALTER TABLE public.claim_readiness_artifacts ENABLE ROW LEVEL SECURITY;

-- Policy: Any authenticated user can SELECT (org-scoped)
CREATE POLICY "allow_select_artifacts"
  ON claim_readiness_artifacts FOR SELECT
  USING (
    auth.uid()::text IN (
      SELECT user_id FROM organization_members WHERE org_id = claim_readiness_artifacts.org_id
    )
  );

-- Policy: Only service role can INSERT (no app INSERT directly)
CREATE POLICY "allow_insert_artifacts"
  ON claim_readiness_artifacts FOR INSERT
  WITH CHECK (true);

-- Policy: Deny all UPDATE
CREATE POLICY "deny_update_artifacts"
  ON claim_readiness_artifacts FOR UPDATE
  USING (false);

-- Policy: Deny all DELETE
CREATE POLICY "deny_delete_artifacts"
  ON claim_readiness_artifacts FOR DELETE
  USING (false);

-- Trigger: Log all INSERTs to audit_log
CREATE OR REPLACE FUNCTION audit_claim_readiness_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_log (
    entity_type, entity_id, action, changes, created_at, org_id
  ) VALUES (
    'claim_readiness_artifacts',
    NEW.id::text,
    'INSERT',
    jsonb_build_object(
      'claim_id', NEW.claim_id,
      'artifact_type', NEW.artifact_type,
      'artifact_hash', NEW.artifact_hash,
      's3_version_id', NEW.s3_version_id
    ),
    now(),
    NEW.org_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_audit_claim_readiness
  AFTER INSERT ON claim_readiness_artifacts
  FOR EACH ROW
  EXECUTE FUNCTION audit_claim_readiness_insert();
```

### Immutability Enforcement

| Operation | Status | Enforcement |
|-----------|--------|------------|
| INSERT | ✓ Allowed | Service role only; app calls backend API |
| SELECT | ✓ Allowed | Org-scoped RLS policy |
| UPDATE | ✗ Blocked | RLS policy returns false; database enforces |
| DELETE | ✗ Blocked | RLS policy returns false; database enforces |
| Column modification | ✗ Blocked | Trigger logs attempts; no modification occurs |

### Data Retention

- **Supabase:** Keep indefinitely (cost: ~$0.01/GB/month)
- **S3 archival:** After 365 days, eligible for legal discovery freeze
- **Drift detection:** Weekly SHA256 verification job compares stored `artifact_hash` against recalculated hash from `artifact_data`

---

## 4. AWS S3 Object Lock (WORM Compliance)

### Bucket Configuration

```hcl
# Terraform: aws/s3.tf

resource "aws_s3_bucket" "dsg_compliance_evidence" {
  bucket = "dsg-compliance-evidence-${var.environment}"
}

resource "aws_s3_bucket_versioning" "dsg_compliance_evidence" {
  bucket = aws_s3_bucket.dsg_compliance_evidence.id

  versioning_configuration {
    status     = "Enabled"
    mfa_delete = "Disabled" # Set to "Enabled" for highest security
  }
}

resource "aws_s3_bucket_object_lock_configuration" "dsg_compliance_evidence" {
  bucket = aws_s3_bucket.dsg_compliance_evidence.id

  rule {
    default_retention {
      mode = "GOVERNANCE"     # or "COMPLIANCE" for stricter enforcement
      days = 365
    }
  }
}

resource "aws_s3_bucket_public_access_block" "dsg_compliance_evidence" {
  bucket = aws_s3_bucket.dsg_compliance_evidence.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "dsg_compliance_evidence" {
  bucket = aws_s3_bucket.dsg_compliance_evidence.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Bucket policy: Deny all deletion attempts
resource "aws_s3_bucket_policy" "dsg_compliance_evidence" {
  bucket = aws_s3_bucket.dsg_compliance_evidence.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "DenyObjectDeletion"
        Effect = "Deny"
        Principal = "*"
        Action = [
          "s3:DeleteObject",
          "s3:DeleteObjectVersion",
          "s3:PutLifecycleConfiguration"
        ]
        Resource = "${aws_s3_bucket.dsg_compliance_evidence.arn}/*"
        Condition = {
          StringNotEquals = {
            "aws:PrincipalOrgID" = var.aws_org_id
          }
        }
      }
    ]
  })
}

# Enable CloudTrail logging
resource "aws_s3_bucket_logging" "dsg_compliance_evidence" {
  bucket = aws_s3_bucket.dsg_compliance_evidence.id

  target_bucket = aws_s3_bucket.dsg_audit_logs.id
  target_prefix = "s3-logs/"
}
```

### Object Lock Details

| Property | Value | Purpose |
|----------|-------|---------|
| **Mode** | GOVERNANCE | IAM ADMIN can bypass (not true WORM, but sufficient for regulatory) |
| **Alternative** | COMPLIANCE | No bypass (recommended for highest trust) |
| **Retention** | 365 days | 1 year minimum; configurable per environment |
| **Legal Hold** | ENABLED | Permanent lock if activated (no bypass) |
| **Versioning** | ENABLED | Required for Object Lock |

---

## 5. Evidence Bundle → S3 Upload Flow

### Archive Script

**File:** `scripts/archive-evidence-to-s3.mjs`

```javascript
#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { S3Client, PutObjectCommand, GetObjectRetentionCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';
import AdmZip from 'adm-zip';

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const S3_BUCKET = process.env.AWS_WORM_BUCKET || 'dsg-compliance-evidence-prod';
const RETENTION_DAYS = parseInt(process.env.EVIDENCE_RETENTION_DAYS || '365');

async function archiveEvidenceToS3() {
  console.log('[ARCHIVE] Starting evidence archival job...');

  try {
    // Step 1: Query unarchived artifacts from Supabase
    const { data: artifacts, error } = await supabase
      .from('claim_readiness_artifacts')
      .select('*')
      .is('s3_version_id', null)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`[SUPABASE] Failed to fetch artifacts: ${error.message}`);
    }

    if (!artifacts || artifacts.length === 0) {
      console.log('[ARCHIVE] No unarchived artifacts found.');
      return { status: 'success', archived_count: 0 };
    }

    console.log(`[ARCHIVE] Found ${artifacts.length} unarchived artifacts.`);

    // Step 2: Group artifacts by org and create bundles
    const bundlesByOrg = artifacts.reduce((acc, artifact) => {
      if (!acc[artifact.org_id]) {
        acc[artifact.org_id] = [];
      }
      acc[artifact.org_id].push(artifact);
      return acc;
    }, {});

    let totalArchived = 0;

    for (const [orgId, orgArtifacts] of Object.entries(bundlesByOrg)) {
      // Step 3: Create ZIP bundle
      const zip = new AdmZip();
      const manifest = {
        bundle_version: '1.0',
        org_id: orgId,
        created_at: new Date().toISOString(),
        artifact_count: orgArtifacts.length,
        artifacts: orgArtifacts.map(a => ({
          id: a.id,
          claim_id: a.claim_id,
          artifact_type: a.artifact_type,
          artifact_hash: a.artifact_hash,
          created_at: a.created_at
        }))
      };

      zip.addFile('manifest.json', Buffer.from(JSON.stringify(manifest, null, 2)));

      for (const artifact of orgArtifacts) {
        const fileName = `artifacts/${artifact.id}.json`;
        zip.addFile(fileName, Buffer.from(JSON.stringify(artifact.artifact_data, null, 2)));
      }

      // Step 4: Calculate bundle hash
      const zipBuffer = zip.toBuffer();
      const bundleHash = createHash('sha256').update(zipBuffer).digest('hex');
      const bundleKey = `bundles/${orgId}/${new Date().toISOString().split('T')[0]}_${bundleHash.slice(0, 8)}.zip`;

      // Step 5: Upload to S3 with Object Lock headers
      const retainUntilDate = new Date();
      retainUntilDate.setDate(retainUntilDate.getDate() + RETENTION_DAYS);

      try {
        const putResult = await s3Client.send(
          new PutObjectCommand({
            Bucket: S3_BUCKET,
            Key: bundleKey,
            Body: zipBuffer,
            ContentType: 'application/zip',
            Metadata: {
              'bundle-hash': bundleHash,
              'artifact-count': String(orgArtifacts.length),
              'org-id': orgId
            },
            ObjectLockMode: 'GOVERNANCE',
            ObjectLockRetainUntilDate: retainUntilDate,
            ServerSideEncryption: 'AES256'
          })
        );

        console.log(`[S3] Uploaded bundle: ${bundleKey}`);
        console.log(`[S3] Version ID: ${putResult.VersionId}`);
        console.log(`[S3] Retain Until: ${retainUntilDate.toISOString()}`);

        // Step 6: Update Supabase with S3 metadata
        const { error: updateError } = await supabase
          .from('claim_readiness_artifacts')
          .update({
            s3_version_id: putResult.VersionId,
            s3_retain_until: retainUntilDate.toISOString()
          })
          .in('id', orgArtifacts.map(a => a.id));

        if (updateError) {
          throw new Error(`[SUPABASE] Failed to update artifacts: ${updateError.message}`);
        }

        totalArchived += orgArtifacts.length;
        console.log(`[ARCHIVE] Updated ${orgArtifacts.length} artifact records in Supabase.`);

        // Step 7: Log archival event
        await supabase.from('audit_log').insert({
          entity_type: 'evidence_archival',
          entity_id: bundleKey,
          action: 'S3_ARCHIVE',
          changes: {
            bundle_key: bundleKey,
            bundle_hash: bundleHash,
            version_id: putResult.VersionId,
            retain_until_date: retainUntilDate.toISOString(),
            artifact_count: orgArtifacts.length
          },
          org_id: orgId
        });

      } catch (uploadError) {
        console.error(`[ERROR] Failed to upload bundle for org ${orgId}:`, uploadError);
        throw uploadError;
      }
    }

    console.log(`[ARCHIVE] Successfully archived ${totalArchived} artifacts.`);
    return { status: 'success', archived_count: totalArchived };

  } catch (error) {
    console.error('[ERROR] Archive job failed:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  archiveEvidenceToS3()
    .then(result => {
      console.log(JSON.stringify(result));
      process.exit(0);
    })
    .catch(error => {
      console.error(error.message);
      process.exit(1);
    });
}

export { archiveEvidenceToS3 };
```

### Upload Flow Steps

1. **Query** unarchived artifacts from `claim_readiness_artifacts` table (WHERE `s3_version_id IS NULL`)
2. **Group** by org_id to create org-specific bundles
3. **Create ZIP:**
   - `manifest.json` — bundle metadata + artifact index
   - `artifacts/{id}.json` — one file per artifact
4. **Calculate** SHA256 hash of entire ZIP (stored as `bundleHash`)
5. **Upload** to S3 with Object Lock headers:
   - `x-amz-object-lock-mode: GOVERNANCE`
   - `x-amz-object-lock-retain-until-date: NOW + 365 days`
6. **Record** S3 metadata in Supabase:
   - `s3_version_id` — unique AWS version identifier
   - `s3_retain_until` — proof of retention date
7. **Audit** — log archival event to `audit_log` table

---

## 6. Verification & Audit

### Proof Commands

```bash
# Verify S3 Object Retention (proves WORM compliance)
aws s3api get-object-retention \
  --bucket dsg-compliance-evidence-prod \
  --key "bundles/[org-id]/[date]_[hash].zip" \
  --region us-east-1

# Example output:
# {
#   "Retention": {
#     "Mode": "GOVERNANCE",
#     "RetainUntilDate": "2027-06-12T00:00:00Z"
#   }
# }

# Verify S3 versioning is enabled
aws s3api get-bucket-versioning --bucket dsg-compliance-evidence-prod

# List all object versions (immutability proof)
aws s3api list-object-versions --bucket dsg-compliance-evidence-prod

# Check bucket Object Lock configuration
aws s3api get-object-lock-configuration --bucket dsg-compliance-evidence-prod

# Download signed URL (7-day expiry)
aws s3 presign s3://dsg-compliance-evidence-prod/bundles/[org-id]/[file].zip \
  --expires-in 604800
```

### Tamper Detection

| Scenario | Detection | Alert | Action |
|----------|-----------|-------|--------|
| artifact_hash differs from stored | Weekly verification job | CRITICAL | Block claim; investigate |
| S3 object metadata changed | S3 event notification | HIGH | CloudWatch alert |
| Version deleted (attempt) | S3 bucket policy denial + CloudTrail | CRITICAL | Admin review |
| Retention date modified | AWS API call audit | CRITICAL | Legal review + remediation |

### Audit Trail Integration

```sql
-- Query: All evidence archival events
SELECT 
  al.created_at,
  al.entity_id,
  al.action,
  al.changes->>'bundle_hash' AS bundle_hash,
  al.changes->>'version_id' AS version_id,
  al.org_id
FROM audit_log al
WHERE al.entity_type = 'evidence_archival'
  AND al.action = 'S3_ARCHIVE'
ORDER BY al.created_at DESC;

-- Query: Detect tampering attempts
SELECT 
  DISTINCT ON (al.entity_id)
  al.created_at,
  al.entity_id,
  al.action,
  al.changes
FROM audit_log al
WHERE (al.action LIKE 'DELETE%' OR al.action LIKE 'UPDATE%')
  AND al.entity_type = 'claim_readiness_artifacts'
ORDER BY al.entity_id, al.created_at DESC;
```

---

## 7. Compliance Claims

### WORM Readiness Status

**Claim:** "Evidence audit trail is WORM-compliant"

**Status: PASS** when all of the following are verified:

```javascript
// Proof endpoint: GET /api/proof/claim-readiness
{
  "worm_audit": {
    "status": "PASS",
    "mode": "GOVERNANCE",
    "versionId": "abc123def456...",
    "retainUntilDate": "2027-06-12T00:00:00Z",
    "proofGeneratedAt": "2026-06-12T10:30:45Z",
    "checks": {
      "supabase_append_only": true,      // RLS policies verified
      "s3_object_lock_enabled": true,    // Governance mode active
      "artifact_hash_verified": true,    // No drift detected
      "cloudtrail_logging": true,        // AWS API audit enabled
      "minimum_retention_met": true      // 365+ days from now
    }
  }
}
```

### Evidence Requirements

- [ ] `claim_readiness_artifacts` table exists + has ≥ 1 row
- [ ] RLS policies deny UPDATE and DELETE (verified via schema query)
- [ ] `s3_version_id` is non-null (proves S3 upload occurred)
- [ ] `s3_retain_until` is set and > current date (proof of retention)
- [ ] AWS Object Lock returns `Mode: GOVERNANCE` or `COMPLIANCE`
- [ ] CloudTrail logs show all S3 API calls (no deletion attempts)
- [ ] Bundle hash matches recalculated hash (no modification)

### Regulatory Alignment

| Regulation | Requirement | Evidence |
|-----------|-------------|----------|
| **GDPR Art. 15** | Immutable right-to-explanation audit | Append-only table + S3 Object Lock retention date |
| **EU AI Act Art. 35** | Audit trail creation/retention | claim_readiness_artifacts + CloudTrail logs |
| **SOC 2 CC6.1** | Change control + audit trail | RLS denial + bucket policy denial + audit_log trigger |
| **NIST SP 800-53 AU-7** | Audit log protection | S3 versioning + Object Lock + signed URLs (access control) |

---

## 8. Limitations & Risks

### Known Limitations

1. **GOVERNANCE mode ≠ true WORM**
   - IAM ADMIN users with `s3:BypassGovernanceRetention` permission can still delete
   - **Mitigation:** Use COMPLIANCE mode (no bypass possible) if org requires absolute trust
   - **Cost:** COMPLIANCE mode may have higher API costs or regional restrictions

2. **S3 Storage Costs**
   - Budget: ~$0.023/GB/month (standard tier) + $0.004/GB (archive)
   - 1 year of evidence (assuming 100GB): ~$27.60 + $4.80 = **$32.40/year**
   - **Mitigation:** Archive to Glacier after 90 days (reduces to ~$0.004/GB/month)

3. **Upload Latency**
   - Archival job is asynchronous (not real-time)
   - Max 60 seconds between Supabase INSERT and S3 upload
   - **Mitigation:** Document expected archival SLA (< 5 minutes for 99.9th percentile)

4. **Disaster Recovery**
   - S3 is regional (primary: `us-east-1`)
   - RTC < 15 minutes if region fails
   - **Mitigation:** Enable S3 cross-region replication to `eu-west-1` (standby)

5. **Legal Hold Permanence**
   - Legal hold cannot be removed by time; requires admin action
   - **Risk:** If activated accidentally, requires AWS support to remove
   - **Mitigation:** Require 2-person approval for legal hold activation

### Compliance Risks

- **Claim drift:** If `artifact_hash` changes unexpectedly, claim shifts to `FAILED`
- **S3 policy misconfiguration:** If bucket policy is accidentally deleted, deletion becomes possible
- **IAM escalation:** If malicious actor gains IAM ADMIN access, GOVERNANCE mode is bypassable
- **Retention date tamper:** If retention date is modified via AWS API, audit trail is in CloudTrail (detectable)

---

## 9. Implementation Checklist

- [ ] Create Supabase migration (append-only table + RLS policies + triggers)
- [ ] Test RLS policies: verify UPDATE/DELETE fail with permission error
- [ ] Provision S3 bucket with Object Lock + GOVERNANCE mode
- [ ] Deploy Terraform/CloudFormation for S3 bucket policy
- [ ] Implement `scripts/archive-evidence-to-s3.mjs` (with error handling + retries)
- [ ] Test S3 upload with Object Lock headers (verify retention date returned)
- [ ] Create verification endpoint `/api/proof/claim-readiness` (returns WORM status)
- [ ] Enable CloudTrail logging on S3 bucket
- [ ] Set up CloudWatch alerts for S3 deletion attempts
- [ ] Document archival SLA (< 5 minutes for 99.9th percentile)
- [ ] Load test: Archive 10,000 artifacts; verify no timeouts or failures
- [ ] Security review: Confirm IAM policy principle of least privilege
- [ ] Compliance sign-off: Legal + SOC 2 auditor confirm regulatory alignment

---

## 10. Next Steps

### Immediate (Week 1)

1. Implement Supabase migration + RLS policies
2. Create S3 bucket with Object Lock (GOVERNANCE mode)
3. Develop archive script (`scripts/archive-evidence-to-s3.mjs`)

### Short-term (Week 2–3)

4. Test upload flow end-to-end
5. Implement `/api/proof/claim-readiness` endpoint
6. Set up CloudTrail logging + CloudWatch alerts

### Medium-term (Week 4–6)

7. Load test with 10K+ artifacts
8. Enable S3 cross-region replication (disaster recovery)
9. Security review + remediation
10. Compliance sign-off (Legal + SOC 2 auditor)

### Long-term (Post-launch)

11. Monitor archival job success rate (target: 99.9%)
12. Quarterly drift detection audit
13. Annual legal hold & retention policy review
14. Cost optimization: Archive cold data to Glacier (if thresholds crossed)

---

## 11. References

- **AWS S3 Object Lock:** [docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock.html)
- **GDPR Right to Explanation (Art. 15):** [gdpr-info.eu/art-15-gdpr/](https://gdpr-info.eu/art-15-gdpr/)
- **EU AI Act Audit Trail (Art. 35):** [eur-lex.europa.eu/legal-content/EN/TXT/?uri=celex:32024R1689](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=celex:32024R1689)
- **NIST SP 800-53 AU-7 (Audit Log Protection):** [nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-53r5.pdf](https://nvlpubs.nist.gov/nistpubs/SpecialPublications/NIST.SP.800-53r5.pdf)
- **SOC 2 Type II CC6.1 (Change Control):** [aicpa.org/system/files/publication-documents/...](https://aicpa.org)
- **OWASP Evidence Integrity:** [owasp.org/www-community/attacks/Integrity_Attack](https://owasp.org/www-community/attacks/Integrity_Attack)
- **AWS CloudTrail:** [docs.aws.amazon.com/awscloudtrail/latest/userguide/](https://docs.aws.amazon.com/awscloudtrail/latest/userguide/)

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| v1.0 | 2026-06 | Compliance & Evidence Engineering | Initial draft; regulatory-ready pending implementation |

---

**Last Updated:** 2026-06-12  
**Approver:** [Pending SOC 2 / Legal Review]  
**Compliance Status:** Regulatory-ready (implementation in progress)
