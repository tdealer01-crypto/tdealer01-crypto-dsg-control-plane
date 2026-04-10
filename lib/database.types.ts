export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | { [key: string]: unknown }
  | Json[];

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          plan: string | null;
          status: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          org_id?: string | null;
          name: string;
          slug?: string;
          plan?: string | null;
          status?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          org_id?: string | null;
          name?: string;
          slug?: string;
          plan?: string | null;
          status?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      trial_signups: {
        Row: {
          id: string;
          email: string;
          workspace_name: string;
          full_name: string | null;
          status: string;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          email: string;
          workspace_name: string;
          full_name?: string | null;
          status?: string;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          workspace_name?: string;
          full_name?: string | null;
          status?: string;
          created_at?: string;
          completed_at?: string | null;
        };
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          auth_user_id: string | null;
          org_id: string | null;
          email: string;
          role: string | null;
          auth_provider: string | null;
          is_active: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          auth_user_id?: string | null;
          org_id?: string | null;
          email: string;
          role?: string | null;
          auth_provider?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          auth_user_id?: string | null;
          org_id?: string | null;
          email?: string;
          role?: string | null;
          auth_provider?: string | null;
          is_active?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      user_org_roles: {
        Row: {
          org_id: string;
          user_id: string;
          role: string;
        };
        Insert: {
          org_id: string;
          user_id: string;
          role: string;
        };
        Update: {
          org_id?: string;
          user_id?: string;
          role?: string;
        };
        Relationships: [];
      };
      policies: {
        Row: {
          id: string;
          org_id: string | null;
          name: string;
          version: string;
          status: string;
          description: string | null;
          config: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          org_id?: string | null;
          name: string;
          version?: string;
          status?: string;
          description?: string | null;
          config?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string | null;
          name?: string;
          version?: string;
          status?: string;
          description?: string | null;
          config?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      agents: {
        Row: {
          id: string;
          org_id: string;
          name: string;
          policy_id: string | null;
          status: string | null;
          monthly_limit: number | null;
          api_key_hash: string;
          last_used_at: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id: string;
          org_id: string;
          name: string;
          policy_id?: string | null;
          status?: string | null;
          monthly_limit?: number | null;
          api_key_hash: string;
          last_used_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          org_id?: string;
          name?: string;
          policy_id?: string | null;
          status?: string | null;
          monthly_limit?: number | null;
          api_key_hash?: string;
          last_used_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      executions: {
        Row: {
          id: string;
          org_id: string;
          agent_id: string;
          decision: string;
          latency_ms: number | null;
          request_payload: Json | null;
          context_payload: Json | null;
          policy_version: string | null;
          reason: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          org_id: string;
          agent_id: string;
          decision: string;
          latency_ms?: number | null;
          request_payload?: Json | null;
          context_payload?: Json | null;
          policy_version?: string | null;
          reason?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          org_id?: string;
          agent_id?: string;
          decision?: string;
          latency_ms?: number | null;
          request_payload?: Json | null;
          context_payload?: Json | null;
          policy_version?: string | null;
          reason?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          org_id: string;
          agent_id: string;
          execution_id: string | null;
          policy_version: string | null;
          decision: string | null;
          reason: string | null;
          evidence: Json | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          org_id: string;
          agent_id: string;
          execution_id?: string | null;
          policy_version?: string | null;
          decision?: string | null;
          reason?: string | null;
          evidence?: Json | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          org_id?: string;
          agent_id?: string;
          execution_id?: string | null;
          policy_version?: string | null;
          decision?: string | null;
          reason?: string | null;
          evidence?: Json | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      usage_events: {
        Row: {
          id: string;
          org_id: string;
          agent_id: string | null;
          execution_id: string | null;
          event_type: string;
          quantity: number | null;
          unit: string | null;
          amount_usd: number | null;
          metadata: Json | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          org_id: string;
          agent_id?: string | null;
          execution_id?: string | null;
          event_type: string;
          quantity?: number | null;
          unit?: string | null;
          amount_usd?: number | null;
          metadata?: Json | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          org_id?: string;
          agent_id?: string | null;
          execution_id?: string | null;
          event_type?: string;
          quantity?: number | null;
          unit?: string | null;
          amount_usd?: number | null;
          metadata?: Json | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      usage_counters: {
        Row: {
          id: string;
          org_id: string;
          agent_id: string | null;
          billing_period: string;
          executions: number | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          org_id: string;
          agent_id?: string | null;
          billing_period: string;
          executions?: number | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          org_id?: string;
          agent_id?: string | null;
          billing_period?: string;
          executions?: number | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      billing_customers: {
        Row: {
          id: string;
          stripe_customer_id: string;
          org_id: string | null;
          email: string | null;
          name: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          stripe_customer_id: string;
          org_id?: string | null;
          email?: string | null;
          name?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          stripe_customer_id?: string;
          org_id?: string | null;
          email?: string | null;
          name?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      billing_subscriptions: {
        Row: {
          id: string;
          stripe_subscription_id: string;
          stripe_customer_id: string | null;
          org_id: string | null;
          customer_email: string | null;
          status: string | null;
          plan_key: string | null;
          billing_interval: string | null;
          price_id: string | null;
          product_id: string | null;
          cancel_at_period_end: boolean | null;
          current_period_start: string | null;
          current_period_end: string | null;
          trial_start: string | null;
          trial_end: string | null;
          metadata: Json | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          stripe_subscription_id: string;
          stripe_customer_id?: string | null;
          org_id?: string | null;
          customer_email?: string | null;
          status?: string | null;
          plan_key?: string | null;
          billing_interval?: string | null;
          price_id?: string | null;
          product_id?: string | null;
          cancel_at_period_end?: boolean | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
          trial_start?: string | null;
          trial_end?: string | null;
          metadata?: Json | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          stripe_subscription_id?: string;
          stripe_customer_id?: string | null;
          org_id?: string | null;
          customer_email?: string | null;
          status?: string | null;
          plan_key?: string | null;
          billing_interval?: string | null;
          price_id?: string | null;
          product_id?: string | null;
          cancel_at_period_end?: boolean | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
          trial_start?: string | null;
          trial_end?: string | null;
          metadata?: Json | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      billing_events: {
        Row: {
          id: string;
          stripe_event_id: string;
          event_type: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          payload: Json | null;
          processed_at: string | null;
        };
        Insert: {
          id?: string;
          stripe_event_id: string;
          event_type: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          payload?: Json | null;
          processed_at?: string | null;
        };
        Update: {
          id?: string;
          stripe_event_id?: string;
          event_type?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          payload?: Json | null;
          processed_at?: string | null;
        };
        Relationships: [];
      };
      org_sso_configs: {
        Row: {
          id: string;
          org_id: string;
          provider: string;
          connection_id: string | null;
          display_name: string | null;
          login_hint: string | null;
          is_enabled: boolean;
          enforce_sso: boolean;
          break_glass_email_login_enabled: boolean;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          provider?: string;
          connection_id?: string | null;
          display_name?: string | null;
          login_hint?: string | null;
          is_enabled?: boolean;
          enforce_sso?: boolean;
          break_glass_email_login_enabled?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          provider?: string;
          connection_id?: string | null;
          display_name?: string | null;
          login_hint?: string | null;
          is_enabled?: boolean;
          enforce_sso?: boolean;
          break_glass_email_login_enabled?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      directory_sync_configs: {
        Row: {
          id: string;
          org_id: string;
          provider: string;
          is_enabled: boolean;
          group_sync_enabled: boolean;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          provider?: string;
          is_enabled?: boolean;
          group_sync_enabled?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          provider?: string;
          is_enabled?: boolean;
          group_sync_enabled?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      directory_group_role_mappings: {
        Row: {
          id: string;
          org_id: string;
          external_group_id: string;
          external_group_name: string | null;
          target_role: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          external_group_id: string;
          external_group_name?: string | null;
          target_role: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          external_group_id?: string;
          external_group_name?: string | null;
          target_role?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      directory_sync_events: {
        Row: {
          id: string;
          org_id: string;
          event_type: string;
          email: string | null;
          external_user_id: string | null;
          payload: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          event_type: string;
          email?: string | null;
          external_user_id?: string | null;
          payload?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          event_type?: string;
          email?: string | null;
          external_user_id?: string | null;
          payload?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      org_billing_policies: {
        Row: {
          id: string;
          org_id: string;
          seat_activation_policy: string;
          trial_requires_card: boolean;
          managed_user_billing_mode: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          seat_activation_policy?: string;
          trial_requires_card?: boolean;
          managed_user_billing_mode?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          seat_activation_policy?: string;
          trial_requires_card?: boolean;
          managed_user_billing_mode?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      seat_activations: {
        Row: {
          id: string;
          org_id: string;
          email: string;
          user_id: string | null;
          guest_grant_id: string | null;
          role: string | null;
          source: string;
          activated_at: string;
          billable_from: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          email: string;
          user_id?: string | null;
          guest_grant_id?: string | null;
          role?: string | null;
          source: string;
          activated_at: string;
          billable_from: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          email?: string;
          user_id?: string | null;
          guest_grant_id?: string | null;
          role?: string | null;
          source?: string;
          activated_at?: string;
          billable_from?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      org_onboarding_states: {
        Row: {
          id: string;
          org_id: string;
          bootstrap_status: string;
          checklist: Json;
          bootstrapped_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          bootstrap_status?: string;
          checklist?: Json;
          bootstrapped_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          bootstrap_status?: string;
          checklist?: Json;
          bootstrapped_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      dsg_schema_meta: {
        Row: {
          key: string;
          value: string;
          updated_at: string;
        };
        Insert: {
          key: string;
          value: string;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      core_monitor_snapshots: {
        Row: {
          id: number;
          org_id: string;
          snapshot_at: string;
          window_seconds: number;
          core_health_ok: boolean;
          core_metrics_ok: boolean;
          ledger_ok: boolean;
          audit_ok: boolean;
          determinism_ok: boolean;
          core_url: string | null;
          health_source_path: string | null;
          metrics_source_path: string | null;
          ledger_source_path: string | null;
          audit_source_path: string | null;
          determinism_source_path: string | null;
          latest_sequence: number | null;
          deterministic: boolean | null;
          region_count: number | null;
          unique_state_hashes: number | null;
          max_entropy: number | null;
          gate_action: string | null;
          requests_today: number;
          allow_count_today: number;
          block_count_today: number;
          stabilize_count_today: number;
          allow_rate: number;
          block_rate: number;
          stabilize_rate: number;
          avg_latency_ms: number;
          p95_latency_ms: number | null;
          error_count_today: number;
          active_agents: number;
          active_users: number;
          executions_this_month: number;
          included_executions: number;
          overage_executions: number;
          projected_amount_usd: number;
          readiness_status: string;
          readiness_score: number;
          readiness_reasons: Json;
          alerts_count: number;
          alerts: Json;
          raw_core_metrics: Json | null;
          raw_health: Json | null;
          raw_ledger_summary: Json | null;
          raw_audit_summary: Json | null;
          raw_determinism: Json | null;
          created_at: string;
        };
        Insert: {
          id: number;
          org_id: string;
          snapshot_at?: string;
          window_seconds?: number;
          core_health_ok?: boolean;
          core_metrics_ok?: boolean;
          ledger_ok?: boolean;
          audit_ok?: boolean;
          determinism_ok?: boolean;
          core_url?: string | null;
          health_source_path?: string | null;
          metrics_source_path?: string | null;
          ledger_source_path?: string | null;
          audit_source_path?: string | null;
          determinism_source_path?: string | null;
          latest_sequence?: number | null;
          deterministic?: boolean | null;
          region_count?: number | null;
          unique_state_hashes?: number | null;
          max_entropy?: number | null;
          gate_action?: string | null;
          requests_today?: number;
          allow_count_today?: number;
          block_count_today?: number;
          stabilize_count_today?: number;
          allow_rate?: number;
          block_rate?: number;
          stabilize_rate?: number;
          avg_latency_ms?: number;
          p95_latency_ms?: number | null;
          error_count_today?: number;
          active_agents?: number;
          active_users?: number;
          executions_this_month?: number;
          included_executions?: number;
          overage_executions?: number;
          projected_amount_usd?: number;
          readiness_status?: string;
          readiness_score?: number;
          readiness_reasons?: Json;
          alerts_count?: number;
          alerts?: Json;
          raw_core_metrics?: Json | null;
          raw_health?: Json | null;
          raw_ledger_summary?: Json | null;
          raw_audit_summary?: Json | null;
          raw_determinism?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          org_id?: string;
          snapshot_at?: string;
          window_seconds?: number;
          core_health_ok?: boolean;
          core_metrics_ok?: boolean;
          ledger_ok?: boolean;
          audit_ok?: boolean;
          determinism_ok?: boolean;
          core_url?: string | null;
          health_source_path?: string | null;
          metrics_source_path?: string | null;
          ledger_source_path?: string | null;
          audit_source_path?: string | null;
          determinism_source_path?: string | null;
          latest_sequence?: number | null;
          deterministic?: boolean | null;
          region_count?: number | null;
          unique_state_hashes?: number | null;
          max_entropy?: number | null;
          gate_action?: string | null;
          requests_today?: number;
          allow_count_today?: number;
          block_count_today?: number;
          stabilize_count_today?: number;
          allow_rate?: number;
          block_rate?: number;
          stabilize_rate?: number;
          avg_latency_ms?: number;
          p95_latency_ms?: number | null;
          error_count_today?: number;
          active_agents?: number;
          active_users?: number;
          executions_this_month?: number;
          included_executions?: number;
          overage_executions?: number;
          projected_amount_usd?: number;
          readiness_status?: string;
          readiness_score?: number;
          readiness_reasons?: Json;
          alerts_count?: number;
          alerts?: Json;
          raw_core_metrics?: Json | null;
          raw_health?: Json | null;
          raw_ledger_summary?: Json | null;
          raw_audit_summary?: Json | null;
          raw_determinism?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      readiness_history: {
        Row: {
          id: number;
          org_id: string;
          recorded_at: string;
          status: string;
          score: number;
          core_health_ok: boolean | null;
          core_metrics_ok: boolean | null;
          ledger_ok: boolean | null;
          audit_ok: boolean | null;
          determinism_ok: boolean | null;
          db_ok: boolean | null;
          billing_ok: boolean | null;
          auth_ok: boolean | null;
          reason_codes: Json;
          details: Json;
        };
        Insert: {
          id: number;
          org_id: string;
          recorded_at?: string;
          status: string;
          score?: number;
          core_health_ok?: boolean | null;
          core_metrics_ok?: boolean | null;
          ledger_ok?: boolean | null;
          audit_ok?: boolean | null;
          determinism_ok?: boolean | null;
          db_ok?: boolean | null;
          billing_ok?: boolean | null;
          auth_ok?: boolean | null;
          reason_codes?: Json;
          details?: Json;
        };
        Update: {
          id?: number;
          org_id?: string;
          recorded_at?: string;
          status?: string;
          score?: number;
          core_health_ok?: boolean | null;
          core_metrics_ok?: boolean | null;
          ledger_ok?: boolean | null;
          audit_ok?: boolean | null;
          determinism_ok?: boolean | null;
          db_ok?: boolean | null;
          billing_ok?: boolean | null;
          auth_ok?: boolean | null;
          reason_codes?: Json;
          details?: Json;
        };
        Relationships: [];
      };
      alert_events: {
        Row: {
          id: number;
          org_id: string;
          level: string;
          code: string;
          message: string;
          source: string;
          status: string;
          first_seen_at: string;
          last_seen_at: string;
          resolved_at: string | null;
          occurrence_count: number;
          severity_score: number;
          fingerprint: string | null;
          payload: Json;
          context: Json;
        };
        Insert: {
          id: number;
          org_id: string;
          level: string;
          code: string;
          message: string;
          source: string;
          status?: string;
          first_seen_at?: string;
          last_seen_at?: string;
          resolved_at?: string | null;
          occurrence_count?: number;
          severity_score?: number;
          fingerprint?: string | null;
          payload?: Json;
          context?: Json;
        };
        Update: {
          id?: number;
          org_id?: string;
          level?: string;
          code?: string;
          message?: string;
          source?: string;
          status?: string;
          first_seen_at?: string;
          last_seen_at?: string;
          resolved_at?: string | null;
          occurrence_count?: number;
          severity_score?: number;
          fingerprint?: string | null;
          payload?: Json;
          context?: Json;
        };
        Relationships: [];
      };
      agent_stats_daily: {
        Row: {
          id: number;
          org_id: string;
          agent_id: string;
          stat_date: string;
          requests_count: number;
          allow_count: number;
          block_count: number;
          stabilize_count: number;
          allow_rate: number;
          block_rate: number;
          stabilize_rate: number;
          avg_latency_ms: number;
          p95_latency_ms: number | null;
          quota_hits: number;
          error_count: number;
          last_used_at: string | null;
          latest_decision: string | null;
          extra: Json;
          created_at: string;
        };
        Insert: {
          id: number;
          org_id: string;
          agent_id: string;
          stat_date: string;
          requests_count?: number;
          allow_count?: number;
          block_count?: number;
          stabilize_count?: number;
          allow_rate?: number;
          block_rate?: number;
          stabilize_rate?: number;
          avg_latency_ms?: number;
          p95_latency_ms?: number | null;
          quota_hits?: number;
          error_count?: number;
          last_used_at?: string | null;
          latest_decision?: string | null;
          extra?: Json;
          created_at?: string;
        };
        Update: {
          id?: number;
          org_id?: string;
          agent_id?: string;
          stat_date?: string;
          requests_count?: number;
          allow_count?: number;
          block_count?: number;
          stabilize_count?: number;
          allow_rate?: number;
          block_rate?: number;
          stabilize_rate?: number;
          avg_latency_ms?: number;
          p95_latency_ms?: number | null;
          quota_hits?: number;
          error_count?: number;
          last_used_at?: string | null;
          latest_decision?: string | null;
          extra?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      org_stats_hourly: {
        Row: {
          id: number;
          org_id: string;
          bucket_start: string;
          requests_count: number;
          allow_count: number;
          block_count: number;
          stabilize_count: number;
          error_count: number;
          allow_rate: number;
          block_rate: number;
          stabilize_rate: number;
          avg_latency_ms: number;
          p95_latency_ms: number | null;
          active_agents: number;
          active_users: number;
          core_ok_ratio: number | null;
          determinism_ok_ratio: number | null;
          alerts_count: number;
          degraded_minutes: number;
          down_minutes: number;
          created_at: string;
        };
        Insert: {
          id: number;
          org_id: string;
          bucket_start: string;
          requests_count?: number;
          allow_count?: number;
          block_count?: number;
          stabilize_count?: number;
          error_count?: number;
          allow_rate?: number;
          block_rate?: number;
          stabilize_rate?: number;
          avg_latency_ms?: number;
          p95_latency_ms?: number | null;
          active_agents?: number;
          active_users?: number;
          core_ok_ratio?: number | null;
          determinism_ok_ratio?: number | null;
          alerts_count?: number;
          degraded_minutes?: number;
          down_minutes?: number;
          created_at?: string;
        };
        Update: {
          id?: number;
          org_id?: string;
          bucket_start?: string;
          requests_count?: number;
          allow_count?: number;
          block_count?: number;
          stabilize_count?: number;
          error_count?: number;
          allow_rate?: number;
          block_rate?: number;
          stabilize_rate?: number;
          avg_latency_ms?: number;
          p95_latency_ms?: number | null;
          active_agents?: number;
          active_users?: number;
          core_ok_ratio?: number | null;
          determinism_ok_ratio?: number | null;
          alerts_count?: number;
          degraded_minutes?: number;
          down_minutes?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      core_audit_event_cache: {
        Row: {
          id: number;
          org_id: string;
          sequence: number;
          region_id: string | null;
          gate_result: string | null;
          state_hash: string | null;
          entropy: number | null;
          signature: string | null;
          created_at_core: string | null;
          collected_at: string;
          metadata: Json;
        };
        Insert: {
          id: number;
          org_id: string;
          sequence: number;
          region_id?: string | null;
          gate_result?: string | null;
          state_hash?: string | null;
          entropy?: number | null;
          signature?: string | null;
          created_at_core?: string | null;
          collected_at?: string;
          metadata?: Json;
        };
        Update: {
          id?: number;
          org_id?: string;
          sequence?: number;
          region_id?: string | null;
          gate_result?: string | null;
          state_hash?: string | null;
          entropy?: number | null;
          signature?: string | null;
          created_at_core?: string | null;
          collected_at?: string;
          metadata?: Json;
        };
        Relationships: [];
      };
      core_ledger_cache: {
        Row: {
          id: number;
          org_id: string;
          sequence: number | null;
          region_id: string | null;
          gate_result: string | null;
          state_hash: string | null;
          created_at_core: string | null;
          collected_at: string;
          payload: Json;
        };
        Insert: {
          id: number;
          org_id: string;
          sequence?: number | null;
          region_id?: string | null;
          gate_result?: string | null;
          state_hash?: string | null;
          created_at_core?: string | null;
          collected_at?: string;
          payload?: Json;
        };
        Update: {
          id?: number;
          org_id?: string;
          sequence?: number | null;
          region_id?: string | null;
          gate_result?: string | null;
          state_hash?: string | null;
          created_at_core?: string | null;
          collected_at?: string;
          payload?: Json;
        };
        Relationships: [];
      };
      agent_training_events: {
        Row: {
          id: number;
          org_id: string;
          agent_id: string | null;
          execution_id: string | null;
          event_type: string;
          decision: string | null;
          readiness_status: string | null;
          quota_state: string | null;
          latency_ms: number | null;
          signal_payload: Json;
          label_payload: Json;
          source_snapshot_id: number | null;
          source_alert_id: number | null;
          created_at: string;
        };
        Insert: {
          id: number;
          org_id: string;
          agent_id?: string | null;
          execution_id?: string | null;
          event_type: string;
          decision?: string | null;
          readiness_status?: string | null;
          quota_state?: string | null;
          latency_ms?: number | null;
          signal_payload?: Json;
          label_payload?: Json;
          source_snapshot_id?: number | null;
          source_alert_id?: number | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          org_id?: string;
          agent_id?: string | null;
          execution_id?: string | null;
          event_type?: string;
          decision?: string | null;
          readiness_status?: string | null;
          quota_state?: string | null;
          latency_ms?: number | null;
          signal_payload?: Json;
          label_payload?: Json;
          source_snapshot_id?: number | null;
          source_alert_id?: number | null;
          created_at?: string;
        };
        Relationships: [];
      };
      user_readiness_signals: {
        Row: {
          id: number;
          org_id: string;
          user_ref: string | null;
          signal_time: string;
          auth_ok: boolean | null;
          profile_active: boolean | null;
          billing_ok: boolean | null;
          quota_ok: boolean | null;
          core_ok: boolean | null;
          signal_code: string;
          signal_value: number | null;
          signal_text: string | null;
          metadata: Json;
        };
        Insert: {
          id: number;
          org_id: string;
          user_ref?: string | null;
          signal_time?: string;
          auth_ok?: boolean | null;
          profile_active?: boolean | null;
          billing_ok?: boolean | null;
          quota_ok?: boolean | null;
          core_ok?: boolean | null;
          signal_code: string;
          signal_value?: number | null;
          signal_text?: string | null;
          metadata?: Json;
        };
        Update: {
          id?: number;
          org_id?: string;
          user_ref?: string | null;
          signal_time?: string;
          auth_ok?: boolean | null;
          profile_active?: boolean | null;
          billing_ok?: boolean | null;
          quota_ok?: boolean | null;
          core_ok?: boolean | null;
          signal_code?: string;
          signal_value?: number | null;
          signal_text?: string | null;
          metadata?: Json;
        };
        Relationships: [];
      };
      runtime_truth_states: {
        Row: {
          id: string;
          org_id: string;
          agent_id: string;
          canonical_hash: string;
          canonical_json: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          agent_id: string;
          canonical_hash: string;
          canonical_json: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          agent_id?: string;
          canonical_hash?: string;
          canonical_json?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      runtime_approval_requests: {
        Row: {
          id: string;
          org_id: string;
          agent_id: string;
          approval_key: string;
          request_payload: Json;
          status: string;
          expires_at: string | null;
          consumed_at: string | null;
          revoked_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          agent_id: string;
          approval_key: string;
          request_payload: Json;
          status?: string;
          expires_at?: string | null;
          consumed_at?: string | null;
          revoked_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          agent_id?: string;
          approval_key?: string;
          request_payload?: Json;
          status?: string;
          expires_at?: string | null;
          consumed_at?: string | null;
          revoked_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      runtime_ledger_entries: {
        Row: {
          id: string;
          org_id: string;
          agent_id: string;
          request_id: string | null;
          execution_id: string | null;
          truth_state_id: string | null;
          decision: string;
          ledger_sequence: number | null;
          truth_sequence: number;
          reason: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          agent_id: string;
          request_id?: string | null;
          execution_id?: string | null;
          truth_state_id?: string | null;
          decision: string;
          ledger_sequence?: number | null;
          truth_sequence: number;
          reason?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          agent_id?: string;
          request_id?: string | null;
          execution_id?: string | null;
          truth_state_id?: string | null;
          decision?: string;
          ledger_sequence?: number | null;
          truth_sequence?: number;
          reason?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      runtime_effects: {
        Row: {
          id: string;
          org_id: string;
          agent_id: string;
          ledger_entry_id: string | null;
          effect_type: string;
          status: string;
          payload: Json;
          result_payload: Json | null;
          callback_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          agent_id: string;
          ledger_entry_id?: string | null;
          effect_type: string;
          status?: string;
          payload?: Json;
          result_payload?: Json | null;
          callback_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          agent_id?: string;
          ledger_entry_id?: string | null;
          effect_type?: string;
          status?: string;
          payload?: Json;
          result_payload?: Json | null;
          callback_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      runtime_checkpoints: {
        Row: {
          id: string;
          org_id: string;
          agent_id: string;
          truth_state_id: string;
          latest_ledger_entry_id: string;
          checkpoint_hash: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          agent_id: string;
          truth_state_id: string;
          latest_ledger_entry_id: string;
          checkpoint_hash: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          agent_id?: string;
          truth_state_id?: string;
          latest_ledger_entry_id?: string;
          checkpoint_hash?: string;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      guest_access_grants: {
        Row: {
          id: string;
          org_id: string;
          email: string;
          role: string;
          invited_by_user_id: string | null;
          scope: Json;
          expires_at: string | null;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          email: string;
          role?: string;
          invited_by_user_id?: string | null;
          scope?: Json;
          expires_at?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          email?: string;
          role?: string;
          invited_by_user_id?: string | null;
          scope?: Json;
          expires_at?: string | null;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      access_requests: {
        Row: {
          id: string;
          email: string;
          email_domain: string;
          workspace_name: string | null;
          full_name: string | null;
          requested_org_hint: string | null;
          status: string;
          reviewed_by_user_id: string | null;
          review_note: string | null;
          created_at: string;
          updated_at: string;
          org_id: string | null;
        };
        Insert: {
          id?: string;
          email: string;
          email_domain: string;
          workspace_name?: string | null;
          full_name?: string | null;
          requested_org_hint?: string | null;
          status?: string;
          reviewed_by_user_id?: string | null;
          review_note?: string | null;
          created_at?: string;
          updated_at?: string;
          org_id?: string | null;
        };
        Update: {
          id?: string;
          email?: string;
          email_domain?: string;
          workspace_name?: string | null;
          full_name?: string | null;
          requested_org_hint?: string | null;
          status?: string;
          reviewed_by_user_id?: string | null;
          review_note?: string | null;
          created_at?: string;
          updated_at?: string;
          org_id?: string | null;
        };
        Relationships: [];
      };
      sign_in_events: {
        Row: {
          id: string;
          email: string;
          org_id: string | null;
          auth_user_id: string | null;
          event_type: string;
          source: string | null;
          ip_address: string | null;
          user_agent: string | null;
          success: boolean;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          org_id?: string | null;
          auth_user_id?: string | null;
          event_type: string;
          source?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          success?: boolean;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          org_id?: string | null;
          auth_user_id?: string | null;
          event_type?: string;
          source?: string | null;
          ip_address?: string | null;
          user_agent?: string | null;
          success?: boolean;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
      runtime_roles: {
        Row: {
          id: string;
          org_id: string;
          user_id: string;
          role: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          user_id: string;
          role: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          user_id?: string;
          role?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      runtime_policies: {
        Row: {
          id: string;
          org_id: string;
          name: string;
          version: string;
          status: string;
          thresholds: Json;
          governance_state: string;
          created_by: string | null;
          updated_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          name: string;
          version: string;
          status?: string;
          thresholds?: Json;
          governance_state?: string;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          name?: string;
          version?: string;
          status?: string;
          thresholds?: Json;
          governance_state?: string;
          created_by?: string | null;
          updated_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      runtime_policy_governance_events: {
        Row: {
          id: string;
          org_id: string;
          policy_id: string;
          actor_user_id: string | null;
          event_type: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          policy_id: string;
          actor_user_id?: string | null;
          event_type: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          policy_id?: string;
          actor_user_id?: string | null;
          event_type?: string;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      alert_summary_open: {
        Row: {
          org_id: string | null;
          level: string | null;
          code: string | null;
          open_count: number | null;
          last_seen_at: string | null;
        };
        Insert: {
          org_id?: string | null;
          level?: string | null;
          code?: string | null;
          open_count?: number | null;
          last_seen_at?: string | null;
        };
        Update: {
          org_id?: string | null;
          level?: string | null;
          code?: string | null;
          open_count?: number | null;
          last_seen_at?: string | null;
        };
        Relationships: [];
      };
      org_current_readiness: {
        Row: {
          org_id: string | null;
          snapshot_at: string | null;
          readiness_status: string | null;
          readiness_score: number | null;
          readiness_reasons: Json | null;
          core_health_ok: boolean | null;
          core_metrics_ok: boolean | null;
          ledger_ok: boolean | null;
          audit_ok: boolean | null;
          determinism_ok: boolean | null;
          requests_today: number | null;
          avg_latency_ms: number | null;
          active_agents: number | null;
          executions_this_month: number | null;
          overage_executions: number | null;
          alerts_count: number | null;
        };
        Insert: {
          org_id?: string | null;
          snapshot_at?: string | null;
          readiness_status?: string | null;
          readiness_score?: number | null;
          readiness_reasons?: Json | null;
          core_health_ok?: boolean | null;
          core_metrics_ok?: boolean | null;
          ledger_ok?: boolean | null;
          audit_ok?: boolean | null;
          determinism_ok?: boolean | null;
          requests_today?: number | null;
          avg_latency_ms?: number | null;
          active_agents?: number | null;
          executions_this_month?: number | null;
          overage_executions?: number | null;
          alerts_count?: number | null;
        };
        Update: {
          org_id?: string | null;
          snapshot_at?: string | null;
          readiness_status?: string | null;
          readiness_score?: number | null;
          readiness_reasons?: Json | null;
          core_health_ok?: boolean | null;
          core_metrics_ok?: boolean | null;
          ledger_ok?: boolean | null;
          audit_ok?: boolean | null;
          determinism_ok?: boolean | null;
          requests_today?: number | null;
          avg_latency_ms?: number | null;
          active_agents?: number | null;
          executions_this_month?: number | null;
          overage_executions?: number | null;
          alerts_count?: number | null;
        };
        Relationships: [];
      };
      agent_hotspots_7d: {
        Row: {
          org_id: string | null;
          agent_id: string | null;
          requests_count_7d: number | null;
          block_count_7d: number | null;
          stabilize_count_7d: number | null;
          avg_latency_ms_7d: number | null;
          quota_hits_7d: number | null;
          last_used_at: string | null;
        };
        Insert: {
          org_id?: string | null;
          agent_id?: string | null;
          requests_count_7d?: number | null;
          block_count_7d?: number | null;
          stabilize_count_7d?: number | null;
          avg_latency_ms_7d?: number | null;
          quota_hits_7d?: number | null;
          last_used_at?: string | null;
        };
        Update: {
          org_id?: string | null;
          agent_id?: string | null;
          requests_count_7d?: number | null;
          block_count_7d?: number | null;
          stabilize_count_7d?: number | null;
          avg_latency_ms_7d?: number | null;
          quota_hits_7d?: number | null;
          last_used_at?: string | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      runtime_commit_execution: {
        Args: {
          p_org_id: string;
          p_agent_id: string;
          p_request_id: string;
          p_decision: string;
          p_reason: string;
          p_metadata?: Json;
          p_canonical_hash: string;
          p_canonical_json: Json;
          p_latency_ms?: number;
          p_request_payload?: Json;
          p_context_payload?: Json;
          p_policy_version?: string | null;
          p_audit_evidence?: Json;
          p_usage_amount_usd?: number;
          p_created_at?: string;
          p_agent_monthly_limit?: number;
          p_org_plan_limit?: number;
        };
        Returns: {
          ledger_id: string;
          execution_id: string;
          truth_state_id: string;
          ledger_sequence: number;
          truth_sequence: number;
          replayed: boolean;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
