export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      ai_models: {
        Row: {
          id: string
          org_id: string
          name: string
          description: string | null
          version: string
          provider: string
          model_type: string | null
          tags: string[]
          endpoint_url: string | null
          api_key_id: string | null
          status: string
          metadata: Json
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          org_id: string
          name: string
          description?: string | null
          version: string
          provider: string
          model_type?: string | null
          tags?: string[]
          endpoint_url?: string | null
          api_key_id?: string | null
          status?: string
          metadata?: Json
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          org_id?: string
          name?: string
          description?: string | null
          version?: string
          provider?: string
          model_type?: string | null
          tags?: string[]
          endpoint_url?: string | null
          api_key_id?: string | null
          status?: string
          metadata?: Json
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Relationships: []
      }
      ai_policies: {
        Row: {
          id: string
          org_id: string
          name: string
          description: string | null
          policy_type: string
          rules: Json
          risk_level: string
          enabled: boolean
          version: number
          policy_hash: string | null
          applies_to_models: string[]
          applies_to_actions: string[]
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          org_id: string
          name: string
          description?: string | null
          policy_type: string
          rules: Json
          risk_level?: string
          enabled?: boolean
          version?: number
          policy_hash?: string | null
          applies_to_models?: string[]
          applies_to_actions?: string[]
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          org_id?: string
          name?: string
          description?: string | null
          policy_type?: string
          rules?: Json
          risk_level?: string
          enabled?: boolean
          version?: number
          policy_hash?: string | null
          applies_to_models?: string[]
          applies_to_actions?: string[]
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Relationships: []
      }
      ai_policy_versions: {
        Row: {
          id: string
          policy_id: string
          org_id: string
          version: number
          rules: Json
          risk_level: string
          change_summary: string | null
          created_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          policy_id: string
          org_id: string
          version: number
          rules: Json
          risk_level: string
          change_summary?: string | null
          created_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          policy_id?: string
          org_id?: string
          version?: number
          rules?: Json
          risk_level?: string
          change_summary?: string | null
          created_at?: string
          created_by?: string | null
        }
        Relationships: []
      }
      ai_audit_logs: {
        Row: {
          id: string
          org_id: string
          event_type: string
          resource_type: string
          resource_id: string
          action: string
          decision: string | null
          decision_reason: string | null
          user_id: string | null
          actor_type: string
          actor_id: string | null
          request_id: string | null
          request_metadata: Json
          policy_id: string | null
          policy_version: number | null
          proof_reference: string | null
          execution_details: Json
          error_message: string | null
          execution_time_ms: number | null
          ip_address: string | null
          user_agent: string | null
          compliance_tags: string[]
          retention_until: string | null
          created_at: string
        }
        Insert: {
          id?: string
          org_id: string
          event_type: string
          resource_type: string
          resource_id: string
          action: string
          decision?: string | null
          decision_reason?: string | null
          user_id?: string | null
          actor_type?: string
          actor_id?: string | null
          request_id?: string | null
          request_metadata?: Json
          policy_id?: string | null
          policy_version?: number | null
          proof_reference?: string | null
          execution_details?: Json
          error_message?: string | null
          execution_time_ms?: number | null
          ip_address?: string | null
          user_agent?: string | null
          compliance_tags?: string[]
          retention_until?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          org_id?: string
          event_type?: string
          resource_type?: string
          resource_id?: string
          action?: string
          decision?: string | null
          decision_reason?: string | null
          user_id?: string | null
          actor_type?: string
          actor_id?: string | null
          request_id?: string | null
          request_metadata?: Json
          policy_id?: string | null
          policy_version?: number | null
          proof_reference?: string | null
          execution_details?: Json
          error_message?: string | null
          execution_time_ms?: number | null
          ip_address?: string | null
          user_agent?: string | null
          compliance_tags?: string[]
          retention_until?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
    CompositeTypes: {}
  }
}
