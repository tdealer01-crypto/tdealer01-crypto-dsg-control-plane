export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      access_requests: {
        Row: {
          created_at: string
          email: string
          email_domain: string | null
          full_name: string | null
          id: string
          metadata: Json
          org_id: string | null
          ref_code: string | null
          requested_org_hint: string | null
          requested_role: string | null
          review_note: string | null
          reviewed_by_user_id: string | null
          status: string
          updated_at: string
          workspace_name: string | null
        }
        Insert: {
          created_at?: string
          email: string
          email_domain?: string | null
          full_name?: string | null
          id?: string
          metadata?: Json
          org_id?: string | null
          ref_code?: string | null
          requested_org_hint?: string | null
          requested_role?: string | null
          review_note?: string | null
          reviewed_by_user_id?: string | null
          status?: string
          updated_at?: string
          workspace_name?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          email_domain?: string | null
          full_name?: string | null
          id?: string
          metadata?: Json
          org_id?: string | null
          ref_code?: string | null
          requested_org_hint?: string | null
          requested_role?: string | null
          review_note?: string | null
          reviewed_by_user_id?: string | null
          status?: string
          updated_at?: string
          workspace_name?: string | null
        }
        Relationships: []
      }
      actor_identity_map: {
        Row: {
          actor_uuid: string
          created_at: string | null
          deleted_at: string | null
          identity_data: Json
        }
        Insert: {
          actor_uuid?: string
          created_at?: string | null
          deleted_at?: string | null
          identity_data: Json
        }
        Update: {
          actor_uuid?: string
          created_at?: string | null
          deleted_at?: string | null
          identity_data?: Json
        }
        Relationships: []
      }
      admin_api_keys: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          key_hash: string
          label: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          key_hash: string
          label: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          key_hash?: string
          label?: string
        }
        Relationships: []
      }
      agent_discovery_log: {
        Row: {
          agent_id: string
          created_at: string | null
          discovered_at: string | null
          id: string
          listing_id: string
          listing_title: string | null
          listing_type: string | null
          reward: number | null
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          discovered_at?: string | null
          id: string
          listing_id: string
          listing_title?: string | null
          listing_type?: string | null
          reward?: number | null
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          discovered_at?: string | null
          id?: string
          listing_id?: string
          listing_title?: string | null
          listing_type?: string | null
          reward?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_discovery_log_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "dsg_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_execution_approvals: {
        Row: {
          approver: string | null
          created_at: string | null
          decision: string | null
          id: string
          request_id: string | null
        }
        Insert: {
          approver?: string | null
          created_at?: string | null
          decision?: string | null
          id?: string
          request_id?: string | null
        }
        Update: {
          approver?: string | null
          created_at?: string | null
          decision?: string | null
          id?: string
          request_id?: string | null
        }
        Relationships: []
      }
      agent_execution_requests: {
        Row: {
          agent_id: string | null
          created_at: string | null
          id: string
          org_id: string | null
          payload: Json | null
          status: string | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string | null
          id?: string
          org_id?: string | null
          payload?: Json | null
          status?: string | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string | null
          id?: string
          org_id?: string | null
          payload?: Json | null
          status?: string | null
        }
        Relationships: []
      }
      agent_execution_steps: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          request_id: string | null
          status: string | null
          step_name: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          request_id?: string | null
          status?: string | null
          step_name?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          request_id?: string | null
          status?: string | null
          step_name?: string | null
        }
        Relationships: []
      }
      agent_gate_settings: {
        Row: {
          created_at: string
          gate_mode: string
          id: string
          org_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          gate_mode?: string
          id?: string
          org_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          gate_mode?: string
          id?: string
          org_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      agent_permissions: {
        Row: {
          agent_id: string
          created_at: string | null
          created_by: string | null
          default_role: string | null
          id: string
          org_id: string
          permissions: string[]
          updated_at: string | null
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          created_by?: string | null
          default_role?: string | null
          id?: string
          org_id: string
          permissions?: string[]
          updated_at?: string | null
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          created_by?: string | null
          default_role?: string | null
          id?: string
          org_id?: string
          permissions?: string[]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_permissions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_permissions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "dashboard_agent_status"
            referencedColumns: ["agent_id"]
          },
          {
            foreignKeyName: "agent_permissions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_permissions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_profiles: {
        Row: {
          agent_id: string
          completed_jobs: number
          created_at: string
          id: string
          last_active: string
          reputation: number
          skills: string[]
          tier: string
          total_earnings: number
          updated_at: string
          wallet_address: string
        }
        Insert: {
          agent_id: string
          completed_jobs?: number
          created_at?: string
          id?: string
          last_active?: string
          reputation?: number
          skills?: string[]
          tier?: string
          total_earnings?: number
          updated_at?: string
          wallet_address: string
        }
        Update: {
          agent_id?: string
          completed_jobs?: number
          created_at?: string
          id?: string
          last_active?: string
          reputation?: number
          skills?: string[]
          tier?: string
          total_earnings?: number
          updated_at?: string
          wallet_address?: string
        }
        Relationships: []
      }
      agent_stats_daily: {
        Row: {
          agent_id: string
          allow_count: number
          allow_rate: number
          avg_latency_ms: number
          block_count: number
          block_rate: number
          created_at: string
          error_count: number
          extra: Json
          id: number
          last_used_at: string | null
          latest_decision: string | null
          org_id: string
          p95_latency_ms: number | null
          quota_hits: number
          requests_count: number
          stabilize_count: number
          stabilize_rate: number
          stat_date: string
        }
        Insert: {
          agent_id: string
          allow_count?: number
          allow_rate?: number
          avg_latency_ms?: number
          block_count?: number
          block_rate?: number
          created_at?: string
          error_count?: number
          extra?: Json
          id?: number
          last_used_at?: string | null
          latest_decision?: string | null
          org_id: string
          p95_latency_ms?: number | null
          quota_hits?: number
          requests_count?: number
          stabilize_count?: number
          stabilize_rate?: number
          stat_date: string
        }
        Update: {
          agent_id?: string
          allow_count?: number
          allow_rate?: number
          avg_latency_ms?: number
          block_count?: number
          block_rate?: number
          created_at?: string
          error_count?: number
          extra?: Json
          id?: number
          last_used_at?: string | null
          latest_decision?: string | null
          org_id?: string
          p95_latency_ms?: number | null
          quota_hits?: number
          requests_count?: number
          stabilize_count?: number
          stabilize_rate?: number
          stat_date?: string
        }
        Relationships: []
      }
      agent_submissions: {
        Row: {
          agent_id: string
          ask: number | null
          created_at: string | null
          human_id: string | null
          id: string
          link: string
          listing_id: string
          listing_title: string | null
          other_info: string | null
          status: string | null
          submitted_at: string | null
          superteam_response: Json | null
          telegram: string | null
          updated_at: string | null
        }
        Insert: {
          agent_id: string
          ask?: number | null
          created_at?: string | null
          human_id?: string | null
          id: string
          link: string
          listing_id: string
          listing_title?: string | null
          other_info?: string | null
          status?: string | null
          submitted_at?: string | null
          superteam_response?: Json | null
          telegram?: string | null
          updated_at?: string | null
        }
        Update: {
          agent_id?: string
          ask?: number | null
          created_at?: string | null
          human_id?: string | null
          id?: string
          link?: string
          listing_id?: string
          listing_title?: string | null
          other_info?: string | null
          status?: string | null
          submitted_at?: string | null
          superteam_response?: Json | null
          telegram?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_submissions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "dsg_agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_workspace_audit_events: {
        Row: {
          action: string
          agent_id: string
          authorized: boolean
          created_at: string
          environment: string
          evidence: Json
          id: string
          input_hash: string | null
          lease_id: string | null
          org_id: string | null
          plan_hash: string | null
          promotion_id: string | null
          reason: string
          requested_scope: string
          target: string | null
          workspace_id: string | null
        }
        Insert: {
          action: string
          agent_id: string
          authorized: boolean
          created_at?: string
          environment: string
          evidence?: Json
          id?: string
          input_hash?: string | null
          lease_id?: string | null
          org_id?: string | null
          plan_hash?: string | null
          promotion_id?: string | null
          reason: string
          requested_scope: string
          target?: string | null
          workspace_id?: string | null
        }
        Update: {
          action?: string
          agent_id?: string
          authorized?: boolean
          created_at?: string
          environment?: string
          evidence?: Json
          id?: string
          input_hash?: string | null
          lease_id?: string | null
          org_id?: string | null
          plan_hash?: string | null
          promotion_id?: string | null
          reason?: string
          requested_scope?: string
          target?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_workspace_audit_events_lease_id_fkey"
            columns: ["lease_id"]
            isOneToOne: false
            referencedRelation: "agent_workspace_leases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_workspace_audit_events_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "agent_workspace_promotions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_workspace_audit_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "agent_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_workspace_capabilities: {
        Row: {
          access_level: string
          capability: string
          created_at: string
          enabled: boolean
          id: string
          requires_runtime_approval: boolean
          scope: string
          workspace_id: string
        }
        Insert: {
          access_level: string
          capability: string
          created_at?: string
          enabled?: boolean
          id?: string
          requires_runtime_approval?: boolean
          scope: string
          workspace_id: string
        }
        Update: {
          access_level?: string
          capability?: string
          created_at?: string
          enabled?: boolean
          id?: string
          requires_runtime_approval?: boolean
          scope?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_workspace_capabilities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "agent_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_workspace_leases: {
        Row: {
          agent_id: string
          auto_renew: boolean
          auto_renew_until: string
          created_at: string
          environments: string[]
          expires_at: string
          id: string
          issued_by: string
          metadata: Json
          org_id: string | null
          scopes: string[]
          starts_at: string
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          agent_id: string
          auto_renew?: boolean
          auto_renew_until?: string
          created_at?: string
          environments?: string[]
          expires_at?: string
          id?: string
          issued_by?: string
          metadata?: Json
          org_id?: string | null
          scopes?: string[]
          starts_at?: string
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          agent_id?: string
          auto_renew?: boolean
          auto_renew_until?: string
          created_at?: string
          environments?: string[]
          expires_at?: string
          id?: string
          issued_by?: string
          metadata?: Json
          org_id?: string | null
          scopes?: string[]
          starts_at?: string
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_workspace_leases_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "agent_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_workspace_promotions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          checks: Json
          commit_sha: string | null
          created_at: string
          evidence_hash: string | null
          executed_at: string | null
          expires_at: string | null
          id: string
          org_id: string | null
          rejection_reason: string | null
          requested_by: string
          requested_scopes: string[]
          run_id: string | null
          status: string
          target_environment: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          checks?: Json
          commit_sha?: string | null
          created_at?: string
          evidence_hash?: string | null
          executed_at?: string | null
          expires_at?: string | null
          id?: string
          org_id?: string | null
          rejection_reason?: string | null
          requested_by: string
          requested_scopes?: string[]
          run_id?: string | null
          status?: string
          target_environment: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          checks?: Json
          commit_sha?: string | null
          created_at?: string
          evidence_hash?: string | null
          executed_at?: string | null
          expires_at?: string | null
          id?: string
          org_id?: string | null
          rejection_reason?: string | null
          requested_by?: string
          requested_scopes?: string[]
          run_id?: string | null
          status?: string
          target_environment?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_workspace_promotions_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "agent_workspace_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_workspace_promotions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "agent_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_workspace_runs: {
        Row: {
          agent_id: string
          commit_sha: string | null
          completed_at: string | null
          created_at: string
          evidence: Json
          git_branch: string | null
          goal: string
          id: string
          org_id: string | null
          plan: Json
          plan_hash: string | null
          preview_url: string | null
          started_at: string | null
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          agent_id: string
          commit_sha?: string | null
          completed_at?: string | null
          created_at?: string
          evidence?: Json
          git_branch?: string | null
          goal: string
          id?: string
          org_id?: string | null
          plan?: Json
          plan_hash?: string | null
          preview_url?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          agent_id?: string
          commit_sha?: string | null
          completed_at?: string | null
          created_at?: string
          evidence?: Json
          git_branch?: string | null
          goal?: string
          id?: string
          org_id?: string | null
          plan?: Json
          plan_hash?: string | null
          preview_url?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_workspace_runs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "agent_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_workspace_tool_registry: {
        Row: {
          command_template: string | null
          configuration: Json
          created_at: string
          created_by_agent: string
          endpoint_url: string | null
          id: string
          kind: string
          name: string
          org_id: string | null
          production_enabled: boolean
          risk: string
          scope: string
          secret_refs: string[]
          source_path: string | null
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          command_template?: string | null
          configuration?: Json
          created_at?: string
          created_by_agent: string
          endpoint_url?: string | null
          id?: string
          kind: string
          name: string
          org_id?: string | null
          production_enabled?: boolean
          risk?: string
          scope: string
          secret_refs?: string[]
          source_path?: string | null
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          command_template?: string | null
          configuration?: Json
          created_at?: string
          created_by_agent?: string
          endpoint_url?: string | null
          id?: string
          kind?: string
          name?: string
          org_id?: string | null
          production_enabled?: boolean
          risk?: string
          scope?: string
          secret_refs?: string[]
          source_path?: string | null
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_workspace_tool_registry_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "agent_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_workspaces: {
        Row: {
          allow_tool_creation: boolean
          allowed_environments: string[]
          approved_plan: Json
          auto_authorize_plan_actions: boolean
          created_at: string
          created_by: string
          environment: string
          git_branch_pattern: string
          id: string
          name: string
          org_id: string | null
          plan_hash: string | null
          production_access: boolean
          production_locked: boolean
          repo_full_name: string
          status: string
          stripe_account_id: string | null
          stripe_mode: string
          supabase_project_ref: string | null
          updated_at: string
          vercel_project_id: string | null
          vercel_project_slug: string | null
          vercel_team_slug: string | null
          workspace_key: string
        }
        Insert: {
          allow_tool_creation?: boolean
          allowed_environments?: string[]
          approved_plan?: Json
          auto_authorize_plan_actions?: boolean
          created_at?: string
          created_by?: string
          environment: string
          git_branch_pattern?: string
          id?: string
          name: string
          org_id?: string | null
          plan_hash?: string | null
          production_access?: boolean
          production_locked?: boolean
          repo_full_name: string
          status?: string
          stripe_account_id?: string | null
          stripe_mode?: string
          supabase_project_ref?: string | null
          updated_at?: string
          vercel_project_id?: string | null
          vercel_project_slug?: string | null
          vercel_team_slug?: string | null
          workspace_key: string
        }
        Update: {
          allow_tool_creation?: boolean
          allowed_environments?: string[]
          approved_plan?: Json
          auto_authorize_plan_actions?: boolean
          created_at?: string
          created_by?: string
          environment?: string
          git_branch_pattern?: string
          id?: string
          name?: string
          org_id?: string | null
          plan_hash?: string | null
          production_access?: boolean
          production_locked?: boolean
          repo_full_name?: string
          status?: string
          stripe_account_id?: string | null
          stripe_mode?: string
          supabase_project_ref?: string | null
          updated_at?: string
          vercel_project_id?: string | null
          vercel_project_slug?: string | null
          vercel_team_slug?: string | null
          workspace_key?: string
        }
        Relationships: []
      }
      agents: {
        Row: {
          api_key_hash: string
          created_at: string
          id: string
          last_used_at: string | null
          metadata: Json
          monthly_limit: number
          name: string
          org_id: string | null
          owner_user_id: string | null
          policy_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          api_key_hash: string
          created_at?: string
          id?: string
          last_used_at?: string | null
          metadata?: Json
          monthly_limit?: number
          name: string
          org_id?: string | null
          owner_user_id?: string | null
          policy_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          api_key_hash?: string
          created_at?: string
          id?: string
          last_used_at?: string | null
          metadata?: Json
          monthly_limit?: number
          name?: string
          org_id?: string | null
          owner_user_id?: string | null
          policy_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agents_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agents_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agents_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policy_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agents_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policy_versions"
            referencedColumns: ["policy_id"]
          },
        ]
      }
      ai_audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_type: string | null
          compliance_tags: string[] | null
          created_at: string | null
          decision: string | null
          decision_reason: string | null
          error_message: string | null
          event_type: string
          execution_details: Json | null
          execution_time_ms: number | null
          id: string
          ip_address: unknown
          org_id: string
          policy_id: string | null
          policy_version: number | null
          proof_reference: string | null
          request_id: string | null
          request_metadata: Json | null
          resource_id: string
          resource_type: string
          retention_until: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_type?: string | null
          compliance_tags?: string[] | null
          created_at?: string | null
          decision?: string | null
          decision_reason?: string | null
          error_message?: string | null
          event_type: string
          execution_details?: Json | null
          execution_time_ms?: number | null
          id?: string
          ip_address?: unknown
          org_id: string
          policy_id?: string | null
          policy_version?: number | null
          proof_reference?: string | null
          request_id?: string | null
          request_metadata?: Json | null
          resource_id: string
          resource_type: string
          retention_until?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_type?: string | null
          compliance_tags?: string[] | null
          created_at?: string | null
          decision?: string | null
          decision_reason?: string | null
          error_message?: string | null
          event_type?: string
          execution_details?: Json | null
          execution_time_ms?: number | null
          id?: string
          ip_address?: unknown
          org_id?: string
          policy_id?: string | null
          policy_version?: number | null
          proof_reference?: string | null
          request_id?: string | null
          request_metadata?: Json | null
          resource_id?: string
          resource_type?: string
          retention_until?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_audit_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_audit_logs_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "ai_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_models: {
        Row: {
          api_key_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          endpoint_url: string | null
          id: string
          metadata: Json | null
          model_type: string | null
          name: string
          org_id: string
          provider: string
          status: string | null
          tags: string[] | null
          updated_at: string | null
          version: string
        }
        Insert: {
          api_key_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          endpoint_url?: string | null
          id?: string
          metadata?: Json | null
          model_type?: string | null
          name: string
          org_id: string
          provider: string
          status?: string | null
          tags?: string[] | null
          updated_at?: string | null
          version: string
        }
        Update: {
          api_key_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          endpoint_url?: string | null
          id?: string
          metadata?: Json | null
          model_type?: string | null
          name?: string
          org_id?: string
          provider?: string
          status?: string | null
          tags?: string[] | null
          updated_at?: string | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_models_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "dsg_secrets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_models_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_policies: {
        Row: {
          applies_to_actions: string[] | null
          applies_to_models: string[] | null
          created_at: string | null
          created_by: string | null
          description: string | null
          enabled: boolean | null
          id: string
          name: string
          org_id: string
          policy_hash: string | null
          policy_type: string
          risk_level: string
          rules: Json
          updated_at: string | null
          version: number | null
        }
        Insert: {
          applies_to_actions?: string[] | null
          applies_to_models?: string[] | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          enabled?: boolean | null
          id?: string
          name: string
          org_id: string
          policy_hash?: string | null
          policy_type: string
          risk_level?: string
          rules?: Json
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          applies_to_actions?: string[] | null
          applies_to_models?: string[] | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          enabled?: boolean | null
          id?: string
          name?: string
          org_id?: string
          policy_hash?: string | null
          policy_type?: string
          risk_level?: string
          rules?: Json
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_policies_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_policy_versions: {
        Row: {
          change_summary: string | null
          created_at: string | null
          created_by: string | null
          id: string
          org_id: string
          policy_id: string
          risk_level: string
          rules: Json
          version: number
        }
        Insert: {
          change_summary?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          org_id: string
          policy_id: string
          risk_level: string
          rules: Json
          version: number
        }
        Update: {
          change_summary?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          org_id?: string
          policy_id?: string
          risk_level?: string
          rules?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_policy_versions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_policy_versions_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "ai_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_events: {
        Row: {
          code: string
          context: Json
          fingerprint: string | null
          first_seen_at: string
          id: number
          last_seen_at: string
          level: string
          message: string
          occurrence_count: number
          org_id: string
          payload: Json
          resolved_at: string | null
          severity_score: number
          source: string
          status: string
        }
        Insert: {
          code: string
          context?: Json
          fingerprint?: string | null
          first_seen_at?: string
          id?: number
          last_seen_at?: string
          level: string
          message: string
          occurrence_count?: number
          org_id: string
          payload?: Json
          resolved_at?: string | null
          severity_score?: number
          source: string
          status?: string
        }
        Update: {
          code?: string
          context?: Json
          fingerprint?: string | null
          first_seen_at?: string
          id?: number
          last_seen_at?: string
          level?: string
          message?: string
          occurrence_count?: number
          org_id?: string
          payload?: Json
          resolved_at?: string | null
          severity_score?: number
          source?: string
          status?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          created_at: string
          expiry: string | null
          id: string
          key_hash: string
          last_used: string | null
          name: string
          org_id: string
          prefix: string
          requests_this_month: number
          scopes: string[]
          status: string
        }
        Insert: {
          created_at?: string
          expiry?: string | null
          id?: string
          key_hash: string
          last_used?: string | null
          name: string
          org_id: string
          prefix: string
          requests_this_month?: number
          scopes?: string[]
          status?: string
        }
        Update: {
          created_at?: string
          expiry?: string | null
          id?: string
          key_hash?: string
          last_used?: string | null
          name?: string
          org_id?: string
          prefix?: string
          requests_this_month?: number
          scopes?: string[]
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_batch_events: {
        Row: {
          agent_id: string
          batch_id: string
          command_args: Json | null
          command_type: string
          created_at: string
          decision: string
          delegation_id: string
          executor_result: Json | null
          executor_type: string | null
          harmony_source: string
          id: string
          reason: string
          timestamp: number
        }
        Insert: {
          agent_id: string
          batch_id: string
          command_args?: Json | null
          command_type: string
          created_at?: string
          decision: string
          delegation_id: string
          executor_result?: Json | null
          executor_type?: string | null
          harmony_source: string
          id: string
          reason: string
          timestamp: number
        }
        Update: {
          agent_id?: string
          batch_id?: string
          command_args?: Json | null
          command_type?: string
          created_at?: string
          decision?: string
          delegation_id?: string
          executor_result?: Json | null
          executor_type?: string | null
          harmony_source?: string
          id?: string
          reason?: string
          timestamp?: number
        }
        Relationships: [
          {
            foreignKeyName: "audit_batch_events_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "audit_batch_trail"
            referencedColumns: ["batch_id"]
          },
        ]
      }
      audit_batch_trail: {
        Row: {
          agent_id: string
          batch_hash: string
          batch_id: string
          created_at: string
          decision: string
          delegation_id: string
          executor_result: Json | null
          executor_type: string | null
          harmony_source: string
          id: string
          previous_hash: string
          reason: string
        }
        Insert: {
          agent_id: string
          batch_hash: string
          batch_id: string
          created_at?: string
          decision: string
          delegation_id: string
          executor_result?: Json | null
          executor_type?: string | null
          harmony_source: string
          id?: string
          previous_hash: string
          reason: string
        }
        Update: {
          agent_id?: string
          batch_hash?: string
          batch_id?: string
          created_at?: string
          decision?: string
          delegation_id?: string
          executor_result?: Json | null
          executor_type?: string | null
          harmony_source?: string
          id?: string
          previous_hash?: string
          reason?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          actor_uuid: string | null
          agent_id: string | null
          created_at: string
          decision: string
          evidence: Json | null
          execution_id: string | null
          id: string
          metadata: Json
          org_id: string | null
          policy_version: string
          reason: string
        }
        Insert: {
          actor_uuid?: string | null
          agent_id?: string | null
          created_at?: string
          decision: string
          evidence?: Json | null
          execution_id?: string | null
          id?: string
          metadata?: Json
          org_id?: string | null
          policy_version: string
          reason: string
        }
        Update: {
          actor_uuid?: string | null
          agent_id?: string | null
          created_at?: string
          decision?: string
          evidence?: Json | null
          execution_id?: string | null
          id?: string
          metadata?: Json
          org_id?: string | null
          policy_version?: string
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_uuid_fkey"
            columns: ["actor_uuid"]
            isOneToOne: false
            referencedRelation: "actor_identity_map"
            referencedColumns: ["actor_uuid"]
          },
          {
            foreignKeyName: "audit_logs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "dashboard_agent_status"
            referencedColumns: ["agent_id"]
          },
          {
            foreignKeyName: "audit_logs_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "dashboard_policy_decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_activation_proofs: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          evidence: Json
          id: string
          org_id: string
          proof_hash: string
          proof_version: string
          stripe_customer_id: string
          stripe_subscription_id: string
          subscription_status: string
          tier: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          evidence: Json
          id?: string
          org_id: string
          proof_hash: string
          proof_version?: string
          stripe_customer_id: string
          stripe_subscription_id: string
          subscription_status: string
          tier: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          evidence?: Json
          id?: string
          org_id?: string
          proof_hash?: string
          proof_version?: string
          stripe_customer_id?: string
          stripe_subscription_id?: string
          subscription_status?: string
          tier?: string
        }
        Relationships: []
      }
      billing_customers: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string | null
          org_id: string
          stripe_customer_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          org_id: string
          stripe_customer_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          org_id?: string
          stripe_customer_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      billing_events: {
        Row: {
          created_at: string
          event_type: string | null
          id: string
          org_id: string | null
          payload: Json
          processed_at: string | null
          stripe_customer_id: string | null
          stripe_event_id: string | null
          stripe_subscription_id: string | null
        }
        Insert: {
          created_at?: string
          event_type?: string | null
          id?: string
          org_id?: string | null
          payload?: Json
          processed_at?: string | null
          stripe_customer_id?: string | null
          stripe_event_id?: string | null
          stripe_subscription_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string | null
          id?: string
          org_id?: string | null
          payload?: Json
          processed_at?: string | null
          stripe_customer_id?: string | null
          stripe_event_id?: string | null
          stripe_subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_events_stripe_customer_id_fkey"
            columns: ["stripe_customer_id"]
            isOneToOne: false
            referencedRelation: "billing_customers"
            referencedColumns: ["stripe_customer_id"]
          },
        ]
      }
      billing_meter_outbox: {
        Row: {
          created_at: string
          error: string | null
          event_name: string
          execution_id: string
          flushed_at: string | null
          id: string
          org_id: string
          quantity: number
          status: string
          stripe_customer_id: string
          stripe_event_id: string | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          event_name: string
          execution_id: string
          flushed_at?: string | null
          id?: string
          org_id: string
          quantity?: number
          status?: string
          stripe_customer_id: string
          stripe_event_id?: string | null
        }
        Update: {
          created_at?: string
          error?: string | null
          event_name?: string
          execution_id?: string
          flushed_at?: string | null
          id?: string
          org_id?: string
          quantity?: number
          status?: string
          stripe_customer_id?: string
          stripe_event_id?: string | null
        }
        Relationships: []
      }
      billing_subscriptions: {
        Row: {
          billing_interval: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          customer_email: string | null
          id: string
          org_id: string | null
          plan_key: string | null
          status: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_end: string | null
          trial_start: string | null
          updated_at: string | null
        }
        Insert: {
          billing_interval?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          customer_email?: string | null
          id?: string
          org_id?: string | null
          plan_key?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
        }
        Update: {
          billing_interval?: string | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          customer_email?: string | null
          id?: string
          org_id?: string | null
          plan_key?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          trial_start?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      breach_signal_evaluations: {
        Row: {
          allowed_actions: Json
          blocked_actions: Json
          created_at: string
          decision: string
          evidence_level: string
          hibp_breach_count: number | null
          hibp_breaches: Json | null
          hibp_checked: boolean
          hibp_elevated_evidence: boolean
          id: string
          legal_purpose: string | null
          owner: string | null
          raw_data_stored: boolean
          reasons: Json
          severity: string
          source_url: string | null
        }
        Insert: {
          allowed_actions?: Json
          blocked_actions?: Json
          created_at?: string
          decision: string
          evidence_level: string
          hibp_breach_count?: number | null
          hibp_breaches?: Json | null
          hibp_checked?: boolean
          hibp_elevated_evidence?: boolean
          id?: string
          legal_purpose?: string | null
          owner?: string | null
          raw_data_stored?: boolean
          reasons?: Json
          severity: string
          source_url?: string | null
        }
        Update: {
          allowed_actions?: Json
          blocked_actions?: Json
          created_at?: string
          decision?: string
          evidence_level?: string
          hibp_breach_count?: number | null
          hibp_breaches?: Json | null
          hibp_checked?: boolean
          hibp_elevated_evidence?: boolean
          id?: string
          legal_purpose?: string | null
          owner?: string | null
          raw_data_stored?: boolean
          reasons?: Json
          severity?: string
          source_url?: string | null
        }
        Relationships: []
      }
      claim_readiness_artifacts: {
        Row: {
          artifact_data: Json | null
          artifact_hash: string
          artifact_path: string | null
          chain_hash: string | null
          claim_id: string
          created_at: string
          evidence_type: string
          id: string
          immutable_at: string | null
          s3_retain_until: string | null
          s3_version_id: string | null
          signature_bundle: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          artifact_data?: Json | null
          artifact_hash: string
          artifact_path?: string | null
          chain_hash?: string | null
          claim_id: string
          created_at?: string
          evidence_type: string
          id?: string
          immutable_at?: string | null
          s3_retain_until?: string | null
          s3_version_id?: string | null
          signature_bundle?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          artifact_data?: Json | null
          artifact_hash?: string
          artifact_path?: string | null
          chain_hash?: string | null
          claim_id?: string
          created_at?: string
          evidence_type?: string
          id?: string
          immutable_at?: string | null
          s3_retain_until?: string | null
          s3_version_id?: string | null
          signature_bundle?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      compliance_status_reports: {
        Row: {
          claim_pass_eligible: boolean | null
          created_at: string
          id: string
          last_ci_run: string | null
          matrix_json: Json | null
          mutation_score: number | null
          requirements_pass: number | null
          requirements_total: number | null
          run_id: string
          updated_at: string
        }
        Insert: {
          claim_pass_eligible?: boolean | null
          created_at?: string
          id?: string
          last_ci_run?: string | null
          matrix_json?: Json | null
          mutation_score?: number | null
          requirements_pass?: number | null
          requirements_total?: number | null
          run_id: string
          updated_at?: string
        }
        Update: {
          claim_pass_eligible?: boolean | null
          created_at?: string
          id?: string
          last_ci_run?: string | null
          matrix_json?: Json | null
          mutation_score?: number | null
          requirements_pass?: number | null
          requirements_total?: number | null
          run_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      core_event_ingest: {
        Row: {
          created_at: string
          event_at: string
          event_type: string
          id: number
          metadata: Json
          org_id: string
          payload: Json
          processed: boolean
          processed_at: string | null
        }
        Insert: {
          created_at?: string
          event_at?: string
          event_type: string
          id?: number
          metadata?: Json
          org_id: string
          payload?: Json
          processed?: boolean
          processed_at?: string | null
        }
        Update: {
          created_at?: string
          event_at?: string
          event_type?: string
          id?: number
          metadata?: Json
          org_id?: string
          payload?: Json
          processed?: boolean
          processed_at?: string | null
        }
        Relationships: []
      }
      core_monitor_snapshots: {
        Row: {
          active_agents: number
          active_users: number
          alerts: Json
          alerts_count: number
          allow_count_today: number
          allow_rate: number
          audit_ok: boolean
          audit_source_path: string | null
          avg_latency_ms: number
          block_count_today: number
          block_rate: number
          core_health_ok: boolean
          core_metrics_ok: boolean
          core_url: string | null
          created_at: string
          determinism_ok: boolean
          determinism_source_path: string | null
          deterministic: boolean | null
          error_count_today: number
          executions_this_month: number
          gate_action: string | null
          health_source_path: string | null
          id: number
          included_executions: number
          latest_sequence: number | null
          ledger_ok: boolean
          ledger_source_path: string | null
          max_entropy: number | null
          metrics_source_path: string | null
          org_id: string
          overage_executions: number
          p95_latency_ms: number | null
          projected_amount_usd: number
          raw_audit_summary: Json | null
          raw_core_metrics: Json | null
          raw_determinism: Json | null
          raw_health: Json | null
          raw_ledger_summary: Json | null
          readiness_reasons: Json
          readiness_score: number
          readiness_status: string
          region_count: number | null
          requests_today: number
          snapshot_at: string
          stabilize_count_today: number
          stabilize_rate: number
          unique_state_hashes: number | null
          window_seconds: number
        }
        Insert: {
          active_agents?: number
          active_users?: number
          alerts?: Json
          alerts_count?: number
          allow_count_today?: number
          allow_rate?: number
          audit_ok?: boolean
          audit_source_path?: string | null
          avg_latency_ms?: number
          block_count_today?: number
          block_rate?: number
          core_health_ok?: boolean
          core_metrics_ok?: boolean
          core_url?: string | null
          created_at?: string
          determinism_ok?: boolean
          determinism_source_path?: string | null
          deterministic?: boolean | null
          error_count_today?: number
          executions_this_month?: number
          gate_action?: string | null
          health_source_path?: string | null
          id?: number
          included_executions?: number
          latest_sequence?: number | null
          ledger_ok?: boolean
          ledger_source_path?: string | null
          max_entropy?: number | null
          metrics_source_path?: string | null
          org_id: string
          overage_executions?: number
          p95_latency_ms?: number | null
          projected_amount_usd?: number
          raw_audit_summary?: Json | null
          raw_core_metrics?: Json | null
          raw_determinism?: Json | null
          raw_health?: Json | null
          raw_ledger_summary?: Json | null
          readiness_reasons?: Json
          readiness_score?: number
          readiness_status?: string
          region_count?: number | null
          requests_today?: number
          snapshot_at?: string
          stabilize_count_today?: number
          stabilize_rate?: number
          unique_state_hashes?: number | null
          window_seconds?: number
        }
        Update: {
          active_agents?: number
          active_users?: number
          alerts?: Json
          alerts_count?: number
          allow_count_today?: number
          allow_rate?: number
          audit_ok?: boolean
          audit_source_path?: string | null
          avg_latency_ms?: number
          block_count_today?: number
          block_rate?: number
          core_health_ok?: boolean
          core_metrics_ok?: boolean
          core_url?: string | null
          created_at?: string
          determinism_ok?: boolean
          determinism_source_path?: string | null
          deterministic?: boolean | null
          error_count_today?: number
          executions_this_month?: number
          gate_action?: string | null
          health_source_path?: string | null
          id?: number
          included_executions?: number
          latest_sequence?: number | null
          ledger_ok?: boolean
          ledger_source_path?: string | null
          max_entropy?: number | null
          metrics_source_path?: string | null
          org_id?: string
          overage_executions?: number
          p95_latency_ms?: number | null
          projected_amount_usd?: number
          raw_audit_summary?: Json | null
          raw_core_metrics?: Json | null
          raw_determinism?: Json | null
          raw_health?: Json | null
          raw_ledger_summary?: Json | null
          readiness_reasons?: Json
          readiness_score?: number
          readiness_status?: string
          region_count?: number | null
          requests_today?: number
          snapshot_at?: string
          stabilize_count_today?: number
          stabilize_rate?: number
          unique_state_hashes?: number | null
          window_seconds?: number
        }
        Relationships: []
      }
      defi_accounts: {
        Row: {
          deposit_usd: number
          id: string
          joined_at: string
          share_pct: number
          wallet_address: string
        }
        Insert: {
          deposit_usd?: number
          id?: string
          joined_at?: string
          share_pct?: number
          wallet_address: string
        }
        Update: {
          deposit_usd?: number
          id?: string
          joined_at?: string
          share_pct?: number
          wallet_address?: string
        }
        Relationships: []
      }
      defi_config: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      defi_txns: {
        Row: {
          amount_usd: number
          created_at: string
          id: string
          protocol: string | null
          status: string
          tx_hash: string | null
          type: string
          wallet_address: string
        }
        Insert: {
          amount_usd: number
          created_at?: string
          id?: string
          protocol?: string | null
          status?: string
          tx_hash?: string | null
          type: string
          wallet_address: string
        }
        Update: {
          amount_usd?: number
          created_at?: string
          id?: string
          protocol?: string | null
          status?: string
          tx_hash?: string | null
          type?: string
          wallet_address?: string
        }
        Relationships: []
      }
      delivery_proof_reports: {
        Row: {
          claim_pass_eligible: boolean
          created_at: string
          id: string
          last_ci_run: string | null
          matrix_json: Json | null
          mutation_score: number | null
          requirements_pass: number | null
          requirements_total: number | null
          run_id: string
          updated_at: string
        }
        Insert: {
          claim_pass_eligible: boolean
          created_at?: string
          id?: string
          last_ci_run?: string | null
          matrix_json?: Json | null
          mutation_score?: number | null
          requirements_pass?: number | null
          requirements_total?: number | null
          run_id: string
          updated_at?: string
        }
        Update: {
          claim_pass_eligible?: boolean
          created_at?: string
          id?: string
          last_ci_run?: string | null
          matrix_json?: Json | null
          mutation_score?: number | null
          requirements_pass?: number | null
          requirements_total?: number | null
          run_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      directory_group_role_mappings: {
        Row: {
          created_at: string
          external_group_id: string
          external_group_name: string | null
          id: string
          org_id: string
          target_role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          external_group_id: string
          external_group_name?: string | null
          id?: string
          org_id: string
          target_role: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          external_group_id?: string
          external_group_name?: string | null
          id?: string
          org_id?: string
          target_role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "directory_group_role_mappings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      directory_sync_configs: {
        Row: {
          created_at: string
          group_sync_enabled: boolean
          id: string
          is_enabled: boolean
          metadata: Json
          org_id: string
          provider: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          group_sync_enabled?: boolean
          id?: string
          is_enabled?: boolean
          metadata?: Json
          org_id: string
          provider?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          group_sync_enabled?: boolean
          id?: string
          is_enabled?: boolean
          metadata?: Json
          org_id?: string
          provider?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "directory_sync_configs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      directory_sync_events: {
        Row: {
          created_at: string
          email: string | null
          event_type: string
          external_user_id: string | null
          id: string
          org_id: string
          payload: Json
        }
        Insert: {
          created_at?: string
          email?: string | null
          event_type: string
          external_user_id?: string | null
          id?: string
          org_id: string
          payload?: Json
        }
        Update: {
          created_at?: string
          email?: string | null
          event_type?: string
          external_user_id?: string | null
          id?: string
          org_id?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "directory_sync_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      discovered_prospects: {
        Row: {
          avatar_url: string | null
          bio: string | null
          company: string | null
          created_at: string | null
          email: string | null
          engagement_score: number | null
          icp_score: number | null
          id: string
          last_contacted_at: string | null
          name: string | null
          overall_score: number | null
          source: string
          source_id: string
          status: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          company?: string | null
          created_at?: string | null
          email?: string | null
          engagement_score?: number | null
          icp_score?: number | null
          id?: string
          last_contacted_at?: string | null
          name?: string | null
          overall_score?: number | null
          source: string
          source_id: string
          status?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          company?: string | null
          created_at?: string | null
          email?: string | null
          engagement_score?: number | null
          icp_score?: number | null
          id?: string
          last_contacted_at?: string | null
          name?: string | null
          overall_score?: number | null
          source?: string
          source_id?: string
          status?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      discovery_trial_accounts: {
        Row: {
          converted_at: string | null
          created_at: string | null
          first_execution_at: string | null
          id: string
          onboarding_stage: string | null
          org_id: string
          prospect_id: string | null
          status: string | null
          total_executions: number | null
          trial_end_at: string | null
          trial_start_at: string | null
          updated_at: string | null
        }
        Insert: {
          converted_at?: string | null
          created_at?: string | null
          first_execution_at?: string | null
          id?: string
          onboarding_stage?: string | null
          org_id: string
          prospect_id?: string | null
          status?: string | null
          total_executions?: number | null
          trial_end_at?: string | null
          trial_start_at?: string | null
          updated_at?: string | null
        }
        Update: {
          converted_at?: string | null
          created_at?: string | null
          first_execution_at?: string | null
          id?: string
          onboarding_stage?: string | null
          org_id?: string
          prospect_id?: string | null
          status?: string | null
          total_executions?: number | null
          trial_end_at?: string | null
          trial_start_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discovery_trial_accounts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discovery_trial_accounts_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "discovered_prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      dsg_access_invites: {
        Row: {
          created_at: string
          email: string
          expires_at: string | null
          id: string
          purpose: string
          role: string
          source: string
          status: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string | null
          id?: string
          purpose?: string
          role?: string
          source?: string
          status?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string | null
          id?: string
          purpose?: string
          role?: string
          source?: string
          status?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dsg_access_invites_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "dsg_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      dsg_agent_action_result_receipts: {
        Row: {
          accepted: boolean
          actor_id: string
          actor_role: string | null
          agent_id: string
          command_id: string
          created_at: string
          envelope_id: string
          gate_version: string
          id: string
          org_id: string
          receipt_body: Json
          receipt_hash: string
          request_body: Json
          result_hash: string
          session_id: string
          status: string
          workspace_id: string
        }
        Insert: {
          accepted: boolean
          actor_id: string
          actor_role?: string | null
          agent_id: string
          command_id: string
          created_at?: string
          envelope_id: string
          gate_version: string
          id?: string
          org_id: string
          receipt_body: Json
          receipt_hash: string
          request_body: Json
          result_hash: string
          session_id: string
          status: string
          workspace_id: string
        }
        Update: {
          accepted?: boolean
          actor_id?: string
          actor_role?: string | null
          agent_id?: string
          command_id?: string
          created_at?: string
          envelope_id?: string
          gate_version?: string
          id?: string
          org_id?: string
          receipt_body?: Json
          receipt_hash?: string
          request_body?: Json
          result_hash?: string
          session_id?: string
          status?: string
          workspace_id?: string
        }
        Relationships: []
      }
      dsg_agent_command_gate_decisions: {
        Row: {
          action_envelope: Json | null
          actor_id: string
          actor_role: string | null
          agent_id: string
          can_agent_execute: boolean
          command_hash: string
          command_id: string
          created_at: string
          decision: string
          decision_hash: string
          gate_version: string
          id: string
          invariant_checks: Json
          org_id: string
          reasons: Json
          request_body: Json
          result_body: Json
          session_id: string
          status: string
          workspace_id: string
        }
        Insert: {
          action_envelope?: Json | null
          actor_id: string
          actor_role?: string | null
          agent_id: string
          can_agent_execute: boolean
          command_hash: string
          command_id: string
          created_at?: string
          decision: string
          decision_hash: string
          gate_version: string
          id?: string
          invariant_checks?: Json
          org_id: string
          reasons?: Json
          request_body: Json
          result_body: Json
          session_id: string
          status: string
          workspace_id: string
        }
        Update: {
          action_envelope?: Json | null
          actor_id?: string
          actor_role?: string | null
          agent_id?: string
          can_agent_execute?: boolean
          command_hash?: string
          command_id?: string
          created_at?: string
          decision?: string
          decision_hash?: string
          gate_version?: string
          id?: string
          invariant_checks?: Json
          org_id?: string
          reasons?: Json
          request_body?: Json
          result_body?: Json
          session_id?: string
          status?: string
          workspace_id?: string
        }
        Relationships: []
      }
      dsg_agent_ledger: {
        Row: {
          action: string
          agent_id: string | null
          context: Json
          created_at: string
          decision: string
          entry_hash: string
          id: number
          invariant_snapshot: Json | null
          mode: string
          org_id: string
          prev_hash: string | null
          reason: string | null
          seq: number
          session_id: string | null
          timestamp_ms: number
        }
        Insert: {
          action: string
          agent_id?: string | null
          context?: Json
          created_at?: string
          decision: string
          entry_hash: string
          id?: number
          invariant_snapshot?: Json | null
          mode: string
          org_id: string
          prev_hash?: string | null
          reason?: string | null
          seq: number
          session_id?: string | null
          timestamp_ms: number
        }
        Update: {
          action?: string
          agent_id?: string | null
          context?: Json
          created_at?: string
          decision?: string
          entry_hash?: string
          id?: number
          invariant_snapshot?: Json | null
          mode?: string
          org_id?: string
          prev_hash?: string | null
          reason?: string | null
          seq?: number
          session_id?: string | null
          timestamp_ms?: number
        }
        Relationships: []
      }
      dsg_agents: {
        Row: {
          api_key: string
          claim_code: string
          claimed_at: string | null
          created_at: string | null
          human_email: string | null
          human_id: string | null
          id: string
          last_heartbeat: string | null
          name: string
          status: string | null
          updated_at: string | null
          username: string
        }
        Insert: {
          api_key: string
          claim_code: string
          claimed_at?: string | null
          created_at?: string | null
          human_email?: string | null
          human_id?: string | null
          id?: string
          last_heartbeat?: string | null
          name: string
          status?: string | null
          updated_at?: string | null
          username: string
        }
        Update: {
          api_key?: string
          claim_code?: string
          claimed_at?: string | null
          created_at?: string | null
          human_email?: string | null
          human_id?: string | null
          id?: string
          last_heartbeat?: string | null
          name?: string
          status?: string | null
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      dsg_api_calls: {
        Row: {
          actor_type: string
          api_key_id: string | null
          called_at: string
          duration_ms: number | null
          gate_status: string | null
          id: string
          method: string
          org_id: string
          proof_id: string | null
          route: string
          status_code: number | null
          user_id: string | null
        }
        Insert: {
          actor_type: string
          api_key_id?: string | null
          called_at?: string
          duration_ms?: number | null
          gate_status?: string | null
          id?: string
          method?: string
          org_id: string
          proof_id?: string | null
          route: string
          status_code?: number | null
          user_id?: string | null
        }
        Update: {
          actor_type?: string
          api_key_id?: string | null
          called_at?: string
          duration_ms?: number | null
          gate_status?: string | null
          id?: string
          method?: string
          org_id?: string
          proof_id?: string | null
          route?: string
          status_code?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dsg_api_calls_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_key_usage_summary"
            referencedColumns: ["key_id"]
          },
          {
            foreignKeyName: "dsg_api_calls_api_key_id_fkey"
            columns: ["api_key_id"]
            isOneToOne: false
            referencedRelation: "api_keys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dsg_api_calls_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dsg_api_calls_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      dsg_app_builder_approvals: {
        Row: {
          app_builder_job_id: string
          approval_hash: string | null
          created_at: string
          decided_by: string
          decision: string
          gate_result: Json | null
          id: string
          plan_hash: string | null
          reason: string | null
          workspace_id: string
        }
        Insert: {
          app_builder_job_id: string
          approval_hash?: string | null
          created_at?: string
          decided_by: string
          decision: string
          gate_result?: Json | null
          id?: string
          plan_hash?: string | null
          reason?: string | null
          workspace_id: string
        }
        Update: {
          app_builder_job_id?: string
          approval_hash?: string | null
          created_at?: string
          decided_by?: string
          decision?: string
          gate_result?: Json | null
          id?: string
          plan_hash?: string | null
          reason?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dsg_app_builder_approvals_app_builder_job_id_fkey"
            columns: ["app_builder_job_id"]
            isOneToOne: false
            referencedRelation: "dsg_app_builder_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      dsg_app_builder_jobs: {
        Row: {
          approval_hash: string | null
          approved_plan: Json | null
          claim_status: string
          created_at: string
          created_by: string
          gate_result: Json | null
          goal: Json | null
          id: string
          metadata: Json
          plan_hash: string | null
          prd: Json | null
          proposed_plan: Json | null
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          approval_hash?: string | null
          approved_plan?: Json | null
          claim_status?: string
          created_at?: string
          created_by: string
          gate_result?: Json | null
          goal?: Json | null
          id?: string
          metadata?: Json
          plan_hash?: string | null
          prd?: Json | null
          proposed_plan?: Json | null
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          approval_hash?: string | null
          approved_plan?: Json | null
          claim_status?: string
          created_at?: string
          created_by?: string
          gate_result?: Json | null
          goal?: Json | null
          id?: string
          metadata?: Json
          plan_hash?: string | null
          prd?: Json | null
          proposed_plan?: Json | null
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      dsg_app_builder_tool_audits: {
        Row: {
          actor_id: string
          app_builder_job_id: string
          audit_event: Json
          created_at: string
          evidence_refs: Json
          id: string
          outcome: string
          tool_name: string
          workspace_id: string
        }
        Insert: {
          actor_id: string
          app_builder_job_id: string
          audit_event?: Json
          created_at?: string
          evidence_refs?: Json
          id?: string
          outcome: string
          tool_name: string
          workspace_id: string
        }
        Update: {
          actor_id?: string
          app_builder_job_id?: string
          audit_event?: Json
          created_at?: string
          evidence_refs?: Json
          id?: string
          outcome?: string
          tool_name?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dsg_app_builder_tool_audits_app_builder_job_id_fkey"
            columns: ["app_builder_job_id"]
            isOneToOne: false
            referencedRelation: "dsg_app_builder_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      dsg_app_builds: {
        Row: {
          app_name: string
          created_at: string
          deployed_at: string | null
          description: string | null
          id: string
          lines_added: number
          lines_removed: number
          status: string
          template: string | null
          user_id: string
        }
        Insert: {
          app_name: string
          created_at?: string
          deployed_at?: string | null
          description?: string | null
          id?: string
          lines_added?: number
          lines_removed?: number
          status?: string
          template?: string | null
          user_id: string
        }
        Update: {
          app_name?: string
          created_at?: string
          deployed_at?: string | null
          description?: string | null
          id?: string
          lines_added?: number
          lines_removed?: number
          status?: string
          template?: string | null
          user_id?: string
        }
        Relationships: []
      }
      dsg_approvals: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision: string
          id: string
          job_id: string
          reason: string | null
          requested_by: string
          step_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision?: string
          id?: string
          job_id: string
          reason?: string | null
          requested_by: string
          step_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision?: string
          id?: string
          job_id?: string
          reason?: string | null
          requested_by?: string
          step_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dsg_approvals_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "dsg_runtime_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dsg_approvals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "dsg_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      dsg_audit_exports: {
        Row: {
          created_at: string
          created_by: string
          export_hash: string
          id: string
          job_id: string
          ledger_entry_ids: string[]
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          export_hash: string
          id?: string
          job_id: string
          ledger_entry_ids?: string[]
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          export_hash?: string
          id?: string
          job_id?: string
          ledger_entry_ids?: string[]
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dsg_audit_exports_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "dsg_runtime_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dsg_audit_exports_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "dsg_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      dsg_audit_ledger: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          current_hash: string
          decision: string
          evidence_ids: string[]
          id: string
          job_id: string | null
          payload: Json
          previous_hash: string | null
          workspace_id: string
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          current_hash: string
          decision: string
          evidence_ids?: string[]
          id?: string
          job_id?: string | null
          payload?: Json
          previous_hash?: string | null
          workspace_id: string
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          current_hash?: string
          decision?: string
          evidence_ids?: string[]
          id?: string
          job_id?: string | null
          payload?: Json
          previous_hash?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dsg_audit_ledger_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "dsg_runtime_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dsg_audit_ledger_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "dsg_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      dsg_completion_reports: {
        Row: {
          audit_export_id: string | null
          block_reasons: string[]
          claim_status: string
          created_at: string
          created_by: string
          evidence_manifest_id: string | null
          id: string
          job_id: string
          replay_proof_id: string | null
          report_hash: string
          workspace_id: string
        }
        Insert: {
          audit_export_id?: string | null
          block_reasons?: string[]
          claim_status: string
          created_at?: string
          created_by: string
          evidence_manifest_id?: string | null
          id?: string
          job_id: string
          replay_proof_id?: string | null
          report_hash: string
          workspace_id: string
        }
        Update: {
          audit_export_id?: string | null
          block_reasons?: string[]
          claim_status?: string
          created_at?: string
          created_by?: string
          evidence_manifest_id?: string | null
          id?: string
          job_id?: string
          replay_proof_id?: string | null
          report_hash?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dsg_completion_reports_audit_export_id_fkey"
            columns: ["audit_export_id"]
            isOneToOne: false
            referencedRelation: "dsg_audit_exports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dsg_completion_reports_evidence_manifest_id_fkey"
            columns: ["evidence_manifest_id"]
            isOneToOne: false
            referencedRelation: "dsg_evidence_manifests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dsg_completion_reports_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "dsg_runtime_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dsg_completion_reports_replay_proof_id_fkey"
            columns: ["replay_proof_id"]
            isOneToOne: false
            referencedRelation: "dsg_replay_proofs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dsg_completion_reports_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "dsg_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      dsg_component_capabilities: {
        Row: {
          capability_name: string
          capability_type: string
          component_id: string
          cost_estimate: number | null
          created_at: string
          id: string
          metadata: Json | null
          quota_limit: Json | null
          required_policy: string | null
          required_role: string | null
          updated_at: string
        }
        Insert: {
          capability_name: string
          capability_type: string
          component_id: string
          cost_estimate?: number | null
          created_at?: string
          id?: string
          metadata?: Json | null
          quota_limit?: Json | null
          required_policy?: string | null
          required_role?: string | null
          updated_at?: string
        }
        Update: {
          capability_name?: string
          capability_type?: string
          component_id?: string
          cost_estimate?: number | null
          created_at?: string
          id?: string
          metadata?: Json | null
          quota_limit?: Json | null
          required_policy?: string | null
          required_role?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dsg_component_capabilities_component_id_fkey"
            columns: ["component_id"]
            isOneToOne: false
            referencedRelation: "dsg_system_components"
            referencedColumns: ["id"]
          },
        ]
      }
      dsg_component_dependencies: {
        Row: {
          created_at: string
          dependency_type: string
          description: string | null
          from_component_id: string
          id: string
          strength: string | null
          to_component_id: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          dependency_type: string
          description?: string | null
          from_component_id: string
          id?: string
          strength?: string | null
          to_component_id: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          dependency_type?: string
          description?: string | null
          from_component_id?: string
          id?: string
          strength?: string | null
          to_component_id?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dsg_component_dependencies_from_component_id_fkey"
            columns: ["from_component_id"]
            isOneToOne: false
            referencedRelation: "dsg_system_components"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dsg_component_dependencies_to_component_id_fkey"
            columns: ["to_component_id"]
            isOneToOne: false
            referencedRelation: "dsg_system_components"
            referencedColumns: ["id"]
          },
        ]
      }
      dsg_connectors: {
        Row: {
          active: boolean
          auth_type: string
          config: Json
          created_at: string
          created_by: string
          id: string
          name: string
          provider: string
          risk_level: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          active?: boolean
          auth_type?: string
          config?: Json
          created_at?: string
          created_by: string
          id?: string
          name: string
          provider: string
          risk_level?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          active?: boolean
          auth_type?: string
          config?: Json
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          provider?: string
          risk_level?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dsg_connectors_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "dsg_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      dsg_constraint_sets: {
        Row: {
          allowed_capabilities: string[]
          allowed_components: string[]
          blocked_components: string[] | null
          created_at: string
          description: string | null
          id: string
          max_cost_per_execution: number | null
          max_duration_seconds: number | null
          max_parallel_executions: number | null
          max_tokens_output: number | null
          metadata: Json | null
          organization_id: string
          requires_human_approval: boolean | null
          requires_org_owner_role: boolean | null
          set_name: string
          updated_at: string
        }
        Insert: {
          allowed_capabilities?: string[]
          allowed_components?: string[]
          blocked_components?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          max_cost_per_execution?: number | null
          max_duration_seconds?: number | null
          max_parallel_executions?: number | null
          max_tokens_output?: number | null
          metadata?: Json | null
          organization_id: string
          requires_human_approval?: boolean | null
          requires_org_owner_role?: boolean | null
          set_name: string
          updated_at?: string
        }
        Update: {
          allowed_capabilities?: string[]
          allowed_components?: string[]
          blocked_components?: string[] | null
          created_at?: string
          description?: string | null
          id?: string
          max_cost_per_execution?: number | null
          max_duration_seconds?: number | null
          max_parallel_executions?: number | null
          max_tokens_output?: number | null
          metadata?: Json | null
          organization_id?: string
          requires_human_approval?: boolean | null
          requires_org_owner_role?: boolean | null
          set_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dsg_constraint_sets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "dsg_organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dsg_credential_leases: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          lease_id: string
          max_renewals: number | null
          redaction_fingerprint: string
          renewals: number | null
          secret_name: string
          valid: boolean | null
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          lease_id: string
          max_renewals?: number | null
          redaction_fingerprint: string
          renewals?: number | null
          secret_name: string
          valid?: boolean | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          lease_id?: string
          max_renewals?: number | null
          redaction_fingerprint?: string
          renewals?: number | null
          secret_name?: string
          valid?: boolean | null
        }
        Relationships: []
      }
      dsg_crud_proof_tasks: {
        Row: {
          created_at: string
          done: boolean
          id: string
          metadata: Json
          org_id: string
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          done?: boolean
          id?: string
          metadata?: Json
          org_id: string
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          done?: boolean
          id?: string
          metadata?: Json
          org_id?: string
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      dsg_deployment_proofs: {
        Row: {
          checked_by: string
          created_at: string
          deployment_url: string
          details: Json
          environment: string
          id: string
          job_id: string | null
          proof_hash: string
          status: string
          workspace_id: string
        }
        Insert: {
          checked_by: string
          created_at?: string
          deployment_url: string
          details?: Json
          environment: string
          id?: string
          job_id?: string | null
          proof_hash: string
          status: string
          workspace_id: string
        }
        Update: {
          checked_by?: string
          created_at?: string
          deployment_url?: string
          details?: Json
          environment?: string
          id?: string
          job_id?: string | null
          proof_hash?: string
          status?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dsg_deployment_proofs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "dsg_runtime_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dsg_deployment_proofs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "dsg_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      dsg_determinism_ledger: {
        Row: {
          chain_hash: string
          created_at: string
          created_by: string | null
          decision_hash: string
          decision_outcome: string
          decision_reason: string
          entry_id: string
          evidence: Json | null
          id: number
          merkle_leaf_hash: string | null
          metadata: Json | null
          org_id: string
          request_hash: string
          risk_score: number | null
          sequence_number: number
          verified: boolean
        }
        Insert: {
          chain_hash: string
          created_at?: string
          created_by?: string | null
          decision_hash: string
          decision_outcome: string
          decision_reason: string
          entry_id: string
          evidence?: Json | null
          id?: number
          merkle_leaf_hash?: string | null
          metadata?: Json | null
          org_id: string
          request_hash: string
          risk_score?: number | null
          sequence_number: number
          verified?: boolean
        }
        Update: {
          chain_hash?: string
          created_at?: string
          created_by?: string | null
          decision_hash?: string
          decision_outcome?: string
          decision_reason?: string
          entry_id?: string
          evidence?: Json | null
          id?: number
          merkle_leaf_hash?: string | null
          metadata?: Json | null
          org_id?: string
          request_hash?: string
          risk_score?: number | null
          sequence_number?: number
          verified?: boolean
        }
        Relationships: []
      }
      dsg_determinism_merkle_checkpoints: {
        Row: {
          checkpoint_sequence: number
          created_at: string
          id: number
          merkle_root_hash: string
          org_id: string
          total_entries: number
        }
        Insert: {
          checkpoint_sequence: number
          created_at?: string
          id?: number
          merkle_root_hash: string
          org_id: string
          total_entries: number
        }
        Update: {
          checkpoint_sequence?: number
          created_at?: string
          id?: number
          merkle_root_hash?: string
          org_id?: string
          total_entries?: number
        }
        Relationships: []
      }
      dsg_determinism_sequences: {
        Row: {
          current_sequence: number
          last_updated_at: string
          org_id: string
        }
        Insert: {
          current_sequence?: number
          last_updated_at?: string
          org_id: string
        }
        Update: {
          current_sequence?: number
          last_updated_at?: string
          org_id?: string
        }
        Relationships: []
      }
      dsg_evidence_items: {
        Row: {
          content_hash: string
          created_at: string
          created_by: string
          evidence_type: string
          id: string
          job_id: string
          metadata: Json
          summary: string
          uri: string | null
          workspace_id: string
        }
        Insert: {
          content_hash: string
          created_at?: string
          created_by: string
          evidence_type: string
          id?: string
          job_id: string
          metadata?: Json
          summary: string
          uri?: string | null
          workspace_id: string
        }
        Update: {
          content_hash?: string
          created_at?: string
          created_by?: string
          evidence_type?: string
          id?: string
          job_id?: string
          metadata?: Json
          summary?: string
          uri?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dsg_evidence_items_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "dsg_runtime_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dsg_evidence_items_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "dsg_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      dsg_evidence_manifests: {
        Row: {
          created_at: string
          created_by: string
          evidence_ids: string[]
          id: string
          job_id: string
          manifest_hash: string
          status: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          evidence_ids?: string[]
          id?: string
          job_id: string
          manifest_hash: string
          status?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          evidence_ids?: string[]
          id?: string
          job_id?: string
          manifest_hash?: string
          status?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dsg_evidence_manifests_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "dsg_runtime_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dsg_evidence_manifests_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "dsg_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      dsg_execution_grants: {
        Row: {
          created_at: string | null
          expires_at: string
          grant_id: string
          id: string
          issued_at: string
          max_renewals: number | null
          plan_hash: string
          renewals: number | null
          ttl_ms: number
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          grant_id: string
          id?: string
          issued_at: string
          max_renewals?: number | null
          plan_hash: string
          renewals?: number | null
          ttl_ms: number
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          grant_id?: string
          id?: string
          issued_at?: string
          max_renewals?: number | null
          plan_hash?: string
          renewals?: number | null
          ttl_ms?: number
        }
        Relationships: []
      }
      dsg_gate_decisions: {
        Row: {
          compliance_tags: string[] | null
          constraint_set: Json
          created_at: string
          created_by: string | null
          decision: string
          decision_confidence: number | null
          evidence_retention_until: string | null
          id: string
          input_hash: string
          org_id: string
          parent_decision_id: string | null
          parent_proof_hash: string | null
          policy_version: string
          proof_format: string | null
          proof_hash: string
          z3_error: string | null
          z3_satisfiable: boolean | null
          z3_smt2_hash: string | null
          z3_solver_version: string | null
          z3_status: string | null
          z3_time_ms: number | null
          z3_trace: Json | null
        }
        Insert: {
          compliance_tags?: string[] | null
          constraint_set: Json
          created_at?: string
          created_by?: string | null
          decision: string
          decision_confidence?: number | null
          evidence_retention_until?: string | null
          id?: string
          input_hash: string
          org_id: string
          parent_decision_id?: string | null
          parent_proof_hash?: string | null
          policy_version: string
          proof_format?: string | null
          proof_hash: string
          z3_error?: string | null
          z3_satisfiable?: boolean | null
          z3_smt2_hash?: string | null
          z3_solver_version?: string | null
          z3_status?: string | null
          z3_time_ms?: number | null
          z3_trace?: Json | null
        }
        Update: {
          compliance_tags?: string[] | null
          constraint_set?: Json
          created_at?: string
          created_by?: string | null
          decision?: string
          decision_confidence?: number | null
          evidence_retention_until?: string | null
          id?: string
          input_hash?: string
          org_id?: string
          parent_decision_id?: string | null
          parent_proof_hash?: string | null
          policy_version?: string
          proof_format?: string | null
          proof_hash?: string
          z3_error?: string | null
          z3_satisfiable?: boolean | null
          z3_smt2_hash?: string | null
          z3_solver_version?: string | null
          z3_status?: string | null
          z3_time_ms?: number | null
          z3_trace?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "dsg_gate_decisions_parent_decision_id_fkey"
            columns: ["parent_decision_id"]
            isOneToOne: false
            referencedRelation: "dsg_gate_decisions"
            referencedColumns: ["id"]
          },
        ]
      }
      dsg_gate_entitlements: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          evals_per_month: number
          id: string
          org_id: string
          overage_enabled: boolean
          stripe_customer_id: string | null
          stripe_meter_event_name: string | null
          stripe_subscription_id: string | null
          subscription_status: string
          tier: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          evals_per_month?: number
          id?: string
          org_id: string
          overage_enabled?: boolean
          stripe_customer_id?: string | null
          stripe_meter_event_name?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string
          tier?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          evals_per_month?: number
          id?: string
          org_id?: string
          overage_enabled?: boolean
          stripe_customer_id?: string | null
          stripe_meter_event_name?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string
          tier?: string
          updated_at?: string
        }
        Relationships: []
      }
      dsg_gate_usage: {
        Row: {
          billed: boolean
          created_at: string
          duration_ms: number | null
          eval_id: string
          gate_status: string
          id: string
          meter_event_id: string | null
          org_id: string
          route: string
          usage_position: number | null
        }
        Insert: {
          billed?: boolean
          created_at?: string
          duration_ms?: number | null
          eval_id: string
          gate_status: string
          id?: string
          meter_event_id?: string | null
          org_id: string
          route: string
          usage_position?: number | null
        }
        Update: {
          billed?: boolean
          created_at?: string
          duration_ms?: number | null
          eval_id?: string
          gate_status?: string
          id?: string
          meter_event_id?: string | null
          org_id?: string
          route?: string
          usage_position?: number | null
        }
        Relationships: []
      }
      dsg_governance_decision_events: {
        Row: {
          action: string
          action_at: string
          actor_id: string
          actor_role: string | null
          created_at: string
          decision: string | null
          decision_id: string
          gate_id: string | null
          id: string
          metadata: Json
          org_id: string
          reason: string | null
        }
        Insert: {
          action: string
          action_at?: string
          actor_id: string
          actor_role?: string | null
          created_at?: string
          decision?: string | null
          decision_id: string
          gate_id?: string | null
          id?: string
          metadata?: Json
          org_id: string
          reason?: string | null
        }
        Update: {
          action?: string
          action_at?: string
          actor_id?: string
          actor_role?: string | null
          created_at?: string
          decision?: string | null
          decision_id?: string
          gate_id?: string | null
          id?: string
          metadata?: Json
          org_id?: string
          reason?: string | null
        }
        Relationships: []
      }
      dsg_graphmap_graphs: {
        Row: {
          built_at: string
          built_by: string
          created_at: string
          edge_count: number
          exclude_patterns: Json
          graph_data: Json
          id: string
          include_patterns: Json
          node_count: number
          warnings: string[]
          workspace_id: string
        }
        Insert: {
          built_at?: string
          built_by: string
          created_at?: string
          edge_count?: number
          exclude_patterns?: Json
          graph_data: Json
          id?: string
          include_patterns?: Json
          node_count?: number
          warnings?: string[]
          workspace_id: string
        }
        Update: {
          built_at?: string
          built_by?: string
          created_at?: string
          edge_count?: number
          exclude_patterns?: Json
          graph_data?: Json
          id?: string
          include_patterns?: Json
          node_count?: number
          warnings?: string[]
          workspace_id?: string
        }
        Relationships: []
      }
      dsg_input_locks: {
        Row: {
          canonical_input: Json
          created_at: string
          id: string
          input_hash: string
          job_id: string
          locked_by: string
          workspace_id: string
        }
        Insert: {
          canonical_input: Json
          created_at?: string
          id?: string
          input_hash: string
          job_id: string
          locked_by: string
          workspace_id: string
        }
        Update: {
          canonical_input?: Json
          created_at?: string
          id?: string
          input_hash?: string
          job_id?: string
          locked_by?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dsg_input_locks_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "dsg_runtime_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dsg_input_locks_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "dsg_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      dsg_inventory_snapshots: {
        Row: {
          components_added: number | null
          components_modified: number | null
          components_removed: number | null
          created_at: string
          created_by_user_id: string | null
          id: string
          snapshot_data: Json | null
          snapshot_hash: string | null
          snapshot_type: string
        }
        Insert: {
          components_added?: number | null
          components_modified?: number | null
          components_removed?: number | null
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          snapshot_data?: Json | null
          snapshot_hash?: string | null
          snapshot_type: string
        }
        Update: {
          components_added?: number | null
          components_modified?: number | null
          components_removed?: number | null
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          snapshot_data?: Json | null
          snapshot_hash?: string | null
          snapshot_type?: string
        }
        Relationships: []
      }
      dsg_launchpad_launches: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          sections: Json
          source: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          sections?: Json
          source?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          sections?: Json
          source?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      dsg_ledger_config: {
        Row: {
          audit_enabled: boolean
          chain_enabled: boolean
          created_at: string
          gate_enabled: boolean
          mode: string
          org_id: string
          updated_at: string
        }
        Insert: {
          audit_enabled?: boolean
          chain_enabled?: boolean
          created_at?: string
          gate_enabled?: boolean
          mode?: string
          org_id: string
          updated_at?: string
        }
        Update: {
          audit_enabled?: boolean
          chain_enabled?: boolean
          created_at?: string
          gate_enabled?: boolean
          mode?: string
          org_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      dsg_mcp_api_keys: {
        Row: {
          actor_id: string
          calls_limit: number
          created_at: string
          key_hash: string
          key_id: string
          key_prefix: string
          label: string
          period_end: string
          period_start: string
          plan_id: string
          revoked_at: string | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
        }
        Insert: {
          actor_id: string
          calls_limit?: number
          created_at?: string
          key_hash: string
          key_id?: string
          key_prefix: string
          label?: string
          period_end?: string
          period_start?: string
          plan_id?: string
          revoked_at?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
        }
        Update: {
          actor_id?: string
          calls_limit?: number
          created_at?: string
          key_hash?: string
          key_id?: string
          key_prefix?: string
          label?: string
          period_end?: string
          period_start?: string
          plan_id?: string
          revoked_at?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
        }
        Relationships: []
      }
      dsg_mcp_usage: {
        Row: {
          actor_id: string
          called_at: string
          key_id: string
          tool_name: string
          usage_id: string
        }
        Insert: {
          actor_id: string
          called_at?: string
          key_id: string
          tool_name: string
          usage_id?: string
        }
        Update: {
          actor_id?: string
          called_at?: string
          key_id?: string
          tool_name?: string
          usage_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dsg_mcp_usage_key_id_fkey"
            columns: ["key_id"]
            isOneToOne: false
            referencedRelation: "dsg_mcp_api_keys"
            referencedColumns: ["key_id"]
          },
        ]
      }
      dsg_memory_context_packs: {
        Row: {
          actor_id: string
          audit_ids: string[]
          context_hash: string
          context_text: string
          created_at: string
          evidence_ids: string[]
          gate_reasons: string[]
          gate_status: string
          id: string
          job_id: string | null
          memory_ids: string[]
          purpose: string
          workspace_id: string
        }
        Insert: {
          actor_id: string
          audit_ids?: string[]
          context_hash: string
          context_text: string
          created_at?: string
          evidence_ids?: string[]
          gate_reasons?: string[]
          gate_status: string
          id?: string
          job_id?: string | null
          memory_ids: string[]
          purpose: string
          workspace_id: string
        }
        Update: {
          actor_id?: string
          audit_ids?: string[]
          context_hash?: string
          context_text?: string
          created_at?: string
          evidence_ids?: string[]
          gate_reasons?: string[]
          gate_status?: string
          id?: string
          job_id?: string | null
          memory_ids?: string[]
          purpose?: string
          workspace_id?: string
        }
        Relationships: []
      }
      dsg_memory_edges: {
        Row: {
          confidence: number
          created_at: string
          edge_type: string
          from_memory_id: string
          id: string
          reason: string | null
          to_memory_id: string
          workspace_id: string
        }
        Insert: {
          confidence?: number
          created_at?: string
          edge_type: string
          from_memory_id: string
          id?: string
          reason?: string | null
          to_memory_id: string
          workspace_id: string
        }
        Update: {
          confidence?: number
          created_at?: string
          edge_type?: string
          from_memory_id?: string
          id?: string
          reason?: string | null
          to_memory_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dsg_memory_edges_from_memory_id_fkey"
            columns: ["from_memory_id"]
            isOneToOne: false
            referencedRelation: "dsg_memory_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dsg_memory_edges_to_memory_id_fkey"
            columns: ["to_memory_id"]
            isOneToOne: false
            referencedRelation: "dsg_memory_events"
            referencedColumns: ["id"]
          },
        ]
      }
      dsg_memory_events: {
        Row: {
          actor_id: string
          actor_role: string
          contains_legal_claim: boolean
          contains_pii: boolean
          contains_production_claim: boolean
          contains_secret: boolean
          content_hash: string
          created_at: string
          id: string
          job_id: string | null
          memory_kind: string
          metadata: Json
          normalized_summary: string | null
          raw_text: string
          source_audit_id: string | null
          source_evidence_id: string | null
          source_type: string
          status: string
          trust_level: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          actor_id: string
          actor_role: string
          contains_legal_claim?: boolean
          contains_pii?: boolean
          contains_production_claim?: boolean
          contains_secret?: boolean
          content_hash: string
          created_at?: string
          id?: string
          job_id?: string | null
          memory_kind: string
          metadata?: Json
          normalized_summary?: string | null
          raw_text: string
          source_audit_id?: string | null
          source_evidence_id?: string | null
          source_type: string
          status?: string
          trust_level?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          actor_id?: string
          actor_role?: string
          contains_legal_claim?: boolean
          contains_pii?: boolean
          contains_production_claim?: boolean
          contains_secret?: boolean
          content_hash?: string
          created_at?: string
          id?: string
          job_id?: string | null
          memory_kind?: string
          metadata?: Json
          normalized_summary?: string | null
          raw_text?: string
          source_audit_id?: string | null
          source_evidence_id?: string | null
          source_type?: string
          status?: string
          trust_level?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: []
      }
      dsg_memory_retrievals: {
        Row: {
          actor_id: string
          blocked_memory_ids: string[]
          context_pack_id: string | null
          created_at: string
          gate_reasons: string[]
          gate_status: string
          id: string
          job_id: string | null
          query_text: string
          retrieval_scope: Json
          retrieved_memory_ids: string[]
          review_memory_ids: string[]
          workspace_id: string
        }
        Insert: {
          actor_id: string
          blocked_memory_ids?: string[]
          context_pack_id?: string | null
          created_at?: string
          gate_reasons?: string[]
          gate_status: string
          id?: string
          job_id?: string | null
          query_text: string
          retrieval_scope?: Json
          retrieved_memory_ids?: string[]
          review_memory_ids?: string[]
          workspace_id: string
        }
        Update: {
          actor_id?: string
          blocked_memory_ids?: string[]
          context_pack_id?: string | null
          created_at?: string
          gate_reasons?: string[]
          gate_status?: string
          id?: string
          job_id?: string | null
          query_text?: string
          retrieval_scope?: Json
          retrieved_memory_ids?: string[]
          review_memory_ids?: string[]
          workspace_id?: string
        }
        Relationships: []
      }
      dsg_notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      dsg_organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      dsg_payout_policies: {
        Row: {
          allowed_currency: string
          allowed_days: Json
          allowed_destinations: Json
          allowed_time_end: string
          allowed_time_start: string
          approval_threshold_amount: number
          automation_enabled: boolean
          created_at: string
          critical_risk_action: string
          daily_limit: number
          emergency_paused: boolean
          high_risk_action: string
          id: string
          low_risk_action: string
          max_payout_amount: number
          max_payouts_per_day: number
          medium_risk_action: string
          min_minutes_between_payouts: number
          monthly_limit: number
          new_destination_hold_hours: number
          org_id: string
          two_person_approval_threshold: number | null
          updated_at: string
          weekly_limit: number
        }
        Insert: {
          allowed_currency?: string
          allowed_days?: Json
          allowed_destinations?: Json
          allowed_time_end?: string
          allowed_time_start?: string
          approval_threshold_amount?: number
          automation_enabled?: boolean
          created_at?: string
          critical_risk_action?: string
          daily_limit?: number
          emergency_paused?: boolean
          high_risk_action?: string
          id?: string
          low_risk_action?: string
          max_payout_amount?: number
          max_payouts_per_day?: number
          medium_risk_action?: string
          min_minutes_between_payouts?: number
          monthly_limit?: number
          new_destination_hold_hours?: number
          org_id: string
          two_person_approval_threshold?: number | null
          updated_at?: string
          weekly_limit?: number
        }
        Update: {
          allowed_currency?: string
          allowed_days?: Json
          allowed_destinations?: Json
          allowed_time_end?: string
          allowed_time_start?: string
          approval_threshold_amount?: number
          automation_enabled?: boolean
          created_at?: string
          critical_risk_action?: string
          daily_limit?: number
          emergency_paused?: boolean
          high_risk_action?: string
          id?: string
          low_risk_action?: string
          max_payout_amount?: number
          max_payouts_per_day?: number
          medium_risk_action?: string
          min_minutes_between_payouts?: number
          monthly_limit?: number
          new_destination_hold_hours?: number
          org_id?: string
          two_person_approval_threshold?: number | null
          updated_at?: string
          weekly_limit?: number
        }
        Relationships: []
      }
      dsg_payout_usage: {
        Row: {
          amount: number
          currency: string
          decision: string
          destination_id: string | null
          evaluated_at: string
          id: string
          org_id: string
          payout_ref: string | null
        }
        Insert: {
          amount: number
          currency?: string
          decision: string
          destination_id?: string | null
          evaluated_at?: string
          id?: string
          org_id: string
          payout_ref?: string | null
        }
        Update: {
          amount?: number
          currency?: string
          decision?: string
          destination_id?: string | null
          evaluated_at?: string
          id?: string
          org_id?: string
          payout_ref?: string | null
        }
        Relationships: []
      }
      dsg_production_flow_proofs: {
        Row: {
          checked_by: string
          created_at: string
          details: Json
          flow_name: string
          id: string
          job_id: string | null
          proof_hash: string
          status: string
          workspace_id: string
        }
        Insert: {
          checked_by: string
          created_at?: string
          details?: Json
          flow_name: string
          id?: string
          job_id?: string | null
          proof_hash: string
          status: string
          workspace_id: string
        }
        Update: {
          checked_by?: string
          created_at?: string
          details?: Json
          flow_name?: string
          id?: string
          job_id?: string | null
          proof_hash?: string
          status?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dsg_production_flow_proofs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "dsg_runtime_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dsg_production_flow_proofs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "dsg_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      dsg_replay_proofs: {
        Row: {
          checked_by: string
          created_at: string
          details: Json
          id: string
          job_id: string
          replay_hash: string
          status: string
          workspace_id: string
        }
        Insert: {
          checked_by: string
          created_at?: string
          details?: Json
          id?: string
          job_id: string
          replay_hash: string
          status: string
          workspace_id: string
        }
        Update: {
          checked_by?: string
          created_at?: string
          details?: Json
          id?: string
          job_id?: string
          replay_hash?: string
          status?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dsg_replay_proofs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "dsg_runtime_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dsg_replay_proofs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "dsg_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      dsg_reviewer_allowlist: {
        Row: {
          created_at: string
          email: string
          provider: string
          purpose: string
          role: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          provider?: string
          purpose?: string
          role?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          provider?: string
          purpose?: string
          role?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      dsg_runtime_events: {
        Row: {
          actor_id: string
          created_at: string
          event_type: string
          id: string
          job_id: string
          message: string
          payload: Json
          risk_level: string
          workspace_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          event_type: string
          id?: string
          job_id: string
          message: string
          payload?: Json
          risk_level?: string
          workspace_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          event_type?: string
          id?: string
          job_id?: string
          message?: string
          payload?: Json
          risk_level?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dsg_runtime_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "dsg_runtime_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dsg_runtime_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "dsg_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      dsg_runtime_jobs: {
        Row: {
          completion_report_id: string | null
          created_at: string
          created_by: string
          current_step_id: string | null
          current_wave_id: string | null
          goal: string
          id: string
          input_lock_id: string | null
          metadata: Json
          risk_level: string
          status: string
          success_criteria: Json
          updated_at: string
          workspace_id: string
        }
        Insert: {
          completion_report_id?: string | null
          created_at?: string
          created_by: string
          current_step_id?: string | null
          current_wave_id?: string | null
          goal: string
          id?: string
          input_lock_id?: string | null
          metadata?: Json
          risk_level?: string
          status?: string
          success_criteria?: Json
          updated_at?: string
          workspace_id: string
        }
        Update: {
          completion_report_id?: string | null
          created_at?: string
          created_by?: string
          current_step_id?: string | null
          current_wave_id?: string | null
          goal?: string
          id?: string
          input_lock_id?: string | null
          metadata?: Json
          risk_level?: string
          status?: string
          success_criteria?: Json
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dsg_runtime_jobs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "dsg_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      dsg_schema_meta: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      dsg_secrets: {
        Row: {
          created_at: string | null
          created_by: string | null
          deleted_at: string | null
          encryption_algorithm: string | null
          encryption_key_version: number | null
          id: string
          name: string
          org_id: string | null
          updated_at: string | null
          value: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          encryption_algorithm?: string | null
          encryption_key_version?: number | null
          id?: string
          name: string
          org_id?: string | null
          updated_at?: string | null
          value: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          deleted_at?: string | null
          encryption_algorithm?: string | null
          encryption_key_version?: number | null
          id?: string
          name?: string
          org_id?: string | null
          updated_at?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "dsg_secrets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dsg_secrets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dsg_system_components: {
        Row: {
          category: string | null
          component_type: string
          created_at: string
          description: string | null
          display_name: string | null
          health_status: string | null
          id: string
          last_verified_at: string | null
          metadata: Json | null
          name: string
          path_or_id: string
          status: string | null
          tier: string | null
        }
        Insert: {
          category?: string | null
          component_type: string
          created_at?: string
          description?: string | null
          display_name?: string | null
          health_status?: string | null
          id?: string
          last_verified_at?: string | null
          metadata?: Json | null
          name: string
          path_or_id: string
          status?: string | null
          tier?: string | null
        }
        Update: {
          category?: string | null
          component_type?: string
          created_at?: string
          description?: string | null
          display_name?: string | null
          health_status?: string | null
          id?: string
          last_verified_at?: string | null
          metadata?: Json | null
          name?: string
          path_or_id?: string
          status?: string | null
          tier?: string | null
        }
        Relationships: []
      }
      dsg_task_plans: {
        Row: {
          created_at: string
          created_by: string
          dependency_edges: Json
          id: string
          job_id: string
          plan_hash: string
          status: string
          tasks: Json
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          dependency_edges?: Json
          id?: string
          job_id: string
          plan_hash: string
          status?: string
          tasks?: Json
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          dependency_edges?: Json
          id?: string
          job_id?: string
          plan_hash?: string
          status?: string
          tasks?: Json
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dsg_task_plans_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "dsg_runtime_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dsg_task_plans_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "dsg_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      dsg_template_sales: {
        Row: {
          buyer_id: string
          commission_rate_bps: number
          created_at: string
          creator_payout_satang: number
          platform_fee_satang: number
          price_satang: number
          sale_id: string
          seller_id: string
          status: string
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          template_id: string
        }
        Insert: {
          buyer_id: string
          commission_rate_bps?: number
          created_at?: string
          creator_payout_satang: number
          platform_fee_satang: number
          price_satang: number
          sale_id?: string
          seller_id: string
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          template_id: string
        }
        Update: {
          buyer_id?: string
          commission_rate_bps?: number
          created_at?: string
          creator_payout_satang?: number
          platform_fee_satang?: number
          price_satang?: number
          sale_id?: string
          seller_id?: string
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dsg_template_sales_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "dsg_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      dsg_templates: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          name: string
          popular: boolean
          price_satang: number
          seller_id: string | null
          sharing_mode: string
          slug: string
          stack: string[]
          stars: number
          version: string
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          id?: string
          name: string
          popular?: boolean
          price_satang?: number
          seller_id?: string | null
          sharing_mode?: string
          slug: string
          stack?: string[]
          stars?: number
          version?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          name?: string
          popular?: boolean
          price_satang?: number
          seller_id?: string | null
          sharing_mode?: string
          slug?: string
          stack?: string[]
          stars?: number
          version?: string
        }
        Relationships: []
      }
      dsg_tool_registry: {
        Row: {
          connector_id: string | null
          created_at: string
          description: string
          id: string
          method: string | null
          path: string | null
          requires_approval: boolean
          risk_level: string
          schema: Json
          tool_name: string
          workspace_id: string
        }
        Insert: {
          connector_id?: string | null
          created_at?: string
          description: string
          id?: string
          method?: string | null
          path?: string | null
          requires_approval?: boolean
          risk_level?: string
          schema?: Json
          tool_name: string
          workspace_id: string
        }
        Update: {
          connector_id?: string | null
          created_at?: string
          description?: string
          id?: string
          method?: string | null
          path?: string | null
          requires_approval?: boolean
          risk_level?: string
          schema?: Json
          tool_name?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dsg_tool_registry_connector_id_fkey"
            columns: ["connector_id"]
            isOneToOne: false
            referencedRelation: "dsg_connectors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dsg_tool_registry_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "dsg_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      dsg_ui_memory: {
        Row: {
          created_at: string
          id: string
          memory_key: string
          org_id: string
          page_key: string
          payload: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          memory_key?: string
          org_id: string
          page_key: string
          payload?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          memory_key?: string
          org_id?: string
          page_key?: string
          payload?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      dsg_wave_plans: {
        Row: {
          created_at: string
          current_wave_index: number
          id: string
          job_id: string
          status: string
          task_plan_id: string
          wave_hash: string
          waves: Json
          workspace_id: string
        }
        Insert: {
          created_at?: string
          current_wave_index?: number
          id?: string
          job_id: string
          status?: string
          task_plan_id: string
          wave_hash: string
          waves?: Json
          workspace_id: string
        }
        Update: {
          created_at?: string
          current_wave_index?: number
          id?: string
          job_id?: string
          status?: string
          task_plan_id?: string
          wave_hash?: string
          waves?: Json
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dsg_wave_plans_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "dsg_runtime_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dsg_wave_plans_task_plan_id_fkey"
            columns: ["task_plan_id"]
            isOneToOne: false
            referencedRelation: "dsg_task_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dsg_wave_plans_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "dsg_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      dsg_workspace_members: {
        Row: {
          actor_id: string
          created_at: string
          id: string
          role: string
          workspace_id: string
        }
        Insert: {
          actor_id: string
          created_at?: string
          id?: string
          role: string
          workspace_id: string
        }
        Update: {
          actor_id?: string
          created_at?: string
          id?: string
          role?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dsg_workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "dsg_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      dsg_workspaces: {
        Row: {
          created_at: string
          created_by: string
          id: string
          metadata: Json
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          metadata?: Json
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          metadata?: Json
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      earnings_records: {
        Row: {
          agent_id: string
          amount: number
          created_at: string
          currency: string
          id: string
          job_id: string
          tx_signature: string
        }
        Insert: {
          agent_id: string
          amount: number
          created_at?: string
          currency?: string
          id?: string
          job_id: string
          tx_signature: string
        }
        Update: {
          agent_id?: string
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          job_id?: string
          tx_signature?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_earnings_agent_id"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_profiles"
            referencedColumns: ["agent_id"]
          },
        ]
      }
      enterprise_leads: {
        Row: {
          company: string | null
          created_at: string | null
          email: string | null
          id: number
          name: string | null
          use_case: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          email?: string | null
          id?: never
          name?: string | null
          use_case?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string | null
          email?: string | null
          id?: never
          name?: string | null
          use_case?: string | null
        }
        Relationships: []
      }
      execution_audit: {
        Row: {
          action_type: string | null
          agent: string | null
          decision: string | null
          drift: number | null
          entropy: number | null
          harmonic_center: number | null
          hash: string | null
          hash_prev: string | null
          id: number
          next_state: Json | null
          phase: string | null
          prev_state: Json | null
          reason: string | null
          stability: number | null
          timestamp: string | null
        }
        Insert: {
          action_type?: string | null
          agent?: string | null
          decision?: string | null
          drift?: number | null
          entropy?: number | null
          harmonic_center?: number | null
          hash?: string | null
          hash_prev?: string | null
          id?: never
          next_state?: Json | null
          phase?: string | null
          prev_state?: Json | null
          reason?: string | null
          stability?: number | null
          timestamp?: string | null
        }
        Update: {
          action_type?: string | null
          agent?: string | null
          decision?: string | null
          drift?: number | null
          entropy?: number | null
          harmonic_center?: number | null
          hash?: string | null
          hash_prev?: string | null
          id?: never
          next_state?: Json | null
          phase?: string | null
          prev_state?: Json | null
          reason?: string | null
          stability?: number | null
          timestamp?: string | null
        }
        Relationships: []
      }
      executions: {
        Row: {
          agent_id: string
          context_payload: Json | null
          created_at: string
          decision: string
          id: string
          latency_ms: number
          metadata: Json
          org_id: string | null
          policy_version: string | null
          reason: string | null
          request_payload: Json | null
        }
        Insert: {
          agent_id: string
          context_payload?: Json | null
          created_at?: string
          decision: string
          id?: string
          latency_ms?: number
          metadata?: Json
          org_id?: string | null
          policy_version?: string | null
          reason?: string | null
          request_payload?: Json | null
        }
        Update: {
          agent_id?: string
          context_payload?: Json | null
          created_at?: string
          decision?: string
          id?: string
          latency_ms?: number
          metadata?: Json
          org_id?: string | null
          policy_version?: string | null
          reason?: string | null
          request_payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "executions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "executions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "dashboard_agent_status"
            referencedColumns: ["agent_id"]
          },
          {
            foreignKeyName: "executions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      faq_entries: {
        Row: {
          answer: string
          category: string
          created_at: string
          created_by: string
          id: string
          is_published: boolean
          order_index: number
          org_id: string
          question: string
          search_keywords: string[] | null
          updated_at: string
        }
        Insert: {
          answer: string
          category: string
          created_at?: string
          created_by: string
          id?: string
          is_published?: boolean
          order_index?: number
          org_id: string
          question: string
          search_keywords?: string[] | null
          updated_at?: string
        }
        Update: {
          answer?: string
          category?: string
          created_at?: string
          created_by?: string
          id?: string
          is_published?: boolean
          order_index?: number
          org_id?: string
          question?: string
          search_keywords?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      finance_approval_decisions: {
        Row: {
          actor: string
          approval_request_id: string
          created_at: string
          decision: string
          id: string
          metadata: Json
          org_id: string
          reason: string | null
        }
        Insert: {
          actor?: string
          approval_request_id: string
          created_at?: string
          decision: string
          id?: string
          metadata?: Json
          org_id: string
          reason?: string | null
        }
        Update: {
          actor?: string
          approval_request_id?: string
          created_at?: string
          decision?: string
          id?: string
          metadata?: Json
          org_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_approval_decisions_approval_request_id_fkey"
            columns: ["approval_request_id"]
            isOneToOne: false
            referencedRelation: "finance_approval_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_approval_requests: {
        Row: {
          created_at: string
          id: string
          metadata: Json
          org_id: string
          risk: string
          status: string
          transaction_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          metadata?: Json
          org_id: string
          risk?: string
          status?: string
          transaction_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json
          org_id?: string
          risk?: string
          status?: string
          transaction_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_approval_requests_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "finance_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_approval_steps: {
        Row: {
          approval_request_id: string
          approver_role: string
          created_at: string
          id: string
          org_id: string
          status: string
          step_order: number
        }
        Insert: {
          approval_request_id: string
          approver_role: string
          created_at?: string
          id?: string
          org_id: string
          status?: string
          step_order: number
        }
        Update: {
          approval_request_id?: string
          approver_role?: string
          created_at?: string
          id?: string
          org_id?: string
          status?: string
          step_order?: number
        }
        Relationships: []
      }
      finance_evidence_bundles: {
        Row: {
          approval_request_id: string
          created_at: string
          id: string
          org_id: string
          status: string
          uri: string | null
        }
        Insert: {
          approval_request_id: string
          created_at?: string
          id?: string
          org_id: string
          status?: string
          uri?: string | null
        }
        Update: {
          approval_request_id?: string
          created_at?: string
          id?: string
          org_id?: string
          status?: string
          uri?: string | null
        }
        Relationships: []
      }
      finance_exceptions: {
        Row: {
          approval_request_id: string
          created_at: string
          id: string
          org_id: string
          reason: string | null
          resolved_at: string | null
          status: string
        }
        Insert: {
          approval_request_id: string
          created_at?: string
          id?: string
          org_id: string
          reason?: string | null
          resolved_at?: string | null
          status?: string
        }
        Update: {
          approval_request_id?: string
          created_at?: string
          id?: string
          org_id?: string
          reason?: string | null
          resolved_at?: string | null
          status?: string
        }
        Relationships: []
      }
      finance_export_jobs: {
        Row: {
          bundle_id: string | null
          created_at: string
          destination: string | null
          id: string
          org_id: string
          status: string
        }
        Insert: {
          bundle_id?: string | null
          created_at?: string
          destination?: string | null
          id?: string
          org_id: string
          status?: string
        }
        Update: {
          bundle_id?: string | null
          created_at?: string
          destination?: string | null
          id?: string
          org_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_export_jobs_bundle_id_fkey"
            columns: ["bundle_id"]
            isOneToOne: false
            referencedRelation: "finance_evidence_bundles"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_governance_audit_ledger: {
        Row: {
          action: string
          actor: string
          approval_id: string | null
          case_id: string | null
          created_at: string
          id: string
          message: string
          next_status: string
          org_id: string
          payload: Json
          record_hash: string
          request_hash: string
          result: string
          target: string | null
        }
        Insert: {
          action: string
          actor?: string
          approval_id?: string | null
          case_id?: string | null
          created_at?: string
          id?: string
          message: string
          next_status: string
          org_id: string
          payload?: Json
          record_hash: string
          request_hash: string
          result?: string
          target?: string | null
        }
        Update: {
          action?: string
          actor?: string
          approval_id?: string | null
          case_id?: string | null
          created_at?: string
          id?: string
          message?: string
          next_status?: string
          org_id?: string
          payload?: Json
          record_hash?: string
          request_hash?: string
          result?: string
          target?: string | null
        }
        Relationships: []
      }
      finance_transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          metadata: Json
          org_id: string
          status: string
          updated_at: string
          vendor: string
          workflow_case_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          id: string
          metadata?: Json
          org_id: string
          status?: string
          updated_at?: string
          vendor?: string
          workflow_case_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          metadata?: Json
          org_id?: string
          status?: string
          updated_at?: string
          vendor?: string
          workflow_case_id?: string | null
        }
        Relationships: []
      }
      finance_workflow_action_events: {
        Row: {
          action: string
          actor: string
          approval_id: string | null
          case_id: string | null
          created_at: string
          id: string
          message: string
          next_status: string
          org_id: string
          payload: Json
          result: string
          target: string | null
        }
        Insert: {
          action: string
          actor?: string
          approval_id?: string | null
          case_id?: string | null
          created_at?: string
          id?: string
          message: string
          next_status: string
          org_id: string
          payload?: Json
          result?: string
          target?: string | null
        }
        Update: {
          action?: string
          actor?: string
          approval_id?: string | null
          case_id?: string | null
          created_at?: string
          id?: string
          message?: string
          next_status?: string
          org_id?: string
          payload?: Json
          result?: string
          target?: string | null
        }
        Relationships: []
      }
      finance_workflow_approvals: {
        Row: {
          amount: string
          case_id: string
          created_at: string
          id: string
          org_id: string
          risk: string
          status: string
          updated_at: string
          vendor: string
        }
        Insert: {
          amount: string
          case_id: string
          created_at?: string
          id: string
          org_id: string
          risk: string
          status: string
          updated_at?: string
          vendor: string
        }
        Update: {
          amount?: string
          case_id?: string
          created_at?: string
          id?: string
          org_id?: string
          risk?: string
          status?: string
          updated_at?: string
          vendor?: string
        }
        Relationships: []
      }
      finance_workflow_cases: {
        Row: {
          amount: number
          created_at: string
          currency: string
          export_status: string
          id: string
          org_id: string
          status: string
          updated_at: string
          vendor: string
          workflow: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          export_status?: string
          id: string
          org_id: string
          status?: string
          updated_at?: string
          vendor: string
          workflow?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          export_status?: string
          id?: string
          org_id?: string
          status?: string
          updated_at?: string
          vendor?: string
          workflow?: string
        }
        Relationships: []
      }
      gateway_connectors: {
        Row: {
          connected_at: string | null
          created_at: string
          endpoint_url: string
          id: string
          metadata: Json
          name: string
          org_id: string
          provider: string
          status: string
          updated_at: string
        }
        Insert: {
          connected_at?: string | null
          created_at?: string
          endpoint_url: string
          id?: string
          metadata?: Json
          name?: string
          org_id: string
          provider: string
          status?: string
          updated_at?: string
        }
        Update: {
          connected_at?: string | null
          created_at?: string
          endpoint_url?: string
          id?: string
          metadata?: Json
          name?: string
          org_id?: string
          provider?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      gateway_monitor_events: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: string | null
          audit_token: string | null
          committed_at: string | null
          constraints: Json
          created_at: string
          decision: string
          decision_hash: string | null
          id: string
          input: Json
          mode: string
          org_id: string
          plan_id: string | null
          record_hash: string | null
          request_hash: string
          result: Json | null
          risk: string | null
          status: string
          tool_name: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: string | null
          audit_token?: string | null
          committed_at?: string | null
          constraints?: Json
          created_at?: string
          decision: string
          decision_hash?: string | null
          id?: string
          input?: Json
          mode?: string
          org_id: string
          plan_id?: string | null
          record_hash?: string | null
          request_hash: string
          result?: Json | null
          risk?: string | null
          status?: string
          tool_name: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: string | null
          audit_token?: string | null
          committed_at?: string | null
          constraints?: Json
          created_at?: string
          decision?: string
          decision_hash?: string | null
          id?: string
          input?: Json
          mode?: string
          org_id?: string
          plan_id?: string | null
          record_hash?: string | null
          request_hash?: string
          result?: Json | null
          risk?: string | null
          status?: string
          tool_name?: string
        }
        Relationships: []
      }
      gateway_tools: {
        Row: {
          action: string
          connector_id: string
          created_at: string
          description: string | null
          enabled: boolean
          execution_mode: string
          id: string
          metadata: Json
          name: string
          org_id: string
          provider: string
          requires_approval: boolean
          risk: string
          updated_at: string
        }
        Insert: {
          action: string
          connector_id: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          execution_mode?: string
          id?: string
          metadata?: Json
          name: string
          org_id: string
          provider: string
          requires_approval?: boolean
          risk?: string
          updated_at?: string
        }
        Update: {
          action?: string
          connector_id?: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          execution_mode?: string
          id?: string
          metadata?: Json
          name?: string
          org_id?: string
          provider?: string
          requires_approval?: boolean
          risk?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "gateway_tools_connector_id_fkey"
            columns: ["connector_id"]
            isOneToOne: false
            referencedRelation: "gateway_connectors"
            referencedColumns: ["id"]
          },
        ]
      }
      github_app_installations: {
        Row: {
          agent_api_key: string
          agent_id: string
          github_account_login: string | null
          installation_id: number
          installed_at: string
          org_id: string
        }
        Insert: {
          agent_api_key: string
          agent_id: string
          github_account_login?: string | null
          installation_id: number
          installed_at?: string
          org_id: string
        }
        Update: {
          agent_api_key?: string
          agent_id?: string
          github_account_login?: string | null
          installation_id?: number
          installed_at?: string
          org_id?: string
        }
        Relationships: []
      }
      guest_access_grants: {
        Row: {
          created_at: string
          email: string
          expires_at: string | null
          id: string
          org_id: string
          role: string
          scope: Json
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string | null
          id?: string
          org_id: string
          role?: string
          scope?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string | null
          id?: string
          org_id?: string
          role?: string
          scope?: Json
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      hermes_agents: {
        Row: {
          archived_at: string | null
          created_at: string
          description: string | null
          id: string
          mcp_servers: Json
          metadata: Json
          model: string
          multiagent: Json | null
          name: string
          org_id: string
          skills: Json
          system: string | null
          tools: Json
          updated_at: string
          version: number
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          description?: string | null
          id: string
          mcp_servers?: Json
          metadata?: Json
          model: string
          multiagent?: Json | null
          name: string
          org_id: string
          skills?: Json
          system?: string | null
          tools?: Json
          updated_at?: string
          version?: number
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          mcp_servers?: Json
          metadata?: Json
          model?: string
          multiagent?: Json | null
          name?: string
          org_id?: string
          skills?: Json
          system?: string | null
          tools?: Json
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      hermes_environments: {
        Row: {
          archived_at: string | null
          config: Json
          created_at: string
          id: string
          metadata: Json
          name: string
          org_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          config?: Json
          created_at?: string
          id: string
          metadata?: Json
          name: string
          org_id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          config?: Json
          created_at?: string
          id?: string
          metadata?: Json
          name?: string
          org_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      hermes_memories: {
        Row: {
          content: string
          created_at: string
          id: string
          metadata: Json
          org_id: string
          store_id: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id: string
          metadata?: Json
          org_id: string
          store_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          metadata?: Json
          org_id?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      hermes_memory_stores: {
        Row: {
          archived_at: string | null
          created_at: string
          description: string | null
          id: string
          metadata: Json
          name: string
          org_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          description?: string | null
          id: string
          metadata?: Json
          name: string
          org_id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json
          name?: string
          org_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      hermes_session_events: {
        Row: {
          created_at: string
          event: Json
          id: string
          org_id: string
          session_id: string
        }
        Insert: {
          created_at?: string
          event: Json
          id: string
          org_id: string
          session_id: string
        }
        Update: {
          created_at?: string
          event?: Json
          id?: string
          org_id?: string
          session_id?: string
        }
        Relationships: []
      }
      hermes_session_threads: {
        Row: {
          created_at: string
          id: string
          metadata: Json
          org_id: string
          session_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          metadata?: Json
          org_id: string
          session_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json
          org_id?: string
          session_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      hermes_sessions: {
        Row: {
          agent_id: string
          agent_version: number | null
          archived_at: string | null
          created_at: string
          environment_id: string | null
          id: string
          metadata: Json
          org_id: string
          resources: Json
          status: string
          title: string | null
          updated_at: string
          vault_ids: Json
        }
        Insert: {
          agent_id: string
          agent_version?: number | null
          archived_at?: string | null
          created_at?: string
          environment_id?: string | null
          id: string
          metadata?: Json
          org_id: string
          resources?: Json
          status?: string
          title?: string | null
          updated_at?: string
          vault_ids?: Json
        }
        Update: {
          agent_id?: string
          agent_version?: number | null
          archived_at?: string | null
          created_at?: string
          environment_id?: string | null
          id?: string
          metadata?: Json
          org_id?: string
          resources?: Json
          status?: string
          title?: string | null
          updated_at?: string
          vault_ids?: Json
        }
        Relationships: []
      }
      hermes_skills: {
        Row: {
          created_at: string
          display_title: string | null
          file_ids: Json
          id: string
          metadata: Json
          org_id: string
          source: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_title?: string | null
          file_ids?: Json
          id: string
          metadata?: Json
          org_id: string
          source?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_title?: string | null
          file_ids?: Json
          id?: string
          metadata?: Json
          org_id?: string
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      hermes_user_profiles: {
        Row: {
          created_at: string
          external_id: string
          id: string
          metadata: Json
          name: string | null
          org_id: string
          relationship: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          external_id: string
          id: string
          metadata?: Json
          name?: string | null
          org_id: string
          relationship?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          external_id?: string
          id?: string
          metadata?: Json
          name?: string | null
          org_id?: string
          relationship?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      hermes_vaults: {
        Row: {
          archived_at: string | null
          created_at: string
          display_name: string
          id: string
          metadata: Json
          org_id: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          display_name: string
          id: string
          metadata?: Json
          org_id: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          display_name?: string
          id?: string
          metadata?: Json
          org_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      hermes_webhooks: {
        Row: {
          archived_at: string | null
          created_at: string
          events: Json
          id: string
          metadata: Json
          org_id: string
          updated_at: string
          url: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          events?: Json
          id: string
          metadata?: Json
          org_id: string
          updated_at?: string
          url: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          events?: Json
          id?: string
          metadata?: Json
          org_id?: string
          updated_at?: string
          url?: string
        }
        Relationships: []
      }
      incidents: {
        Row: {
          created_at: string
          description: string
          id: string
          org_id: string
          record_hash: string
          resolved_at: string | null
          severity: string
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          description?: string
          id: string
          org_id: string
          record_hash: string
          resolved_at?: string | null
          severity: string
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          org_id?: string
          record_hash?: string
          resolved_at?: string | null
          severity?: string
          status?: string
          title?: string
        }
        Relationships: []
      }
      integration_profiles: {
        Row: {
          agent_id: string
          allowed_origins: Json
          app_name: string
          created_at: string
          email: string
          id: string
          org_id: string
          status: string
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          agent_id: string
          allowed_origins?: Json
          app_name: string
          created_at?: string
          email: string
          id: string
          org_id: string
          status?: string
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          agent_id?: string
          allowed_origins?: Json
          app_name?: string
          created_at?: string
          email?: string
          id?: string
          org_id?: string
          status?: string
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      job_executions: {
        Row: {
          agent_id: string
          completed_at: string | null
          created_at: string
          deliverable: string | null
          id: string
          job_id: string
          proof_hash: string | null
          quality_score: number | null
          started_at: string
          status: string
          tx_signature: string | null
        }
        Insert: {
          agent_id: string
          completed_at?: string | null
          created_at?: string
          deliverable?: string | null
          id?: string
          job_id: string
          proof_hash?: string | null
          quality_score?: number | null
          started_at?: string
          status: string
          tx_signature?: string | null
        }
        Update: {
          agent_id?: string
          completed_at?: string | null
          created_at?: string
          deliverable?: string | null
          id?: string
          job_id?: string
          proof_hash?: string | null
          quality_score?: number | null
          started_at?: string
          status?: string
          tx_signature?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_job_executions_agent_id"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agent_profiles"
            referencedColumns: ["agent_id"]
          },
        ]
      }
      leads: {
        Row: {
          company: string | null
          converted: boolean
          created_at: string
          email: string
          engagement_score: number | null
          framework: string | null
          github_repo: string | null
          github_stars: number | null
          icp_score: number | null
          id: string
          intent: string | null
          intent_score: number | null
          job_title: string | null
          last_seen_at: string
          messages: Json | null
          org_id: string | null
          outreach_sent: boolean
          outreach_sent_at: string | null
          source: string
          source_platform: string | null
          trial_converted: boolean
          trial_converted_at: string | null
          trial_started_at: string | null
        }
        Insert: {
          company?: string | null
          converted?: boolean
          created_at?: string
          email: string
          engagement_score?: number | null
          framework?: string | null
          github_repo?: string | null
          github_stars?: number | null
          icp_score?: number | null
          id?: string
          intent?: string | null
          intent_score?: number | null
          job_title?: string | null
          last_seen_at?: string
          messages?: Json | null
          org_id?: string | null
          outreach_sent?: boolean
          outreach_sent_at?: string | null
          source?: string
          source_platform?: string | null
          trial_converted?: boolean
          trial_converted_at?: string | null
          trial_started_at?: string | null
        }
        Update: {
          company?: string | null
          converted?: boolean
          created_at?: string
          email?: string
          engagement_score?: number | null
          framework?: string | null
          github_repo?: string | null
          github_stars?: number | null
          icp_score?: number | null
          id?: string
          intent?: string | null
          intent_score?: number | null
          job_title?: string | null
          last_seen_at?: string
          messages?: Json | null
          org_id?: string | null
          outreach_sent?: boolean
          outreach_sent_at?: string | null
          source?: string
          source_platform?: string | null
          trial_converted?: boolean
          trial_converted_at?: string | null
          trial_started_at?: string | null
        }
        Relationships: []
      }
      marketing_agent_runs: {
        Row: {
          actions_taken: string[]
          created_at: string
          error: string | null
          id: string
          run_at: string
          status: string
          summary: string
        }
        Insert: {
          actions_taken?: string[]
          created_at?: string
          error?: string | null
          id?: string
          run_at?: string
          status?: string
          summary?: string
        }
        Update: {
          actions_taken?: string[]
          created_at?: string
          error?: string | null
          id?: string
          run_at?: string
          status?: string
          summary?: string
        }
        Relationships: []
      }
      marketing_content: {
        Row: {
          angle: string | null
          body: string
          created_at: string
          id: string
          keyword: string | null
          meta_description: string | null
          slug: string | null
          status: string
          title: string | null
          type: string
          updated_at: string
        }
        Insert: {
          angle?: string | null
          body: string
          created_at?: string
          id?: string
          keyword?: string | null
          meta_description?: string | null
          slug?: string | null
          status?: string
          title?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          angle?: string | null
          body?: string
          created_at?: string
          id?: string
          keyword?: string | null
          meta_description?: string | null
          slug?: string | null
          status?: string
          title?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      marketing_sends: {
        Row: {
          email: string
          id: number
          org_id: string
          send_key: string
          sent_at: string
        }
        Insert: {
          email: string
          id?: number
          org_id: string
          send_key: string
          sent_at?: string
        }
        Update: {
          email?: string
          id?: number
          org_id?: string
          send_key?: string
          sent_at?: string
        }
        Relationships: []
      }
      marketplace_account_links: {
        Row: {
          created_at: string | null
          github_account_id: number
          github_login: string
          installation_id: number | null
          org_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          github_account_id: number
          github_login: string
          installation_id?: number | null
          org_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          github_account_id?: number
          github_login?: string
          installation_id?: number | null
          org_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_account_links_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_checkout_sessions: {
        Row: {
          amount_cents: number
          created_at: string
          id: string
          metadata: Json | null
          org_id: string
          product_id: string
          status: string
          stripe_payment_intent_id: string | null
          stripe_session_id: string
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          id?: string
          metadata?: Json | null
          org_id: string
          product_id: string
          status: string
          stripe_payment_intent_id?: string | null
          stripe_session_id: string
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          id?: string
          metadata?: Json | null
          org_id?: string
          product_id?: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_checkout_sessions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "marketplace_products"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_events: {
        Row: {
          account_type: string
          action: string
          billing_cycle: string
          created_at: string | null
          event_data: Json | null
          github_account_id: number
          github_login: string
          id: string
          plan_name: string
          processed_at: string | null
          unit_count: number | null
        }
        Insert: {
          account_type: string
          action: string
          billing_cycle: string
          created_at?: string | null
          event_data?: Json | null
          github_account_id: number
          github_login: string
          id?: string
          plan_name: string
          processed_at?: string | null
          unit_count?: number | null
        }
        Update: {
          account_type?: string
          action?: string
          billing_cycle?: string
          created_at?: string | null
          event_data?: Json | null
          github_account_id?: number
          github_login?: string
          id?: string
          plan_name?: string
          processed_at?: string | null
          unit_count?: number | null
        }
        Relationships: []
      }
      marketplace_payment_audit: {
        Row: {
          created_at: string
          event_type: string
          id: string
          metadata: Json
          org_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          metadata: Json
          org_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          org_id?: string
        }
        Relationships: []
      }
      marketplace_products: {
        Row: {
          category: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          image_url: string | null
          name: string
          org_id: string
          price: number
          status: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          org_id: string
          price: number
          status?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          org_id?: string
          price?: number
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      mcp_oauth_codes: {
        Row: {
          actor_id: string
          client_id: string
          code_challenge: string
          code_challenge_method: string
          code_hash: string
          code_id: string
          created_at: string
          exchanged_at: string | null
          exchanged_token_id: string | null
          expires_at: string
          nonce: string
          redirect_uri: string
          scope: string
          state_hash: string
        }
        Insert: {
          actor_id: string
          client_id?: string
          code_challenge: string
          code_challenge_method?: string
          code_hash: string
          code_id?: string
          created_at?: string
          exchanged_at?: string | null
          exchanged_token_id?: string | null
          expires_at: string
          nonce: string
          redirect_uri: string
          scope?: string
          state_hash: string
        }
        Update: {
          actor_id?: string
          client_id?: string
          code_challenge?: string
          code_challenge_method?: string
          code_hash?: string
          code_id?: string
          created_at?: string
          exchanged_at?: string | null
          exchanged_token_id?: string | null
          expires_at?: string
          nonce?: string
          redirect_uri?: string
          scope?: string
          state_hash?: string
        }
        Relationships: []
      }
      mcp_oauth_tokens: {
        Row: {
          actor_id: string
          client_id: string
          code_challenge: string | null
          code_challenge_method: string | null
          created_at: string
          expires_at: string
          ip_address: string | null
          key_id: string
          last_used_at: string | null
          refresh_expires_at: string | null
          refresh_token: string | null
          refresh_token_hash: string | null
          revoked_at: string | null
          scope: string
          token_hash: string
          token_id: string
          token_type: string
          user_agent: string | null
        }
        Insert: {
          actor_id: string
          client_id?: string
          code_challenge?: string | null
          code_challenge_method?: string | null
          created_at?: string
          expires_at: string
          ip_address?: string | null
          key_id: string
          last_used_at?: string | null
          refresh_expires_at?: string | null
          refresh_token?: string | null
          refresh_token_hash?: string | null
          revoked_at?: string | null
          scope?: string
          token_hash: string
          token_id?: string
          token_type?: string
          user_agent?: string | null
        }
        Update: {
          actor_id?: string
          client_id?: string
          code_challenge?: string | null
          code_challenge_method?: string | null
          created_at?: string
          expires_at?: string
          ip_address?: string | null
          key_id?: string
          last_used_at?: string | null
          refresh_expires_at?: string | null
          refresh_token?: string | null
          refresh_token_hash?: string | null
          revoked_at?: string | null
          scope?: string
          token_hash?: string
          token_id?: string
          token_type?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mcp_oauth_tokens_key_id_fkey"
            columns: ["key_id"]
            isOneToOne: false
            referencedRelation: "dsg_mcp_api_keys"
            referencedColumns: ["key_id"]
          },
        ]
      }
      monitoring_alerts: {
        Row: {
          acknowledged_at: string | null
          agent_id: string
          alert_id: string
          alert_type: string
          created_at: string | null
          message: string
          metadata: Json | null
          org_id: string
          resolved_at: string | null
          severity: string
          status: string
          title: string
        }
        Insert: {
          acknowledged_at?: string | null
          agent_id: string
          alert_id?: string
          alert_type: string
          created_at?: string | null
          message: string
          metadata?: Json | null
          org_id: string
          resolved_at?: string | null
          severity: string
          status?: string
          title: string
        }
        Update: {
          acknowledged_at?: string | null
          agent_id?: string
          alert_id?: string
          alert_type?: string
          created_at?: string | null
          message?: string
          metadata?: Json | null
          org_id?: string
          resolved_at?: string | null
          severity?: string
          status?: string
          title?: string
        }
        Relationships: []
      }
      monitoring_events: {
        Row: {
          actor_id: string | null
          created_at: string | null
          event_id: string
          event_type: string
          execution_id: string
          metadata: Json | null
          timestamp: string
        }
        Insert: {
          actor_id?: string | null
          created_at?: string | null
          event_id?: string
          event_type: string
          execution_id: string
          metadata?: Json | null
          timestamp?: string
        }
        Update: {
          actor_id?: string | null
          created_at?: string | null
          event_id?: string
          event_type?: string
          execution_id?: string
          metadata?: Json | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "monitoring_events_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "monitoring_executions"
            referencedColumns: ["execution_id"]
          },
        ]
      }
      monitoring_executions: {
        Row: {
          agent_id: string
          created_at: string | null
          decision: string | null
          end_time: string | null
          error_message: string | null
          execution_id: string
          input_tokens: number | null
          metadata: Json | null
          model_name: string | null
          org_id: string
          output_tokens: number | null
          payload_hash: string | null
          reason: string | null
          start_time: string
          status: string
          total_cost_usd: number | null
          total_tokens: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          decision?: string | null
          end_time?: string | null
          error_message?: string | null
          execution_id?: string
          input_tokens?: number | null
          metadata?: Json | null
          model_name?: string | null
          org_id: string
          output_tokens?: number | null
          payload_hash?: string | null
          reason?: string | null
          start_time?: string
          status?: string
          total_cost_usd?: number | null
          total_tokens?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          decision?: string | null
          end_time?: string | null
          error_message?: string | null
          execution_id?: string
          input_tokens?: number | null
          metadata?: Json | null
          model_name?: string | null
          org_id?: string
          output_tokens?: number | null
          payload_hash?: string | null
          reason?: string | null
          start_time?: string
          status?: string
          total_cost_usd?: number | null
          total_tokens?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      monitoring_token_usage: {
        Row: {
          cost_usd: number
          created_at: string | null
          execution_id: string
          input_tokens: number
          metadata: Json | null
          model_name: string
          output_tokens: number
          timestamp: string
          token_id: string
        }
        Insert: {
          cost_usd?: number
          created_at?: string | null
          execution_id: string
          input_tokens?: number
          metadata?: Json | null
          model_name: string
          output_tokens?: number
          timestamp?: string
          token_id?: string
        }
        Update: {
          cost_usd?: number
          created_at?: string | null
          execution_id?: string
          input_tokens?: number
          metadata?: Json | null
          model_name?: string
          output_tokens?: number
          timestamp?: string
          token_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "monitoring_token_usage_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "monitoring_executions"
            referencedColumns: ["execution_id"]
          },
        ]
      }
      monitoring_tool_calls: {
        Row: {
          approval_reason: string | null
          approval_status: string | null
          completed_at: string | null
          created_at: string | null
          duration_ms: number | null
          execution_id: string
          metadata: Json | null
          risk_level: string | null
          started_at: string
          tool_call_id: string
          tool_input: Json
          tool_name: string
          tool_output: Json | null
        }
        Insert: {
          approval_reason?: string | null
          approval_status?: string | null
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          execution_id: string
          metadata?: Json | null
          risk_level?: string | null
          started_at?: string
          tool_call_id?: string
          tool_input: Json
          tool_name: string
          tool_output?: Json | null
        }
        Update: {
          approval_reason?: string | null
          approval_status?: string | null
          completed_at?: string | null
          created_at?: string | null
          duration_ms?: number | null
          execution_id?: string
          metadata?: Json | null
          risk_level?: string | null
          started_at?: string
          tool_call_id?: string
          tool_input?: Json
          tool_name?: string
          tool_output?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "monitoring_tool_calls_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "monitoring_executions"
            referencedColumns: ["execution_id"]
          },
        ]
      }
      monitoring_webhooks: {
        Row: {
          channel: string
          created_at: string | null
          enabled: boolean
          org_id: string
          secret: string | null
          url: string
          webhook_id: string
        }
        Insert: {
          channel: string
          created_at?: string | null
          enabled?: boolean
          org_id: string
          secret?: string | null
          url: string
          webhook_id?: string
        }
        Update: {
          channel?: string
          created_at?: string | null
          enabled?: boolean
          org_id?: string
          secret?: string | null
          url?: string
          webhook_id?: string
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          email: boolean
          id: string
          org_id: string
          pagerduty: boolean
          pagerduty_key: string | null
          slack: boolean
          slack_webhook_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          email?: boolean
          id?: string
          org_id: string
          pagerduty?: boolean
          pagerduty_key?: string | null
          slack?: boolean
          slack_webhook_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          email?: boolean
          id?: string
          org_id?: string
          pagerduty?: boolean
          pagerduty_key?: string | null
          slack?: boolean
          slack_webhook_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          org_id: string
          read: boolean
          title: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          org_id: string
          read?: boolean
          title: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          org_id?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount: number
          created_at: string | null
          customer_email: string
          id: number
          order_id: string
          product: string
          report_data: Json | null
          report_generated_at: string | null
          status: string | null
          stripe_session_id: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          customer_email: string
          id?: number
          order_id: string
          product: string
          report_data?: Json | null
          report_generated_at?: string | null
          status?: string | null
          stripe_session_id: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          customer_email?: string
          id?: number
          order_id?: string
          product?: string
          report_data?: Json | null
          report_generated_at?: string | null
          status?: string | null
          stripe_session_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      org_billing_policies: {
        Row: {
          created_at: string
          id: string
          managed_user_billing_mode: string
          org_id: string
          seat_activation_policy: string
          trial_requires_card: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          managed_user_billing_mode?: string
          org_id: string
          seat_activation_policy?: string
          trial_requires_card?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          managed_user_billing_mode?: string
          org_id?: string
          seat_activation_policy?: string
          trial_requires_card?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_billing_policies_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_domains: {
        Row: {
          auto_join_mode: string
          claim_mode: string
          created_at: string
          domain: string
          id: string
          notes: string | null
          org_id: string
          status: string
          updated_at: string
          verification_method: string | null
          verification_token: string | null
          verified_at: string | null
        }
        Insert: {
          auto_join_mode?: string
          claim_mode?: string
          created_at?: string
          domain: string
          id?: string
          notes?: string | null
          org_id: string
          status?: string
          updated_at?: string
          verification_method?: string | null
          verification_token?: string | null
          verified_at?: string | null
        }
        Update: {
          auto_join_mode?: string
          claim_mode?: string
          created_at?: string
          domain?: string
          id?: string
          notes?: string | null
          org_id?: string
          status?: string
          updated_at?: string
          verification_method?: string | null
          verification_token?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
      org_members: {
        Row: {
          created_at: string | null
          id: string
          org_id: string
          role: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          org_id: string
          role?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          org_id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: []
      }
      org_onboarding_states: {
        Row: {
          bootstrap_status: string
          bootstrapped_at: string | null
          checklist: Json
          created_at: string
          id: string
          org_id: string
          updated_at: string
        }
        Insert: {
          bootstrap_status?: string
          bootstrapped_at?: string | null
          checklist?: Json
          created_at?: string
          id?: string
          org_id: string
          updated_at?: string
        }
        Update: {
          bootstrap_status?: string
          bootstrapped_at?: string | null
          checklist?: Json
          created_at?: string
          id?: string
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_onboarding_states_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_security_settings: {
        Row: {
          break_glass_email_enabled: boolean
          created_at: string
          id: string
          org_id: string
          sso_enabled: boolean
          sso_enforced: boolean
          sso_metadata: Json
          updated_at: string
        }
        Insert: {
          break_glass_email_enabled?: boolean
          created_at?: string
          id?: string
          org_id: string
          sso_enabled?: boolean
          sso_enforced?: boolean
          sso_metadata?: Json
          updated_at?: string
        }
        Update: {
          break_glass_email_enabled?: boolean
          created_at?: string
          id?: string
          org_id?: string
          sso_enabled?: boolean
          sso_enforced?: boolean
          sso_metadata?: Json
          updated_at?: string
        }
        Relationships: []
      }
      org_sso_configs: {
        Row: {
          break_glass_email_login_enabled: boolean
          connection_id: string | null
          created_at: string
          display_name: string | null
          enforce_sso: boolean
          id: string
          is_enabled: boolean
          login_hint: string | null
          metadata: Json
          org_id: string
          provider: string
          updated_at: string
        }
        Insert: {
          break_glass_email_login_enabled?: boolean
          connection_id?: string | null
          created_at?: string
          display_name?: string | null
          enforce_sso?: boolean
          id?: string
          is_enabled?: boolean
          login_hint?: string | null
          metadata?: Json
          org_id: string
          provider?: string
          updated_at?: string
        }
        Update: {
          break_glass_email_login_enabled?: boolean
          connection_id?: string | null
          created_at?: string
          display_name?: string | null
          enforce_sso?: boolean
          id?: string
          is_enabled?: boolean
          login_hint?: string | null
          metadata?: Json
          org_id?: string
          provider?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_sso_configs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_stats_hourly: {
        Row: {
          active_agents: number
          active_users: number
          alerts_count: number
          allow_count: number
          allow_rate: number
          avg_latency_ms: number
          block_count: number
          block_rate: number
          bucket_start: string
          core_ok_ratio: number | null
          created_at: string
          degraded_minutes: number
          determinism_ok_ratio: number | null
          down_minutes: number
          error_count: number
          id: number
          org_id: string
          p95_latency_ms: number | null
          requests_count: number
          stabilize_count: number
          stabilize_rate: number
        }
        Insert: {
          active_agents?: number
          active_users?: number
          alerts_count?: number
          allow_count?: number
          allow_rate?: number
          avg_latency_ms?: number
          block_count?: number
          block_rate?: number
          bucket_start: string
          core_ok_ratio?: number | null
          created_at?: string
          degraded_minutes?: number
          determinism_ok_ratio?: number | null
          down_minutes?: number
          error_count?: number
          id?: number
          org_id: string
          p95_latency_ms?: number | null
          requests_count?: number
          stabilize_count?: number
          stabilize_rate?: number
        }
        Update: {
          active_agents?: number
          active_users?: number
          alerts_count?: number
          allow_count?: number
          allow_rate?: number
          avg_latency_ms?: number
          block_count?: number
          block_rate?: number
          bucket_start?: string
          core_ok_ratio?: number | null
          created_at?: string
          degraded_minutes?: number
          determinism_ok_ratio?: number | null
          down_minutes?: number
          error_count?: number
          id?: number
          org_id?: string
          p95_latency_ms?: number | null
          requests_count?: number
          stabilize_count?: number
          stabilize_rate?: number
        }
        Relationships: []
      }
      organizations: {
        Row: {
          acquisition_channel: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          plan: string
          slug: string | null
          status: string
          updated_at: string
        }
        Insert: {
          acquisition_channel?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          plan?: string
          slug?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          acquisition_channel?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          plan?: string
          slug?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      outreach_approvals: {
        Row: {
          created_at: string
          decided_at: string | null
          framework: string | null
          github_repo: string | null
          github_stars: number | null
          id: string
          lead_email: string
          sent_at: string | null
          status: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          framework?: string | null
          github_repo?: string | null
          github_stars?: number | null
          id?: string
          lead_email: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          framework?: string | null
          github_repo?: string | null
          github_stars?: number | null
          id?: string
          lead_email?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: []
      }
      payment_ledger: {
        Row: {
          agent_id: string
          amount_sol: number
          confirmation_block_height: number | null
          confirmed_at: string | null
          created_at: string
          description: string
          error_message: string | null
          execution_id: string
          id: string
          idempotency_key: string
          metadata: Json | null
          org_id: string
          recipient_wallet: string
          status: string
          transaction_signature: string | null
        }
        Insert: {
          agent_id: string
          amount_sol: number
          confirmation_block_height?: number | null
          confirmed_at?: string | null
          created_at?: string
          description?: string
          error_message?: string | null
          execution_id: string
          id?: string
          idempotency_key: string
          metadata?: Json | null
          org_id: string
          recipient_wallet: string
          status: string
          transaction_signature?: string | null
        }
        Update: {
          agent_id?: string
          amount_sol?: number
          confirmation_block_height?: number | null
          confirmed_at?: string | null
          created_at?: string
          description?: string
          error_message?: string | null
          execution_id?: string
          id?: string
          idempotency_key?: string
          metadata?: Json | null
          org_id?: string
          recipient_wallet?: string
          status?: string
          transaction_signature?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_ledger_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_total: number | null
          checkout_session_id: string | null
          created_at: string | null
          currency: string | null
          customer_email: string | null
          customer_id: string | null
          id: number
          payment_status: string | null
          stripe_event_id: string | null
        }
        Insert: {
          amount_total?: number | null
          checkout_session_id?: string | null
          created_at?: string | null
          currency?: string | null
          customer_email?: string | null
          customer_id?: string | null
          id?: never
          payment_status?: string | null
          stripe_event_id?: string | null
        }
        Update: {
          amount_total?: number | null
          checkout_session_id?: string | null
          created_at?: string | null
          currency?: string | null
          customer_email?: string | null
          customer_id?: string | null
          id?: never
          payment_status?: string | null
          stripe_event_id?: string | null
        }
        Relationships: []
      }
      policies: {
        Row: {
          config: Json | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          org_id: string | null
          rules: Json
          status: string
          updated_at: string
          version: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          org_id?: string | null
          rules?: Json
          status?: string
          updated_at?: string
          version: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          org_id?: string | null
          rules?: Json
          status?: string
          updated_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "policies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policies_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      policies_markdoc: {
        Row: {
          content_hash: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_default: boolean | null
          markdown_content: string
          name: string
          org_id: string
          policy_hash: string
          policy_type: string | null
          rendered_content: Json | null
          status: string
          updated_at: string | null
          updated_by: string | null
          version: number
        }
        Insert: {
          content_hash: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          markdown_content: string
          name: string
          org_id: string
          policy_hash: string
          policy_type?: string | null
          rendered_content?: Json | null
          status?: string
          updated_at?: string | null
          updated_by?: string | null
          version?: number
        }
        Update: {
          content_hash?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_default?: boolean | null
          markdown_content?: string
          name?: string
          org_id?: string
          policy_hash?: string
          policy_type?: string | null
          rendered_content?: Json | null
          status?: string
          updated_at?: string | null
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "policies_markdoc_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policies_markdoc_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policies_markdoc_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_markdoc_versions: {
        Row: {
          change_reason: string | null
          changed_by: string | null
          content_hash: string
          created_at: string | null
          id: string
          markdown_content: string
          org_id: string
          policy_hash: string
          policy_id: string
          version: number
        }
        Insert: {
          change_reason?: string | null
          changed_by?: string | null
          content_hash: string
          created_at?: string | null
          id?: string
          markdown_content: string
          org_id: string
          policy_hash: string
          policy_id: string
          version: number
        }
        Update: {
          change_reason?: string | null
          changed_by?: string | null
          content_hash?: string
          created_at?: string | null
          id?: string
          markdown_content?: string
          org_id?: string
          policy_hash?: string
          policy_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "policy_markdoc_versions_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_markdoc_versions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_markdoc_versions_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "policies_markdoc"
            referencedColumns: ["id"]
          },
        ]
      }
      prospect_interactions: {
        Row: {
          created_at: string | null
          id: string
          interaction_type: string
          metadata: Json | null
          prospect_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          interaction_type: string
          metadata?: Json | null
          prospect_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          interaction_type?: string
          metadata?: Json | null
          prospect_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prospect_interactions_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: false
            referencedRelation: "discovered_prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      public_test_results: {
        Row: {
          actual_count: number
          bundle_hash: string
          ccvs_level: string
          compliance_ccvs: boolean
          compliance_eu_ai_act: boolean
          compliance_pdpa: boolean
          created_at: string | null
          decision: string
          evidence_deterministic: boolean
          evidence_replayable: boolean
          evidence_tamperable: boolean
          expires_at: string | null
          merkle_root: string
          min_required: number
          proof_hash: string
          reason: string
          request_hash: string
          result_json: Json
          test_id: string
          test_name: string | null
        }
        Insert: {
          actual_count: number
          bundle_hash: string
          ccvs_level?: string
          compliance_ccvs?: boolean
          compliance_eu_ai_act?: boolean
          compliance_pdpa?: boolean
          created_at?: string | null
          decision: string
          evidence_deterministic?: boolean
          evidence_replayable?: boolean
          evidence_tamperable?: boolean
          expires_at?: string | null
          merkle_root: string
          min_required: number
          proof_hash: string
          reason: string
          request_hash: string
          result_json: Json
          test_id: string
          test_name?: string | null
        }
        Update: {
          actual_count?: number
          bundle_hash?: string
          ccvs_level?: string
          compliance_ccvs?: boolean
          compliance_eu_ai_act?: boolean
          compliance_pdpa?: boolean
          created_at?: string | null
          decision?: string
          evidence_deterministic?: boolean
          evidence_replayable?: boolean
          evidence_tamperable?: boolean
          expires_at?: string | null
          merkle_root?: string
          min_required?: number
          proof_hash?: string
          reason?: string
          request_hash?: string
          result_json?: Json
          test_id?: string
          test_name?: string | null
        }
        Relationships: []
      }
      readiness_history: {
        Row: {
          audit_ok: boolean | null
          auth_ok: boolean | null
          billing_ok: boolean | null
          core_health_ok: boolean | null
          core_metrics_ok: boolean | null
          db_ok: boolean | null
          details: Json
          determinism_ok: boolean | null
          id: number
          ledger_ok: boolean | null
          org_id: string
          reason_codes: Json
          recorded_at: string
          score: number
          status: string
        }
        Insert: {
          audit_ok?: boolean | null
          auth_ok?: boolean | null
          billing_ok?: boolean | null
          core_health_ok?: boolean | null
          core_metrics_ok?: boolean | null
          db_ok?: boolean | null
          details?: Json
          determinism_ok?: boolean | null
          id?: number
          ledger_ok?: boolean | null
          org_id: string
          reason_codes?: Json
          recorded_at?: string
          score?: number
          status: string
        }
        Update: {
          audit_ok?: boolean | null
          auth_ok?: boolean | null
          billing_ok?: boolean | null
          core_health_ok?: boolean | null
          core_metrics_ok?: boolean | null
          db_ok?: boolean | null
          details?: Json
          determinism_ok?: boolean | null
          id?: number
          ledger_ok?: boolean | null
          org_id?: string
          reason_codes?: Json
          recorded_at?: string
          score?: number
          status?: string
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          clicks: number
          code: string
          conversions: number
          created_at: string
          id: string
          org_id: string
          referrer_email: string | null
          signups: number
        }
        Insert: {
          clicks?: number
          code: string
          conversions?: number
          created_at?: string
          id?: string
          org_id: string
          referrer_email?: string | null
          signups?: number
        }
        Update: {
          clicks?: number
          code?: string
          conversions?: number
          created_at?: string
          id?: string
          org_id?: string
          referrer_email?: string | null
          signups?: number
        }
        Relationships: []
      }
      release_gate_entitlements: {
        Row: {
          created_at: string
          current_period_end: string | null
          email: string | null
          id: string
          plan: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          email?: string | null
          id?: string
          plan?: string
          status: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          email?: string | null
          id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      repair_tickets: {
        Row: {
          assigned_to: string | null
          created_at: string
          customer_id: string
          description: string
          id: string
          org_id: string
          priority: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          customer_id: string
          description: string
          id?: string
          org_id: string
          priority?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          customer_id?: string
          description?: string
          id?: string
          org_id?: string
          priority?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      revenue_autopilot_runs: {
        Row: {
          attempts: number
          bucket: string
          error: string | null
          finished_at: string | null
          http_status: number | null
          id: string
          job: string
          result: Json | null
          source: string
          started_at: string
          status: string
        }
        Insert: {
          attempts?: number
          bucket: string
          error?: string | null
          finished_at?: string | null
          http_status?: number | null
          id?: string
          job: string
          result?: Json | null
          source?: string
          started_at?: string
          status?: string
        }
        Update: {
          attempts?: number
          bucket?: string
          error?: string | null
          finished_at?: string | null
          http_status?: number | null
          id?: string
          job?: string
          result?: Json | null
          source?: string
          started_at?: string
          status?: string
        }
        Relationships: []
      }
      revenue_events: {
        Row: {
          amount: number | null
          created_at: string
          currency: string
          event_type: string
          id: string
          idempotency_key: string | null
          metadata: Json | null
          org_id: string
          plan_id: string | null
          source: string
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          currency?: string
          event_type: string
          id?: string
          idempotency_key?: string | null
          metadata?: Json | null
          org_id: string
          plan_id?: string | null
          source: string
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          currency?: string
          event_type?: string
          id?: string
          idempotency_key?: string | null
          metadata?: Json | null
          org_id?: string
          plan_id?: string | null
          source?: string
          user_id?: string | null
        }
        Relationships: []
      }
      runtime_approval_requests: {
        Row: {
          agent_id: string | null
          approval_key: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          org_id: string | null
          request_payload: Json | null
          status: string | null
        }
        Insert: {
          agent_id?: string | null
          approval_key?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          org_id?: string | null
          request_payload?: Json | null
          status?: string | null
        }
        Update: {
          agent_id?: string | null
          approval_key?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          org_id?: string | null
          request_payload?: Json | null
          status?: string | null
        }
        Relationships: []
      }
      runtime_checkpoints: {
        Row: {
          agent_id: string
          checkpoint_hash: string
          created_at: string
          id: string
          latest_ledger_entry_id: string | null
          metadata: Json
          org_id: string
          truth_state_id: string | null
        }
        Insert: {
          agent_id: string
          checkpoint_hash: string
          created_at?: string
          id?: string
          latest_ledger_entry_id?: string | null
          metadata?: Json
          org_id: string
          truth_state_id?: string | null
        }
        Update: {
          agent_id?: string
          checkpoint_hash?: string
          created_at?: string
          id?: string
          latest_ledger_entry_id?: string | null
          metadata?: Json
          org_id?: string
          truth_state_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "runtime_checkpoints_latest_ledger_entry_id_fkey"
            columns: ["latest_ledger_entry_id"]
            isOneToOne: false
            referencedRelation: "runtime_ledger_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "runtime_checkpoints_truth_state_id_fkey"
            columns: ["truth_state_id"]
            isOneToOne: false
            referencedRelation: "runtime_truth_states"
            referencedColumns: ["id"]
          },
        ]
      }
      runtime_effects: {
        Row: {
          agent_id: string | null
          callback_count: number
          created_at: string
          effect_type: string | null
          execution_id: string | null
          id: string
          org_id: string
          payload: Json
          result_payload: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          callback_count?: number
          created_at?: string
          effect_type?: string | null
          execution_id?: string | null
          id?: string
          org_id: string
          payload?: Json
          result_payload?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          callback_count?: number
          created_at?: string
          effect_type?: string | null
          execution_id?: string | null
          id?: string
          org_id?: string
          payload?: Json
          result_payload?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "runtime_effects_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "dashboard_policy_decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "runtime_effects_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "executions"
            referencedColumns: ["id"]
          },
        ]
      }
      runtime_ledger_entries: {
        Row: {
          agent_id: string
          canonical_hash: string | null
          created_at: string
          decision: string | null
          execution_id: string | null
          id: string
          ledger_sequence: number
          metadata: Json
          org_id: string
          reason: string | null
          request_id: string | null
          truth_sequence: number | null
          truth_state_id: string | null
        }
        Insert: {
          agent_id: string
          canonical_hash?: string | null
          created_at?: string
          decision?: string | null
          execution_id?: string | null
          id?: string
          ledger_sequence: number
          metadata?: Json
          org_id: string
          reason?: string | null
          request_id?: string | null
          truth_sequence?: number | null
          truth_state_id?: string | null
        }
        Update: {
          agent_id?: string
          canonical_hash?: string | null
          created_at?: string
          decision?: string | null
          execution_id?: string | null
          id?: string
          ledger_sequence?: number
          metadata?: Json
          org_id?: string
          reason?: string | null
          request_id?: string | null
          truth_sequence?: number | null
          truth_state_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "runtime_ledger_entries_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "dashboard_policy_decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "runtime_ledger_entries_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "runtime_ledger_entries_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "runtime_approval_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "runtime_ledger_entries_truth_state_id_fkey"
            columns: ["truth_state_id"]
            isOneToOne: false
            referencedRelation: "runtime_truth_states"
            referencedColumns: ["id"]
          },
        ]
      }
      runtime_policies: {
        Row: {
          created_at: string
          created_by: string | null
          governance_state: string
          id: string
          name: string
          org_id: string
          status: string
          thresholds: Json
          updated_at: string
          updated_by: string | null
          version: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          governance_state?: string
          id?: string
          name: string
          org_id: string
          status?: string
          thresholds?: Json
          updated_at?: string
          updated_by?: string | null
          version?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          governance_state?: string
          id?: string
          name?: string
          org_id?: string
          status?: string
          thresholds?: Json
          updated_at?: string
          updated_by?: string | null
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "runtime_policies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "runtime_policies_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "runtime_policies_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      runtime_policy_governance_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          event_type: string
          id: string
          metadata: Json
          org_id: string
          policy_id: string | null
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json
          org_id: string
          policy_id?: string | null
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json
          org_id?: string
          policy_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "runtime_policy_governance_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "runtime_policy_governance_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "runtime_policy_governance_events_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "runtime_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      runtime_roles: {
        Row: {
          created_at: string
          id: string
          org_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          org_id: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          org_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "runtime_roles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "runtime_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      runtime_truth_states: {
        Row: {
          agent_id: string
          canonical_hash: string | null
          canonical_json: Json
          created_at: string
          decision: string | null
          id: string
          org_id: string
          policy_version: string | null
          reason: string | null
          request_id: string | null
          truth_sequence: number
        }
        Insert: {
          agent_id: string
          canonical_hash?: string | null
          canonical_json?: Json
          created_at?: string
          decision?: string | null
          id?: string
          org_id: string
          policy_version?: string | null
          reason?: string | null
          request_id?: string | null
          truth_sequence: number
        }
        Update: {
          agent_id?: string
          canonical_hash?: string | null
          canonical_json?: Json
          created_at?: string
          decision?: string | null
          id?: string
          org_id?: string
          policy_version?: string | null
          reason?: string | null
          request_id?: string | null
          truth_sequence?: number
        }
        Relationships: [
          {
            foreignKeyName: "runtime_truth_states_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "runtime_approval_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      seat_activations: {
        Row: {
          activated_at: string
          billable_from: string
          created_at: string
          email: string
          guest_grant_id: string | null
          id: string
          org_id: string
          role: string | null
          source: string
          user_id: string | null
        }
        Insert: {
          activated_at: string
          billable_from: string
          created_at?: string
          email: string
          guest_grant_id?: string | null
          id?: string
          org_id: string
          role?: string | null
          source: string
          user_id?: string | null
        }
        Update: {
          activated_at?: string
          billable_from?: string
          created_at?: string
          email?: string
          guest_grant_id?: string | null
          id?: string
          org_id?: string
          role?: string | null
          source?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seat_activations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seat_activations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_payouts: {
        Row: {
          amount: number
          created_at: string
          id: string
          seller_id: string
          status: string
          stripe_payout_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          seller_id: string
          status?: string
          stripe_payout_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          seller_id?: string
          status?: string
          stripe_payout_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_payouts_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_transactions: {
        Row: {
          amount_total: number
          checkout_session_id: string
          created_at: string
          customer_email: string
          id: string
          platform_fee: number
          seller_id: string
          seller_payout: number
          status: string
        }
        Insert: {
          amount_total: number
          checkout_session_id: string
          created_at?: string
          customer_email: string
          id?: string
          platform_fee: number
          seller_id: string
          seller_payout: number
          status?: string
        }
        Update: {
          amount_total?: number
          checkout_session_id?: string
          created_at?: string
          customer_email?: string
          id?: string
          platform_fee?: number
          seller_id?: string
          seller_payout?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_transactions_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
        ]
      }
      sellers: {
        Row: {
          business_name: string
          created_at: string
          fee_percentage: number
          id: string
          kyc_account_link_url: string | null
          kyc_status: string
          payout_schedule: string
          stripe_account_id: string | null
          stripe_dashboard_access: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          business_name: string
          created_at?: string
          fee_percentage?: number
          id?: string
          kyc_account_link_url?: string | null
          kyc_status?: string
          payout_schedule?: string
          stripe_account_id?: string | null
          stripe_dashboard_access?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          business_name?: string
          created_at?: string
          fee_percentage?: number
          id?: string
          kyc_account_link_url?: string | null
          kyc_status?: string
          payout_schedule?: string
          stripe_account_id?: string | null
          stripe_dashboard_access?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sellers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      sign_in_events: {
        Row: {
          auth_user_id: string | null
          created_at: string
          email: string
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json
          org_id: string | null
          source: string | null
          success: boolean
          user_agent: string | null
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          email: string
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          org_id?: string | null
          source?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          email?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json
          org_id?: string | null
          source?: string | null
          success?: boolean
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sign_in_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_app_accounts: {
        Row: {
          dsg_org_id: string
          fail_safe_mode: string | null
          id: string
          installed_at: string | null
          metadata: Json | null
          status: string | null
          stripe_account_id: string
          stripe_api_key_encrypted: string | null
          updated_at: string | null
        }
        Insert: {
          dsg_org_id: string
          fail_safe_mode?: string | null
          id?: string
          installed_at?: string | null
          metadata?: Json | null
          status?: string | null
          stripe_account_id: string
          stripe_api_key_encrypted?: string | null
          updated_at?: string | null
        }
        Update: {
          dsg_org_id?: string
          fail_safe_mode?: string | null
          id?: string
          installed_at?: string | null
          metadata?: Json | null
          status?: string | null
          stripe_account_id?: string
          stripe_api_key_encrypted?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      stripe_operation_audits: {
        Row: {
          created_at: string | null
          dsg_decision: string | null
          dsg_decision_id: string | null
          dsg_proof: string | null
          dsg_reason: string | null
          id: string
          operation_type: string
          payload: Json | null
          status: string | null
          stripe_account_id: string
          stripe_event_id: string
          stripe_object_id: string
        }
        Insert: {
          created_at?: string | null
          dsg_decision?: string | null
          dsg_decision_id?: string | null
          dsg_proof?: string | null
          dsg_reason?: string | null
          id?: string
          operation_type: string
          payload?: Json | null
          status?: string | null
          stripe_account_id: string
          stripe_event_id: string
          stripe_object_id: string
        }
        Update: {
          created_at?: string | null
          dsg_decision?: string | null
          dsg_decision_id?: string | null
          dsg_proof?: string | null
          dsg_reason?: string | null
          id?: string
          operation_type?: string
          payload?: Json | null
          status?: string | null
          stripe_account_id?: string
          stripe_event_id?: string
          stripe_object_id?: string
        }
        Relationships: []
      }
      stripe_operation_policies: {
        Row: {
          action: string
          conditions: Json
          created_at: string | null
          enabled: boolean | null
          id: string
          operation_type: string
          rule_type: string | null
          stripe_account_id: string
          updated_at: string | null
        }
        Insert: {
          action: string
          conditions: Json
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          operation_type: string
          rule_type?: string | null
          stripe_account_id: string
          updated_at?: string | null
        }
        Update: {
          action?: string
          conditions?: Json
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          operation_type?: string
          rule_type?: string | null
          stripe_account_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          org_id: string | null
          plan: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          org_id?: string | null
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          org_id?: string | null
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      support_escalations: {
        Row: {
          created_at: string
          escalated_from_user_id: string
          escalation_team: string
          id: string
          reason: string
          status: string
          ticket_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          escalated_from_user_id: string
          escalation_team: string
          id?: string
          reason: string
          status?: string
          ticket_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          escalated_from_user_id?: string
          escalation_team?: string
          id?: string
          reason?: string
          status?: string
          ticket_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_escalations_escalated_from_user_id_fkey"
            columns: ["escalated_from_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_escalations_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          author_id: string
          created_at: string
          id: string
          is_internal: boolean | null
          message: string
          ticket_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          created_at?: string
          id?: string
          is_internal?: boolean | null
          message: string
          ticket_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          created_at?: string
          id?: string
          is_internal?: boolean | null
          message?: string
          ticket_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          category: string
          closed_at: string | null
          created_at: string
          created_by: string
          description: string
          id: string
          metadata: Json | null
          org_id: string
          priority: string
          resolved_at: string | null
          sla_due_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category?: string
          closed_at?: string | null
          created_at?: string
          created_by: string
          description: string
          id?: string
          metadata?: Json | null
          org_id: string
          priority?: string
          resolved_at?: string | null
          sla_due_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category?: string
          closed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          metadata?: Json | null
          org_id?: string
          priority?: string
          resolved_at?: string | null
          sla_due_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_messages: {
        Row: {
          created_at: string
          id: string
          is_internal_note: boolean
          message: string
          sender_id: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_internal_note?: boolean
          message: string
          sender_id: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_internal_note?: boolean
          message?: string
          sender_id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "repair_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_status_history: {
        Row: {
          changed_by: string
          created_at: string
          id: string
          new_status: string
          old_status: string | null
          ticket_id: string
        }
        Insert: {
          changed_by: string
          created_at?: string
          id?: string
          new_status: string
          old_status?: string | null
          ticket_id: string
        }
        Update: {
          changed_by?: string
          created_at?: string
          id?: string
          new_status?: string
          old_status?: string | null
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_status_history_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "repair_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      trial_signups: {
        Row: {
          completed_at: string | null
          created_at: string
          email: string
          full_name: string | null
          github_account_id: number | null
          github_login: string | null
          id: string
          installation_id: number | null
          ref_code: string | null
          status: string
          workspace_name: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          github_account_id?: number | null
          github_login?: string | null
          id?: string
          installation_id?: number | null
          ref_code?: string | null
          status?: string
          workspace_name: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          github_account_id?: number | null
          github_login?: string | null
          id?: string
          installation_id?: number | null
          ref_code?: string | null
          status?: string
          workspace_name?: string
        }
        Relationships: []
      }
      trinity_audit_events: {
        Row: {
          actor_id: string
          created_at: string
          event_hash: string
          event_type: string
          id: string
          job_id: string
          org_id: string
          payload: Json
        }
        Insert: {
          actor_id: string
          created_at?: string
          event_hash: string
          event_type: string
          id?: string
          job_id: string
          org_id: string
          payload?: Json
        }
        Update: {
          actor_id?: string
          created_at?: string
          event_hash?: string
          event_type?: string
          id?: string
          job_id?: string
          org_id?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "trinity_audit_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "trinity_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      trinity_deliverables: {
        Row: {
          content: string
          content_hash: string
          created_at: string
          id: string
          job_id: string
          org_id: string
          proof_refs: Json
          quality_score: number | null
          submitted_by: string
          verification_notes: string | null
        }
        Insert: {
          content: string
          content_hash: string
          created_at?: string
          id?: string
          job_id: string
          org_id: string
          proof_refs?: Json
          quality_score?: number | null
          submitted_by: string
          verification_notes?: string | null
        }
        Update: {
          content?: string
          content_hash?: string
          created_at?: string
          id?: string
          job_id?: string
          org_id?: string
          proof_refs?: Json
          quality_score?: number | null
          submitted_by?: string
          verification_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trinity_deliverables_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "trinity_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      trinity_jobs: {
        Row: {
          bounty_program: string | null
          category: string
          claimed_at: string | null
          claimed_by: string | null
          created_at: string
          deadline: string
          difficulty: string
          exploit_cid: string | null
          external_id: string
          id: string
          org_id: string
          reward_amount: number
          reward_currency: string
          reward_usd_estimate: number
          settled_at: string | null
          severity: string
          source: string
          source_platform: string
          status: string
          submitted_at: string | null
          title: string
          tx_signature: string | null
          updated_at: string
          verified_at: string | null
          worker_wallet_address: string | null
        }
        Insert: {
          bounty_program?: string | null
          category: string
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          deadline: string
          difficulty: string
          exploit_cid?: string | null
          external_id: string
          id: string
          org_id: string
          reward_amount: number
          reward_currency?: string
          reward_usd_estimate?: number
          settled_at?: string | null
          severity?: string
          source?: string
          source_platform: string
          status?: string
          submitted_at?: string | null
          title: string
          tx_signature?: string | null
          updated_at?: string
          verified_at?: string | null
          worker_wallet_address?: string | null
        }
        Update: {
          bounty_program?: string | null
          category?: string
          claimed_at?: string | null
          claimed_by?: string | null
          created_at?: string
          deadline?: string
          difficulty?: string
          exploit_cid?: string | null
          external_id?: string
          id?: string
          org_id?: string
          reward_amount?: number
          reward_currency?: string
          reward_usd_estimate?: number
          settled_at?: string | null
          severity?: string
          source?: string
          source_platform?: string
          status?: string
          submitted_at?: string | null
          title?: string
          tx_signature?: string | null
          updated_at?: string
          verified_at?: string | null
          worker_wallet_address?: string | null
        }
        Relationships: []
      }
      trinity_settlements: {
        Row: {
          created_at: string
          id: string
          idempotency_key: string
          job_id: string
          org_id: string
          reason: string | null
          settled_by: string
          status: string
          tx_signature: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          idempotency_key: string
          job_id: string
          org_id: string
          reason?: string | null
          settled_by: string
          status: string
          tx_signature?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          idempotency_key?: string
          job_id?: string
          org_id?: string
          reason?: string | null
          settled_by?: string
          status?: string
          tx_signature?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trinity_settlements_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "trinity_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_counters: {
        Row: {
          agent_id: string | null
          amount_usd: number
          billing_period: string
          executions: number
          id: string
          org_id: string | null
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          amount_usd?: number
          billing_period: string
          executions?: number
          id?: string
          org_id?: string | null
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          amount_usd?: number
          billing_period?: string
          executions?: number
          id?: string
          org_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_counters_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_counters_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "dashboard_agent_status"
            referencedColumns: ["agent_id"]
          },
          {
            foreignKeyName: "usage_counters_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_events: {
        Row: {
          agent_id: string | null
          amount_usd: number
          created_at: string
          event_type: string
          execution_id: string | null
          id: string
          metadata: Json
          org_id: string | null
          quantity: number
          unit: string
        }
        Insert: {
          agent_id?: string | null
          amount_usd?: number
          created_at?: string
          event_type?: string
          execution_id?: string | null
          id?: string
          metadata?: Json
          org_id?: string | null
          quantity?: number
          unit?: string
        }
        Update: {
          agent_id?: string | null
          amount_usd?: number
          created_at?: string
          event_type?: string
          execution_id?: string | null
          id?: string
          metadata?: Json
          org_id?: string | null
          quantity?: number
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_events_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_events_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "dashboard_agent_status"
            referencedColumns: ["agent_id"]
          },
          {
            foreignKeyName: "usage_events_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "dashboard_policy_decisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_events_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usage_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_milestones: {
        Row: {
          created_at: string
          email: string | null
          id: number
          metadata: Json
          milestone: string
          org_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: number
          metadata?: Json
          milestone: string
          org_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: number
          metadata?: Json
          milestone?: string
          org_id?: string
        }
        Relationships: []
      }
      user_org_roles: {
        Row: {
          created_at: string | null
          id: string
          org_id: string
          role: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          org_id: string
          role?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          org_id?: string
          role?: string
          user_id?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          auth_user_id: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean | null
          org_id: string | null
          role: string
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          org_id?: string | null
          role?: string
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          org_id?: string | null
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_configs: {
        Row: {
          active: boolean
          created_at: string
          events: string[]
          id: string
          org_id: string
          secret_hash: string
          url: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          events?: string[]
          id?: string
          org_id: string
          secret_hash: string
          url: string
        }
        Update: {
          active?: boolean
          created_at?: string
          events?: string[]
          id?: string
          org_id?: string
          secret_hash?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_configs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_deliveries: {
        Row: {
          created_at: string
          duration_ms: number | null
          event: string
          id: string
          response_code: number | null
          status: string
          webhook_id: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          event: string
          id?: string
          response_code?: number | null
          status?: string
          webhook_id: string
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          event?: string
          id?: string
          response_code?: number | null
          status?: string
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhook_configs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      api_key_usage_summary: {
        Row: {
          calls_last_24h: number | null
          created_at: string | null
          expiry: string | null
          gate_block_count: number | null
          gate_pass_count: number | null
          key_id: string | null
          last_dsg_call_at: string | null
          last_used: string | null
          name: string | null
          org_id: string | null
          prefix: string | null
          requests_this_month: number | null
          scopes: string[] | null
          status: string | null
          total_dsg_calls: number | null
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_activity_feed: {
        Row: {
          action: string | null
          agent: string | null
          agent_id: string | null
          created_at: string | null
          detail: string | null
          duration_ms: string | null
          evidence_hash: string | null
          id: string | null
          metadata: Json | null
          org_id: string | null
          policy_version: string | null
          result: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_logs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "dashboard_agent_status"
            referencedColumns: ["agent_id"]
          },
          {
            foreignKeyName: "audit_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_agent_status: {
        Row: {
          actions_this_month: number | null
          actions_today: number | null
          agent_id: string | null
          avg_latency_ms_24h: number | null
          configured_status: string | null
          last_execution_at: string | null
          last_used_at: string | null
          metadata: Json | null
          monthly_limit: number | null
          name: string | null
          org_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      dashboard_overview_kpis: {
        Row: {
          allow_today: number | null
          avg_latency_ms_today: number | null
          block_today: number | null
          configured_active_agents: number | null
          configured_monthly_limit: number | null
          executions_this_month: number | null
          executions_today: number | null
          latest_billing_period: string | null
          metered_amount_usd: number | null
          metered_executions: number | null
          monthly_revenue_usd: number | null
          monthly_revenue_verification_note: string | null
          monthly_revenue_verified: boolean | null
          org_id: string | null
          total_agents: number | null
        }
        Relationships: []
      }
      dashboard_policy_decisions: {
        Row: {
          agent_id: string | null
          decision: string | null
          decision_at: string | null
          id: string | null
          latency_ms: number | null
          metadata: Json | null
          org_id: string | null
          policy: string | null
          proof_id: string | null
          provider: string | null
          reason: string | null
          source: string | null
        }
        Relationships: [
          {
            foreignKeyName: "executions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "executions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "dashboard_agent_status"
            referencedColumns: ["agent_id"]
          },
          {
            foreignKeyName: "executions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      monitoring_monthly_metrics: {
        Row: {
          agent_id: string | null
          avg_duration_seconds: number | null
          month: string | null
          org_id: string | null
          success_rate_percent: number | null
          successful_executions: number | null
          total_cost_usd: number | null
          total_executions: number | null
          total_tokens_used: number | null
        }
        Relationships: []
      }
      orders_summary: {
        Row: {
          completed_orders: number | null
          date: string | null
          failed_orders: number | null
          revenue_usd: number | null
          total_orders: number | null
        }
        Relationships: []
      }
      payment_summary: {
        Row: {
          agent_id: string | null
          earliest_payment: string | null
          latest_payment: string | null
          status: string | null
          total_sol: number | null
          transaction_count: number | null
        }
        Relationships: []
      }
      policy_versions: {
        Row: {
          description: string | null
          id: string | null
          name: string | null
          org_id: string | null
          policy_id: string | null
          policy_version: string | null
          version: string | null
        }
        Insert: {
          description?: string | null
          id?: string | null
          name?: string | null
          org_id?: string | null
          policy_id?: string | null
          policy_version?: string | null
          version?: string | null
        }
        Update: {
          description?: string | null
          id?: string | null
          name?: string | null
          org_id?: string | null
          policy_id?: string | null
          policy_version?: string | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "policies_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      activate_mcp_subscription: {
        Args: {
          p_key_id: string
          p_period_end: string
          p_period_start: string
          p_stripe_customer_id: string
          p_stripe_subscription_id: string
        }
        Returns: undefined
      }
      agent_workspace_production_scope_allowed: {
        Args: { p_scope: string }
        Returns: boolean
      }
      agent_workspace_promotion_checks_pass: {
        Args: { p_checks: Json }
        Returns: boolean
      }
      agent_workspace_scope_matches: {
        Args: { p_granted: string[]; p_requested: string }
        Returns: boolean
      }
      authorize_agent_workspace_action: {
        Args: {
          p_action?: string
          p_agent_id: string
          p_commit_sha?: string
          p_environment: string
          p_evidence?: Json
          p_input_hash?: string
          p_org_id: string
          p_plan_hash: string
          p_promotion_id?: string
          p_scope: string
          p_target?: string
          p_workspace_key: string
        }
        Returns: {
          allowed: boolean
          effective_plan_hash: string
          lease_id: string
          production_locked: boolean
          reason: string
          workspace_id: string
        }[]
      }
      can_use_template: {
        Args: { p_actor_id: string; p_template_id: string }
        Returns: {
          allowed: boolean
          price_satang: number
          reason: string
          sale_status: string
        }[]
      }
      clear_template_sale: {
        Args: {
          p_stripe_checkout_session_id: string
          p_stripe_payment_intent_id: string
        }
        Returns: undefined
      }
      compute_content_hash: { Args: { p_markdown: string }; Returns: string }
      compute_policy_hash: { Args: { p_markdown: string }; Returns: string }
      create_mcp_api_key: {
        Args: {
          p_actor_id: string
          p_key_hash: string
          p_key_prefix: string
          p_label: string
        }
        Returns: string
      }
      create_mcp_oauth_code: {
        Args: {
          p_actor_id: string
          p_code_challenge: string
          p_code_challenge_method: string
          p_code_hash: string
          p_nonce: string
          p_redirect_uri: string
          p_state_hash: string
        }
        Returns: string
      }
      create_mcp_oauth_token: {
        Args: {
          p_actor_id: string
          p_expires_in_seconds: number
          p_key_id: string
          p_scope: string
          p_token_hash: string
        }
        Returns: string
      }
      current_org_id: { Args: never; Returns: string }
      current_public_user_id: { Args: never; Returns: string }
      current_user_is_active: { Args: never; Returns: boolean }
      current_user_org_id: { Args: never; Returns: string }
      dsg_claim_gate: {
        Args: {
          has_audit_export: boolean
          has_auth_rbac_proof: boolean
          has_deployment_proof: boolean
          has_evidence: boolean
          has_production_flow_proof: boolean
          has_replay_proof: boolean
          is_dev_or_smoke_only: boolean
          uses_mock_state: boolean
        }
        Returns: Json
      }
      dsg_compute_audit_hash: {
        Args: {
          action: string
          actor_id: string
          decision: string
          payload: Json
          previous_hash: string
        }
        Returns: string
      }
      dsg_create_audit_export: {
        Args: { p_export_hash: string; p_job_id: string }
        Returns: string
      }
      dsg_create_completion_report: {
        Args: {
          p_audit_export_id: string
          p_deployment_proof_id?: string
          p_evidence_manifest_id: string
          p_is_dev_or_smoke_only?: boolean
          p_job_id: string
          p_production_flow_proof_id?: string
          p_replay_proof_id: string
          p_report_hash: string
          p_uses_mock_state?: boolean
        }
        Returns: string
      }
      dsg_create_evidence_manifest: {
        Args: {
          p_evidence_ids: string[]
          p_job_id: string
          p_manifest_hash: string
        }
        Returns: string
      }
      dsg_create_plan: {
        Args: {
          p_dependency_edges: Json
          p_job_id: string
          p_plan_hash: string
          p_tasks: Json
          p_wave_hash: string
          p_waves: Json
        }
        Returns: Json
      }
      dsg_create_runtime_job: {
        Args: {
          p_goal: string
          p_success_criteria?: Json
          p_workspace_id: string
        }
        Returns: string
      }
      dsg_create_workspace: {
        Args: { p_name: string; p_slug: string }
        Returns: string
      }
      dsg_current_actor_id: { Args: never; Returns: string }
      dsg_gate_evals_this_period: {
        Args: { p_org_id: string }
        Returns: number
      }
      dsg_has_permission: {
        Args: { permission: string; target_workspace_id: string }
        Returns: boolean
      }
      dsg_is_workspace_member: {
        Args: { target_workspace_id: string }
        Returns: boolean
      }
      dsg_ledger_latest_hash: { Args: { p_org_id: string }; Returns: string }
      dsg_ledger_next_seq: { Args: { p_org_id: string }; Returns: number }
      dsg_member_role: {
        Args: { target_workspace_id: string }
        Returns: string
      }
      dsg_provision_user_access: {
        Args: { p_auth_user_id: string; p_email: string }
        Returns: Json
      }
      dsg_record_deployment_proof: {
        Args: {
          p_deployment_url: string
          p_details?: Json
          p_environment: string
          p_job_id: string
          p_proof_hash: string
          p_status: string
        }
        Returns: string
      }
      dsg_record_evidence: {
        Args: {
          p_content_hash: string
          p_evidence_type: string
          p_job_id: string
          p_metadata?: Json
          p_summary: string
          p_uri?: string
        }
        Returns: string
      }
      dsg_record_production_flow_proof: {
        Args: {
          p_details?: Json
          p_flow_name: string
          p_job_id: string
          p_proof_hash: string
          p_status: string
        }
        Returns: string
      }
      dsg_record_replay_proof: {
        Args: {
          p_details?: Json
          p_job_id: string
          p_replay_hash: string
          p_status: string
        }
        Returns: string
      }
      erase_actor_identity: { Args: { target_uuid: string }; Returns: boolean }
      exchange_mcp_oauth_code: {
        Args: {
          p_code_hash: string
          p_code_verifier: string
          p_expires_in_seconds: number
          p_key_id: string
          p_token_hash: string
        }
        Returns: {
          expires_in: number
          scope: string
          token_hash: string
          token_id: string
          token_type: string
        }[]
      }
      expire_api_keys: { Args: never; Returns: number }
      get_agent_permissions: {
        Args: { p_agent_id: string; p_org_id: string }
        Returns: string[]
      }
      get_org_health_summary: { Args: { p_org_id: string }; Returns: Json }
      get_user_orgs: {
        Args: { p_user_id: string }
        Returns: {
          org_id: string
        }[]
      }
      hash_agent_workspace_plan: { Args: { p_plan: Json }; Returns: string }
      increment_quota_atomic: {
        Args: { p_agent_id: string; p_billing_period: string; p_org_id: string }
        Returns: undefined
      }
      is_org_admin: { Args: { target_org_id: string }; Returns: boolean }
      is_org_member: { Args: { target_org_id: string }; Returns: boolean }
      next_dsg_sequence: { Args: { org_id: string }; Returns: number }
      normalize_slug: { Args: { input_text: string }; Returns: string }
      record_dsg_gate_usage: {
        Args: {
          p_duration_ms: number
          p_eval_id: string
          p_gate_status: string
          p_org_id: string
          p_route: string
        }
        Returns: {
          billed: boolean
          created: boolean
          meter_event_id: string
          usage_id: string
          usage_position: number
        }[]
      }
      record_mcp_oauth_token_usage: {
        Args: { p_token_id: string }
        Returns: undefined
      }
      record_mcp_usage: {
        Args: { p_actor_id: string; p_key_id: string; p_tool_name: string }
        Returns: undefined
      }
      record_template_sale: {
        Args: {
          p_buyer_id: string
          p_commission_rate_bps: number
          p_creator_payout_satang: number
          p_platform_fee_satang: number
          p_price_satang: number
          p_sale_id: string
          p_seller_id: string
          p_status: string
          p_stripe_checkout_session_id?: string
          p_template_id: string
        }
        Returns: undefined
      }
      record_z3_gate_decision: {
        Args: {
          p_confidence?: number
          p_constraint_set: Json
          p_decision: string
          p_input_hash: string
          p_org_id: string
          p_parent_decision_id?: string
          p_policy_version: string
          p_proof_hash: string
          p_z3_error?: string
          p_z3_satisfiable?: boolean
          p_z3_smt2_hash?: string
          p_z3_solver_version?: string
          p_z3_status?: string
          p_z3_time_ms?: number
          p_z3_trace?: Json
        }
        Returns: string
      }
      renew_mcp_subscription_period: {
        Args: {
          p_period_end: string
          p_period_start: string
          p_stripe_subscription_id: string
        }
        Returns: undefined
      }
      revoke_mcp_api_key: {
        Args: { p_actor_id: string; p_key_id: string }
        Returns: undefined
      }
      revoke_mcp_oauth_token: {
        Args: { p_actor_id: string; p_token_hash: string }
        Returns: undefined
      }
      runtime_commit:
        | {
            Args: {
              p_agent_id: string
              p_canonical_hash: string
              p_context: Json
              p_organization_id: string
              p_policy_id: string
              p_prompt: string
              p_request_id: string
              p_risk_score: number
              p_user_id: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_agent_id: string
              p_decision: string
              p_latency_ms: number
              p_organization_id: string
              p_prompt: string
              p_proof_hash: string
              p_requires_approval: boolean
              p_risk_score: number
              p_stability_score: number
              p_user_id: string
            }
            Returns: Json
          }
      runtime_commit_execution: {
        Args: {
          p_agent_id: string
          p_agent_monthly_limit?: number
          p_audit_evidence?: Json
          p_canonical_hash?: string
          p_canonical_json?: Json
          p_context_payload?: Json
          p_created_at?: string
          p_decision: string
          p_latency_ms?: number
          p_metadata?: Json
          p_org_id: string
          p_org_plan_limit?: number
          p_policy_version?: string
          p_reason: string
          p_request_id: string
          p_request_payload?: Json
          p_usage_amount_usd?: number
        }
        Returns: {
          execution_id: string
          ledger_id: string
          ledger_sequence: number
          replayed: boolean
          truth_sequence: number
          truth_state_id: string
        }[]
      }
      submit_template_for_sale: {
        Args: {
          p_actor_id: string
          p_category: string
          p_description: string
          p_name: string
          p_price_satang: number
          p_slug: string
          p_stack: string[]
        }
        Returns: string
      }
      sync_auth_user: { Args: { p_auth_user_id: string }; Returns: undefined }
      sync_dsg_paid_entitlement: {
        Args: { p_org_id: string; p_plan_key: string; p_status: string }
        Returns: undefined
      }
      touch_api_key_last_used: {
        Args: { p_key_hash: string }
        Returns: undefined
      }
      upsert_graphmap_graph: {
        Args: {
          p_built_by: string
          p_edge_count: number
          p_exclude_patterns: Json
          p_graph_data: Json
          p_include_patterns: Json
          p_node_count: number
          p_warnings: string[]
          p_workspace_id: string
        }
        Returns: string
      }
      validate_mcp_api_key: {
        Args: { p_key_hash: string }
        Returns: {
          actor_id: string
          calls_limit: number
          calls_used: number
          key_id: string
          plan_id: string
        }[]
      }
      validate_mcp_api_key_context: {
        Args: { p_key_hash: string }
        Returns: {
          actor_id: string
          calls_limit: number
          calls_used: number
          key_actor_id: string
          key_id: string
          org_id: string
          plan_id: string
          roles: string[]
        }[]
      }
      validate_mcp_oauth_token: {
        Args: { p_token_hash: string }
        Returns: {
          actor_id: string
          calls_limit: number
          calls_used: number
          expires_at: string
          key_id: string
          scope: string
          subscription_active: boolean
          token_id: string
          token_type: string
        }[]
      }
      validate_mcp_oauth_token_context: {
        Args: { p_token_hash: string }
        Returns: {
          actor_id: string
          calls_limit: number
          calls_used: number
          key_actor_id: string
          key_id: string
          org_id: string
          plan_id: string
          roles: string[]
          scope: string
          token_id: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
