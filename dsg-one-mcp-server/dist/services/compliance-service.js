import axios from 'axios';
import { AuthenticationError, ValidationError } from '../utils/errors.js';
export class ComplianceService {
    constructor(config) {
        if (!config.baseUrl || !config.apiKey) {
            throw new AuthenticationError('Missing Compliance configuration');
        }
        this.client = axios.create({
            baseURL: config.baseUrl,
            headers: {
                Authorization: `Bearer ${config.apiKey}`,
            },
        });
    }
    async collectEvidence(executionId, level, metadata) {
        try {
            const { data } = await this.client.post('/api/ccvs/evidence', {
                execution_id: executionId,
                level,
                metadata,
            });
            if (data.error) {
                throw new ValidationError(data.error.message);
            }
            return {
                level: data.level,
                hash: data.evidence_hash,
                timestamp: new Date(data.timestamp),
                metadata: data.metadata || {},
            };
        }
        catch (error) {
            throw new ValidationError(`Failed to collect evidence: ${String(error)}`);
        }
    }
    async generateAuditReport(executionId, scope) {
        try {
            const { data } = await this.client.post('/api/ccvs/audit-report', {
                execution_id: executionId,
                scope,
            });
            if (data.error) {
                throw new ValidationError(data.error.message);
            }
            return {
                reportId: data.report_id,
                matrix: data.compliance_matrix,
                levels: data.evidence_levels,
            };
        }
        catch (error) {
            throw new ValidationError(`Failed to generate audit report: ${String(error)}`);
        }
    }
    async verifyProof(proofId, constraints) {
        try {
            const { data } = await this.client.post('/api/ccvs/verify-proof', {
                proof_id: proofId,
                constraints,
            });
            return {
                valid: data.valid,
                result: data.result,
                error: data.error,
            };
        }
        catch (error) {
            throw new ValidationError(`Failed to verify proof: ${String(error)}`);
        }
    }
    async listAuditLogs(agentId, limit = 100, offset = 0) {
        try {
            const params = new URLSearchParams();
            if (agentId)
                params.append('agent_id', agentId);
            params.append('limit', String(limit));
            params.append('offset', String(offset));
            const { data } = await this.client.get(`/api/audit?${params.toString()}`);
            return (data.logs || []).map((log) => ({
                id: log.id,
                action: log.action,
                timestamp: new Date(log.timestamp),
                details: log.details || {},
            }));
        }
        catch (error) {
            throw new ValidationError(`Failed to list audit logs: ${String(error)}`);
        }
    }
}
