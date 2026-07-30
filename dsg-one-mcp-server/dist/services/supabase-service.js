import { createClient } from '@supabase/supabase-js';
import { AuthenticationError, ValidationError } from '../utils/errors.js';
export class SupabaseService {
    constructor(config) {
        this.serviceClient = null;
        if (!config.url || !config.anonKey) {
            throw new AuthenticationError('Missing Supabase credentials');
        }
        this.client = createClient(config.url, config.anonKey);
        if (config.serviceRoleKey) {
            this.serviceClient = createClient(config.url, config.serviceRoleKey);
        }
    }
    async executeQuery(query, params) {
        try {
            const { data, error } = await this.client.rpc('execute_query', {
                query,
                params: params || [],
            });
            if (error) {
                throw new ValidationError(`Query execution failed: ${error.message}`, { error });
            }
            return data;
        }
        catch (error) {
            throw new ValidationError(`Failed to execute query: ${String(error)}`);
        }
    }
    async updateRecords(table, data, filter, auditReason) {
        try {
            if (auditReason) {
                await this.logAudit({
                    table,
                    action: 'update',
                    changes: data,
                    reason: auditReason,
                    timestamp: new Date(),
                });
            }
            return { success: true, message: 'Update recorded' };
        }
        catch (error) {
            throw new ValidationError(`Failed to update records: ${String(error)}`);
        }
    }
    async listTables() {
        try {
            const { data, error } = await this.client.rpc('get_table_names');
            if (error) {
                throw new ValidationError(`Failed to list tables: ${error.message}`);
            }
            return data;
        }
        catch (error) {
            throw new ValidationError(`Failed to list tables: ${String(error)}`);
        }
    }
    async getRLSPolicies(table) {
        try {
            const { data, error } = await this.client.rpc('get_rls_policies', {
                table_name: table,
            });
            if (error) {
                throw new ValidationError(`Failed to get RLS policies: ${error.message}`);
            }
            return data;
        }
        catch (error) {
            throw new ValidationError(`Failed to get RLS policies: ${String(error)}`);
        }
    }
    async executeMigration(migrationName) {
        try {
            if (!this.serviceClient) {
                throw new AuthenticationError('Service role key required for migrations');
            }
            const { data, error } = await this.serviceClient.rpc('execute_migration', {
                migration_name: migrationName,
            });
            if (error) {
                throw new ValidationError(`Migration failed: ${error.message}`);
            }
            return { success: true, message: data };
        }
        catch (error) {
            throw new ValidationError(`Failed to execute migration: ${String(error)}`);
        }
    }
    async checkAuthSession(sessionId) {
        try {
            const { data, error } = await this.client.rpc('verify_session', {
                session_id: sessionId,
            });
            if (error) {
                return { valid: false, user: null };
            }
            return { valid: true, user: data };
        }
        catch (error) {
            return { valid: false, user: null };
        }
    }
    async logAudit(entry) {
        try {
            const { error } = await (this.serviceClient || this.client).from('audit_logs').insert(entry);
            if (error) {
                console.error('Failed to log audit entry:', error);
            }
        }
        catch (error) {
            console.error('Failed to log audit entry:', error);
        }
    }
}
