import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AuthenticationError, ValidationError } from '../utils/errors.js';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
}

export class SupabaseService {
  private client: SupabaseClient;
  private serviceClient: SupabaseClient | null = null;

  constructor(config: SupabaseConfig) {
    if (!config.url || !config.anonKey) {
      throw new AuthenticationError('Missing Supabase credentials');
    }

    this.client = createClient(config.url, config.anonKey);

    if (config.serviceRoleKey) {
      this.serviceClient = createClient(config.url, config.serviceRoleKey);
    }
  }

  async executeQuery(query: string, params?: any[]): Promise<any> {
    try {
      const { data, error } = await this.client.rpc('execute_query', {
        query,
        params: params || [],
      });

      if (error) {
        throw new ValidationError(`Query execution failed: ${error.message}`, { error });
      }

      return data;
    } catch (error) {
      throw new ValidationError(`Failed to execute query: ${String(error)}`);
    }
  }

  async updateRecords(table: string, data: Record<string, any>, filter: Record<string, any>, auditReason?: string): Promise<any> {
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
    } catch (error) {
      throw new ValidationError(`Failed to update records: ${String(error)}`);
    }
  }

  async listTables(): Promise<string[]> {
    try {
      const { data, error } = await this.client.rpc('get_table_names');

      if (error) {
        throw new ValidationError(`Failed to list tables: ${error.message}`);
      }

      return data as string[];
    } catch (error) {
      throw new ValidationError(`Failed to list tables: ${String(error)}`);
    }
  }

  async getRLSPolicies(table: string): Promise<any[]> {
    try {
      const { data, error } = await this.client.rpc('get_rls_policies', {
        table_name: table,
      });

      if (error) {
        throw new ValidationError(`Failed to get RLS policies: ${error.message}`);
      }

      return data as any[];
    } catch (error) {
      throw new ValidationError(`Failed to get RLS policies: ${String(error)}`);
    }
  }

  async executeMigration(migrationName: string): Promise<{ success: boolean; message: string }> {
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
    } catch (error) {
      throw new ValidationError(`Failed to execute migration: ${String(error)}`);
    }
  }

  async checkAuthSession(sessionId: string): Promise<{ valid: boolean; user: any }> {
    try {
      const { data, error } = await this.client.rpc('verify_session', {
        session_id: sessionId,
      });

      if (error) {
        return { valid: false, user: null };
      }

      return { valid: true, user: data };
    } catch (error) {
      return { valid: false, user: null };
    }
  }

  private async logAudit(entry: Record<string, any>): Promise<void> {
    try {
      const { error } = await (this.serviceClient || this.client).from('audit_logs').insert(entry);

      if (error) {
        console.error('Failed to log audit entry:', error);
      }
    } catch (error) {
      console.error('Failed to log audit entry:', error);
    }
  }
}
