import axios from 'axios';
import { AuthenticationError, ValidationError } from '../utils/errors.js';
export class VercelService {
    constructor(config) {
        if (!config.apiToken) {
            throw new AuthenticationError('Missing Vercel API token');
        }
        this.teamId = config.teamId;
        this.client = axios.create({
            baseURL: 'https://api.vercel.com',
            headers: {
                Authorization: `Bearer ${config.apiToken}`,
            },
        });
    }
    async listDeployments(projectId, limit = 10) {
        try {
            const params = new URLSearchParams();
            if (this.teamId)
                params.append('teamId', this.teamId);
            params.append('limit', String(limit));
            const { data } = await this.client.get(`/v6/deployments?${params.toString()}`);
            return data.deployments || [];
        }
        catch (error) {
            throw new ValidationError(`Failed to list deployments: ${String(error)}`);
        }
    }
    async triggerDeploy(projectId, ref, environment = 'preview') {
        try {
            const payload = {
                name: projectId,
                gitSource: ref ? { ref, repoId: projectId } : undefined,
                production: environment === 'production',
            };
            const params = new URLSearchParams();
            if (this.teamId)
                params.append('teamId', this.teamId);
            const { data } = await this.client.post(`/v13/deployments?${params.toString()}`, payload);
            return {
                deploymentUrl: data.url || data.aliasUrl,
                deploymentId: data.id,
            };
        }
        catch (error) {
            throw new ValidationError(`Failed to trigger deployment: ${String(error)}`);
        }
    }
    async getBuildLogs(deploymentId, lines = 100) {
        try {
            const params = new URLSearchParams();
            if (this.teamId)
                params.append('teamId', this.teamId);
            const { data } = await this.client.get(`/v12/deployments/${deploymentId}/logs?${params.toString()}`);
            const logs = Array.isArray(data) ? data : [data];
            return logs
                .map((log) => log.message || log.text || String(log))
                .slice(-lines)
                .join('\n');
        }
        catch (error) {
            throw new ValidationError(`Failed to get build logs: ${String(error)}`);
        }
    }
    async getProjectStatus(projectId) {
        try {
            const params = new URLSearchParams();
            if (this.teamId)
                params.append('teamId', this.teamId);
            const [projectRes, deploymentsRes] = await Promise.all([
                this.client.get(`/v9/projects/${projectId}?${params.toString()}`),
                this.client.get(`/v6/deployments?${params.toString()}`),
            ]);
            return {
                status: projectRes.data.status || 'active',
                latestDeployment: deploymentsRes.data.deployments?.[0],
                environmentVariables: projectRes.data.env || {},
            };
        }
        catch (error) {
            throw new ValidationError(`Failed to get project status: ${String(error)}`);
        }
    }
    async manageEnvVar(projectId, key, value, action = 'set') {
        try {
            const params = new URLSearchParams();
            if (this.teamId)
                params.append('teamId', this.teamId);
            if (action === 'delete') {
                await this.client.delete(`/v9/projects/${projectId}/env/${key}?${params.toString()}`);
                return { success: true, message: `Environment variable ${key} deleted` };
            }
            else {
                await this.client.post(`/v9/projects/${projectId}/env?${params.toString()}`, {
                    key,
                    value,
                });
                return { success: true, message: `Environment variable ${key} updated` };
            }
        }
        catch (error) {
            throw new ValidationError(`Failed to manage environment variable: ${String(error)}`);
        }
    }
}
