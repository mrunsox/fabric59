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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      agents: {
        Row: {
          created_at: string
          deprovisioned_at: string | null
          deprovisioned_by: string | null
          email: string
          extension: string | null
          first_name: string
          five9_user_id: string | null
          five9_username: string | null
          google_user_id: string | null
          id: string
          last_name: string
          provisioned_at: string
          provisioned_by: string | null
          role: string
          slack_channel: string | null
          slack_user_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deprovisioned_at?: string | null
          deprovisioned_by?: string | null
          email: string
          extension?: string | null
          first_name: string
          five9_user_id?: string | null
          five9_username?: string | null
          google_user_id?: string | null
          id?: string
          last_name: string
          provisioned_at?: string
          provisioned_by?: string | null
          role: string
          slack_channel?: string | null
          slack_user_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deprovisioned_at?: string | null
          deprovisioned_by?: string | null
          email?: string
          extension?: string | null
          first_name?: string
          five9_user_id?: string | null
          five9_username?: string | null
          google_user_id?: string | null
          id?: string
          last_name?: string
          provisioned_at?: string
          provisioned_by?: string | null
          role?: string
          slack_channel?: string | null
          slack_user_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          key_hash: string
          last_used_at: string | null
          name: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash: string
          last_used_at?: string | null
          name: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash?: string
          last_used_at?: string | null
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "api_keys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_keys_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
        ]
      }
      api_logs: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          method: string
          request_payload: Json | null
          response: Json | null
          response_time_ms: number | null
          status: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          method?: string
          request_payload?: Json | null
          response?: Json | null
          response_time_ms?: number | null
          status: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          method?: string
          request_payload?: Json | null
          response?: Json | null
          response_time_ms?: number | null
          status?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "api_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
        ]
      }
      app_config: {
        Row: {
          created_at: string
          description: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      assistant_config: {
        Row: {
          assistant_name: string
          created_at: string
          enabled: boolean
          greeting: string
          id: string
          organization_id: string
          tone: string
          updated_at: string
        }
        Insert: {
          assistant_name?: string
          created_at?: string
          enabled?: boolean
          greeting?: string
          id?: string
          organization_id: string
          tone?: string
          updated_at?: string
        }
        Update: {
          assistant_name?: string
          created_at?: string
          enabled?: boolean
          greeting?: string
          id?: string
          organization_id?: string
          tone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_config_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          organization_id: string | null
          source: string
          tenant_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          organization_id?: string | null
          source?: string
          tenant_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          organization_id?: string | null
          source?: string
          tenant_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      call_log_cache: {
        Row: {
          call_data: Json
          call_timestamp: string
          fetched_at: string
          five9_domain_id: string | null
          id: string
          organization_id: string
        }
        Insert: {
          call_data?: Json
          call_timestamp: string
          fetched_at?: string
          five9_domain_id?: string | null
          id?: string
          organization_id: string
        }
        Update: {
          call_data?: Json
          call_timestamp?: string
          fetched_at?: string
          five9_domain_id?: string | null
          id?: string
          organization_id?: string
        }
        Relationships: []
      }
      call_notes: {
        Row: {
          agent_id: string
          call_session_id: string
          created_at: string
          id: string
          note_text: string
        }
        Insert: {
          agent_id: string
          call_session_id: string
          created_at?: string
          id?: string
          note_text: string
        }
        Update: {
          agent_id?: string
          call_session_id?: string
          created_at?: string
          id?: string
          note_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_notes_call_session_id_fkey"
            columns: ["call_session_id"]
            isOneToOne: false
            referencedRelation: "call_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      call_outcome_types: {
        Row: {
          category: string | null
          description: string | null
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          category?: string | null
          description?: string | null
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          category?: string | null
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_outcome_types_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      call_outcomes: {
        Row: {
          call_session_id: string
          created_at: string
          disposition: string | null
          id: string
          outcome_type_id: string
          summary: string | null
        }
        Insert: {
          call_session_id: string
          created_at?: string
          disposition?: string | null
          id?: string
          outcome_type_id: string
          summary?: string | null
        }
        Update: {
          call_session_id?: string
          created_at?: string
          disposition?: string | null
          id?: string
          outcome_type_id?: string
          summary?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_outcomes_call_session_id_fkey"
            columns: ["call_session_id"]
            isOneToOne: false
            referencedRelation: "call_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_outcomes_outcome_type_id_fkey"
            columns: ["outcome_type_id"]
            isOneToOne: false
            referencedRelation: "call_outcome_types"
            referencedColumns: ["id"]
          },
        ]
      }
      call_session_events: {
        Row: {
          call_session_id: string
          data: Json | null
          event_type: string
          id: string
          node_id: string | null
          timestamp: string
        }
        Insert: {
          call_session_id: string
          data?: Json | null
          event_type: string
          id?: string
          node_id?: string | null
          timestamp?: string
        }
        Update: {
          call_session_id?: string
          data?: Json | null
          event_type?: string
          id?: string
          node_id?: string | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "call_session_events_call_session_id_fkey"
            columns: ["call_session_id"]
            isOneToOne: false
            referencedRelation: "call_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      call_sessions: {
        Row: {
          agent_id: string | null
          ani: string | null
          dnis: string | null
          duration_seconds: number | null
          ended_at: string | null
          five9_call_id: string | null
          id: string
          metadata: Json | null
          organization_id: string
          partner_id: string | null
          script_id: string | null
          script_session_id: string | null
          started_at: string
          status: string
          tenant_id: string | null
        }
        Insert: {
          agent_id?: string | null
          ani?: string | null
          dnis?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          five9_call_id?: string | null
          id?: string
          metadata?: Json | null
          organization_id: string
          partner_id?: string | null
          script_id?: string | null
          script_session_id?: string | null
          started_at?: string
          status?: string
          tenant_id?: string | null
        }
        Update: {
          agent_id?: string | null
          ani?: string | null
          dnis?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          five9_call_id?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string
          partner_id?: string | null
          script_id?: string | null
          script_session_id?: string | null
          started_at?: string
          status?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_sessions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_sessions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "fabric59_agents_identity"
            referencedColumns: ["fabric59_agent_id"]
          },
          {
            foreignKeyName: "call_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_sessions_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_sessions_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_sessions_script_session_id_fkey"
            columns: ["script_session_id"]
            isOneToOne: false
            referencedRelation: "script_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      call_summary_templates: {
        Row: {
          channel: string
          created_at: string
          created_by: string | null
          id: string
          name: string
          organization_id: string
          partner_id: string | null
          template_body: string
          tenant_id: string | null
        }
        Insert: {
          channel?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
          organization_id: string
          partner_id?: string | null
          template_body?: string
          tenant_id?: string | null
        }
        Update: {
          channel?: string
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          organization_id?: string
          partner_id?: string | null
          template_body?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "call_summary_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "call_summary_templates_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      callback_routing_configs: {
        Row: {
          created_at: string
          five9_campaign_id: string | null
          five9_domain_id: string | null
          five9_list_name: string | null
          id: string
          is_active: boolean
          mode: string
          organization_id: string
          queue_name: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          five9_campaign_id?: string | null
          five9_domain_id?: string | null
          five9_list_name?: string | null
          id?: string
          is_active?: boolean
          mode?: string
          organization_id: string
          queue_name: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          five9_campaign_id?: string | null
          five9_domain_id?: string | null
          five9_list_name?: string | null
          id?: string
          is_active?: boolean
          mode?: string
          organization_id?: string
          queue_name?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "callback_routing_configs_five9_domain_id_fkey"
            columns: ["five9_domain_id"]
            isOneToOne: false
            referencedRelation: "five9_domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "callback_routing_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "callback_routing_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "callback_routing_configs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
        ]
      }
      campaign_archives: {
        Row: {
          archived_at: string
          archived_by: string | null
          campaign_name: string
          campaign_setup_id: string | null
          client_name: string | null
          config_snapshot: Json
          deprovisioning_log: Json
          five9_domain_id: string | null
          id: string
          organization_id: string
          restore_notes: string | null
          status: string
        }
        Insert: {
          archived_at?: string
          archived_by?: string | null
          campaign_name: string
          campaign_setup_id?: string | null
          client_name?: string | null
          config_snapshot?: Json
          deprovisioning_log?: Json
          five9_domain_id?: string | null
          id?: string
          organization_id: string
          restore_notes?: string | null
          status?: string
        }
        Update: {
          archived_at?: string
          archived_by?: string | null
          campaign_name?: string
          campaign_setup_id?: string | null
          client_name?: string | null
          config_snapshot?: Json
          deprovisioning_log?: Json
          five9_domain_id?: string | null
          id?: string
          organization_id?: string
          restore_notes?: string | null
          status?: string
        }
        Relationships: []
      }
      campaign_blueprints: {
        Row: {
          agent_guide: string | null
          agent_scripts: Json | null
          connectors: Json | null
          created_at: string
          created_by: string | null
          departments: Json | null
          description: string | null
          dispositions: Json | null
          documents: Json | null
          id: string
          ivr_flow: Json | null
          name: string
          notes: string | null
          organization_id: string
          phone_numbers: Json | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          agent_guide?: string | null
          agent_scripts?: Json | null
          connectors?: Json | null
          created_at?: string
          created_by?: string | null
          departments?: Json | null
          description?: string | null
          dispositions?: Json | null
          documents?: Json | null
          id?: string
          ivr_flow?: Json | null
          name: string
          notes?: string | null
          organization_id: string
          phone_numbers?: Json | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          agent_guide?: string | null
          agent_scripts?: Json | null
          connectors?: Json | null
          created_at?: string
          created_by?: string | null
          departments?: Json | null
          description?: string | null
          dispositions?: Json | null
          documents?: Json | null
          id?: string
          ivr_flow?: Json | null
          name?: string
          notes?: string | null
          organization_id?: string
          phone_numbers?: Json | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_blueprints_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_builder_drafts: {
        Row: {
          client_id: string | null
          created_at: string
          created_route_id: string | null
          current_step: number
          id: string
          organization_id: string
          payload: Json
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_route_id?: string | null
          current_step?: number
          id?: string
          organization_id: string
          payload?: Json
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_route_id?: string | null
          current_step?: number
          id?: string
          organization_id?: string
          payload?: Json
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_builder_drafts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "campaign_builder_drafts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_builder_drafts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "campaign_builder_drafts_created_route_id_fkey"
            columns: ["created_route_id"]
            isOneToOne: false
            referencedRelation: "five9_campaign_routes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_builder_drafts_created_route_id_fkey"
            columns: ["created_route_id"]
            isOneToOne: false
            referencedRelation: "v_campaign_readiness"
            referencedColumns: ["route_id"]
          },
          {
            foreignKeyName: "campaign_builder_drafts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_scripts: {
        Row: {
          created_at: string
          created_by: string | null
          dnis: string | null
          five9_campaign_id: string | null
          five9_domain_id: string | null
          id: string
          is_active: boolean
          organization_id: string
          partner_id: string | null
          script_id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          dnis?: string | null
          five9_campaign_id?: string | null
          five9_domain_id?: string | null
          id?: string
          is_active?: boolean
          organization_id: string
          partner_id?: string | null
          script_id: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          dnis?: string | null
          five9_campaign_id?: string | null
          five9_domain_id?: string | null
          id?: string
          is_active?: boolean
          organization_id?: string
          partner_id?: string | null
          script_id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_scripts_five9_domain_id_fkey"
            columns: ["five9_domain_id"]
            isOneToOne: false
            referencedRelation: "five9_domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_scripts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_scripts_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_scripts_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_setups: {
        Row: {
          campaign_name: string
          campaign_type: string
          checklist_state: Json
          client_name: string
          created_at: string
          created_by: string | null
          five9_domain_id: string | null
          id: string
          intake_data: Json
          notes: string | null
          organization_id: string
          priority: string
          status: string
          target_go_live: string | null
          updated_at: string
        }
        Insert: {
          campaign_name: string
          campaign_type?: string
          checklist_state?: Json
          client_name: string
          created_at?: string
          created_by?: string | null
          five9_domain_id?: string | null
          id?: string
          intake_data?: Json
          notes?: string | null
          organization_id: string
          priority?: string
          status?: string
          target_go_live?: string | null
          updated_at?: string
        }
        Update: {
          campaign_name?: string
          campaign_type?: string
          checklist_state?: Json
          client_name?: string
          created_at?: string
          created_by?: string | null
          five9_domain_id?: string | null
          id?: string
          intake_data?: Json
          notes?: string | null
          organization_id?: string
          priority?: string
          status?: string
          target_go_live?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          client_id: string | null
          created_at: string
          created_by: string | null
          id: string
          legacy_status: string | null
          metadata: Json
          name: string
          source_id: string | null
          source_type: string | null
          status: Database["public"]["Enums"]["campaign_status"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          legacy_status?: string | null
          metadata?: Json
          name: string
          source_id?: string | null
          source_type?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          legacy_status?: string | null
          metadata?: Json
          name?: string
          source_id?: string | null
          source_type?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "campaigns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "campaigns_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      clio_mappings: {
        Row: {
          contact_id: string | null
          created_at: string
          id: string
          matter_id: string | null
          organization_id: string
          phone: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          id?: string
          matter_id?: string | null
          organization_id: string
          phone: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          id?: string
          matter_id?: string | null
          organization_id?: string
          phone?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clio_mappings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clio_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "clio_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clio_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
        ]
      }
      demo_requests: {
        Row: {
          company: string
          created_at: string
          current_crm: string | null
          five9_status: string | null
          focus_areas: string[]
          id: string
          name: string
          notes: string | null
          role: string | null
          slot_1: string | null
          slot_2: string | null
          slot_3: string | null
          source_url: string | null
          status: Database["public"]["Enums"]["demo_request_status"]
          team_size: string | null
          timezone: string | null
          updated_at: string
          user_agent: string | null
          work_email: string
        }
        Insert: {
          company: string
          created_at?: string
          current_crm?: string | null
          five9_status?: string | null
          focus_areas?: string[]
          id?: string
          name: string
          notes?: string | null
          role?: string | null
          slot_1?: string | null
          slot_2?: string | null
          slot_3?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["demo_request_status"]
          team_size?: string | null
          timezone?: string | null
          updated_at?: string
          user_agent?: string | null
          work_email: string
        }
        Update: {
          company?: string
          created_at?: string
          current_crm?: string | null
          five9_status?: string | null
          focus_areas?: string[]
          id?: string
          name?: string
          notes?: string | null
          role?: string | null
          slot_1?: string | null
          slot_2?: string | null
          slot_3?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["demo_request_status"]
          team_size?: string | null
          timezone?: string | null
          updated_at?: string
          user_agent?: string | null
          work_email?: string
        }
        Relationships: []
      }
      deployment_runs: {
        Row: {
          connector_instance_id: string | null
          deployment_id: string
          error: string | null
          external_record_id: string | null
          finished_at: string | null
          id: string
          idempotency_key: string | null
          organization_id: string
          payload: Json | null
          request_payload: Json | null
          response_payload: Json | null
          retry_of: string | null
          source_event_id: string | null
          source_event_type: string | null
          started_at: string
          status: string
          trigger_event_id: string | null
        }
        Insert: {
          connector_instance_id?: string | null
          deployment_id: string
          error?: string | null
          external_record_id?: string | null
          finished_at?: string | null
          id?: string
          idempotency_key?: string | null
          organization_id: string
          payload?: Json | null
          request_payload?: Json | null
          response_payload?: Json | null
          retry_of?: string | null
          source_event_id?: string | null
          source_event_type?: string | null
          started_at?: string
          status?: string
          trigger_event_id?: string | null
        }
        Update: {
          connector_instance_id?: string | null
          deployment_id?: string
          error?: string | null
          external_record_id?: string | null
          finished_at?: string | null
          id?: string
          idempotency_key?: string | null
          organization_id?: string
          payload?: Json | null
          request_payload?: Json | null
          response_payload?: Json | null
          retry_of?: string | null
          source_event_id?: string | null
          source_event_type?: string | null
          started_at?: string
          status?: string
          trigger_event_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deployment_runs_deployment_id_fkey"
            columns: ["deployment_id"]
            isOneToOne: false
            referencedRelation: "deployments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deployment_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deployment_runs_retry_of_fkey"
            columns: ["retry_of"]
            isOneToOne: false
            referencedRelation: "deployment_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      deployments: {
        Row: {
          campaign_name: string | null
          client_id: string | null
          created_at: string
          created_by: string | null
          five9_domain_id: string | null
          flow_id: string
          flow_version: number
          id: string
          organization_id: string
          owner_scope_id: string | null
          owner_scope_type: string
          scope: Json
          status: string
          template_type: string | null
          trigger_type: string | null
          updated_at: string
        }
        Insert: {
          campaign_name?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          five9_domain_id?: string | null
          flow_id: string
          flow_version?: number
          id?: string
          organization_id: string
          owner_scope_id?: string | null
          owner_scope_type?: string
          scope?: Json
          status?: string
          template_type?: string | null
          trigger_type?: string | null
          updated_at?: string
        }
        Update: {
          campaign_name?: string | null
          client_id?: string | null
          created_at?: string
          created_by?: string | null
          five9_domain_id?: string | null
          flow_id?: string
          flow_version?: number
          id?: string
          organization_id?: string
          owner_scope_id?: string | null
          owner_scope_type?: string
          scope?: Json
          status?: string
          template_type?: string | null
          trigger_type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deployments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "deployments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deployments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "deployments_five9_domain_id_fkey"
            columns: ["five9_domain_id"]
            isOneToOne: false
            referencedRelation: "five9_domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deployments_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deployments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      disposition_access: {
        Row: {
          created_at: string
          created_by: string | null
          disposition_name: string
          id: string
          organization_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          disposition_name: string
          id?: string
          organization_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          disposition_name?: string
          id?: string
          organization_id?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          created_at: string
          created_by: string | null
          html_content: string
          id: string
          is_default: boolean
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          html_content?: string
          id?: string
          is_default?: boolean
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          html_content?: string
          id?: string
          is_default?: boolean
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      error_alerts: {
        Row: {
          alerted_via: string[] | null
          created_at: string
          details: Json | null
          error_type: string
          id: string
          message: string
          tenant_id: string | null
        }
        Insert: {
          alerted_via?: string[] | null
          created_at?: string
          details?: Json | null
          error_type: string
          id?: string
          message: string
          tenant_id?: string | null
        }
        Update: {
          alerted_via?: string[] | null
          created_at?: string
          details?: Json | null
          error_type?: string
          id?: string
          message?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "error_alerts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "error_alerts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "error_alerts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
        ]
      }
      feedback_submissions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          organization_id: string
          status: string
          submitted_by: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          organization_id: string
          status?: string
          submitted_by: string
          title: string
          type?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          organization_id?: string
          status?: string
          submitted_by?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "feedback_submissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      field_mappings: {
        Row: {
          created_at: string
          description: string | null
          destination_type: string
          five9_domain_id: string
          id: string
          is_active: boolean | null
          mappings: Json
          name: string
          source_type: string
          tenant_id: string | null
          transformations: Json | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          destination_type: string
          five9_domain_id: string
          id?: string
          is_active?: boolean | null
          mappings?: Json
          name: string
          source_type?: string
          tenant_id?: string | null
          transformations?: Json | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          destination_type?: string
          five9_domain_id?: string
          id?: string
          is_active?: boolean | null
          mappings?: Json
          name?: string
          source_type?: string
          tenant_id?: string | null
          transformations?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "field_mappings_five9_domain_id_fkey"
            columns: ["five9_domain_id"]
            isOneToOne: false
            referencedRelation: "five9_domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "field_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
        ]
      }
      five9_call_variable_groups: {
        Row: {
          campaign_id: string | null
          client_id: string
          created_at: string
          description: string | null
          display_label: string | null
          display_order: number
          group_name: string
          id: string
          organization_id: string
          scope: string
          updated_at: string
        }
        Insert: {
          campaign_id?: string | null
          client_id: string
          created_at?: string
          description?: string | null
          display_label?: string | null
          display_order?: number
          group_name: string
          id?: string
          organization_id: string
          scope?: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string | null
          client_id?: string
          created_at?: string
          description?: string | null
          display_label?: string | null
          display_order?: number
          group_name?: string
          id?: string
          organization_id?: string
          scope?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "five9_call_variable_groups_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "legal_connect_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "five9_call_variable_groups_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "five9_call_variable_groups_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "five9_call_variable_groups_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "five9_call_variable_groups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      five9_call_variables: {
        Row: {
          campaign_id: string | null
          client_id: string
          created_at: string
          data_type: string
          default_value: string | null
          description: string | null
          display_label: string
          display_order: number
          enum_values: Json
          fabric59_field_path: string | null
          group_id: string | null
          id: string
          internal_name: string
          organization_id: string
          required: boolean
          updated_at: string
          validation_rules: Json
        }
        Insert: {
          campaign_id?: string | null
          client_id: string
          created_at?: string
          data_type?: string
          default_value?: string | null
          description?: string | null
          display_label: string
          display_order?: number
          enum_values?: Json
          fabric59_field_path?: string | null
          group_id?: string | null
          id?: string
          internal_name: string
          organization_id: string
          required?: boolean
          updated_at?: string
          validation_rules?: Json
        }
        Update: {
          campaign_id?: string | null
          client_id?: string
          created_at?: string
          data_type?: string
          default_value?: string | null
          description?: string | null
          display_label?: string
          display_order?: number
          enum_values?: Json
          fabric59_field_path?: string | null
          group_id?: string | null
          id?: string
          internal_name?: string
          organization_id?: string
          required?: boolean
          updated_at?: string
          validation_rules?: Json
        }
        Relationships: [
          {
            foreignKeyName: "five9_call_variables_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "legal_connect_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "five9_call_variables_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "five9_call_variables_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "five9_call_variables_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "five9_call_variables_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "five9_call_variable_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "five9_call_variables_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      five9_campaign_routes: {
        Row: {
          call_variable_group_id: string | null
          campaign_name: string | null
          campaign_type: string | null
          client_id: string
          connection_id: string | null
          created_at: string
          default_disposition_policy: string
          dnis: string | null
          five9_domain: string
          id: string
          is_active: boolean
          notes: string | null
          organization_id: string
          priority: number
          provider_target: string | null
          queue_id: string | null
          updated_at: string
        }
        Insert: {
          call_variable_group_id?: string | null
          campaign_name?: string | null
          campaign_type?: string | null
          client_id: string
          connection_id?: string | null
          created_at?: string
          default_disposition_policy?: string
          dnis?: string | null
          five9_domain: string
          id?: string
          is_active?: boolean
          notes?: string | null
          organization_id: string
          priority?: number
          provider_target?: string | null
          queue_id?: string | null
          updated_at?: string
        }
        Update: {
          call_variable_group_id?: string | null
          campaign_name?: string | null
          campaign_type?: string | null
          client_id?: string
          connection_id?: string | null
          created_at?: string
          default_disposition_policy?: string
          dnis?: string | null
          five9_domain?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          organization_id?: string
          priority?: number
          provider_target?: string | null
          queue_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "five9_campaign_routes_call_variable_group_id_fkey"
            columns: ["call_variable_group_id"]
            isOneToOne: false
            referencedRelation: "five9_call_variable_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "five9_campaign_routes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "five9_campaign_routes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "five9_campaign_routes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "five9_campaign_routes_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "legal_connect_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "five9_campaign_routes_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "legal_connect_connections_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "five9_campaign_routes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      five9_domains: {
        Row: {
          api_connection_status: string | null
          api_key_encrypted: string | null
          created_at: string
          display_name: string
          domain: string
          five9_password_encrypted: string | null
          five9_username: string | null
          id: string
          last_connection_test: string | null
          organization_id: string
          status: Database["public"]["Enums"]["five9_domain_status"]
          updated_at: string
          webhook_secret: string | null
          workflow_settings: Json | null
        }
        Insert: {
          api_connection_status?: string | null
          api_key_encrypted?: string | null
          created_at?: string
          display_name: string
          domain: string
          five9_password_encrypted?: string | null
          five9_username?: string | null
          id?: string
          last_connection_test?: string | null
          organization_id: string
          status?: Database["public"]["Enums"]["five9_domain_status"]
          updated_at?: string
          webhook_secret?: string | null
          workflow_settings?: Json | null
        }
        Update: {
          api_connection_status?: string | null
          api_key_encrypted?: string | null
          created_at?: string
          display_name?: string
          domain?: string
          five9_password_encrypted?: string | null
          five9_username?: string | null
          id?: string
          last_connection_test?: string | null
          organization_id?: string
          status?: Database["public"]["Enums"]["five9_domain_status"]
          updated_at?: string
          webhook_secret?: string | null
          workflow_settings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "five9_domains_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      five9_event_log: {
        Row: {
          ani: string | null
          campaign_name: string | null
          correlation_id: string
          created_at: string
          dnis: string | null
          error: string | null
          event_type: string
          five9_domain: string | null
          id: string
          mapped_actions: Json
          normalized_payload: Json
          organization_id: string | null
          processing_time_ms: number | null
          raw_payload: Json
          resolved_client_id: string | null
          resolved_provider: string | null
          status: string
          sync_jobs_created: string[]
          updated_at: string
          worksheet_payload: Json
        }
        Insert: {
          ani?: string | null
          campaign_name?: string | null
          correlation_id: string
          created_at?: string
          dnis?: string | null
          error?: string | null
          event_type: string
          five9_domain?: string | null
          id?: string
          mapped_actions?: Json
          normalized_payload?: Json
          organization_id?: string | null
          processing_time_ms?: number | null
          raw_payload?: Json
          resolved_client_id?: string | null
          resolved_provider?: string | null
          status?: string
          sync_jobs_created?: string[]
          updated_at?: string
          worksheet_payload?: Json
        }
        Update: {
          ani?: string | null
          campaign_name?: string | null
          correlation_id?: string
          created_at?: string
          dnis?: string | null
          error?: string | null
          event_type?: string
          five9_domain?: string | null
          id?: string
          mapped_actions?: Json
          normalized_payload?: Json
          organization_id?: string | null
          processing_time_ms?: number | null
          raw_payload?: Json
          resolved_client_id?: string | null
          resolved_provider?: string | null
          status?: string
          sync_jobs_created?: string[]
          updated_at?: string
          worksheet_payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "five9_event_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "five9_event_log_resolved_client_id_fkey"
            columns: ["resolved_client_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "five9_event_log_resolved_client_id_fkey"
            columns: ["resolved_client_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "five9_event_log_resolved_client_id_fkey"
            columns: ["resolved_client_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
        ]
      }
      flow_templates: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          definition: Json
          description: string | null
          id: string
          name: string
          organization_id: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          definition?: Json
          description?: string | null
          id?: string
          name: string
          organization_id?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          definition?: Json
          description?: string | null
          id?: string
          name?: string
          organization_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "flow_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      flow_versions: {
        Row: {
          created_at: string
          created_by: string | null
          definition: Json
          flow_id: string
          id: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          definition?: Json
          flow_id: string
          id?: string
          version: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          definition?: Json
          flow_id?: string
          id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "flow_versions_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "flows"
            referencedColumns: ["id"]
          },
        ]
      }
      flows: {
        Row: {
          client_id: string | null
          connector_instance_id: string | null
          created_at: string
          created_by: string | null
          definition: Json
          description: string | null
          id: string
          name: string
          organization_id: string
          status: string
          template_type: string | null
          trigger_type: string
          updated_at: string
          version: number
        }
        Insert: {
          client_id?: string | null
          connector_instance_id?: string | null
          created_at?: string
          created_by?: string | null
          definition?: Json
          description?: string | null
          id?: string
          name: string
          organization_id: string
          status?: string
          template_type?: string | null
          trigger_type: string
          updated_at?: string
          version?: number
        }
        Update: {
          client_id?: string | null
          connector_instance_id?: string | null
          created_at?: string
          created_by?: string | null
          definition?: Json
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          status?: string
          template_type?: string | null
          trigger_type?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "flows_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "flows_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flows_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "flows_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      forms: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          metadata: Json
          name: string
          schema: Json
          status: Database["public"]["Enums"]["form_status"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          metadata?: Json
          name: string
          schema?: Json
          status?: Database["public"]["Enums"]["form_status"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          metadata?: Json
          name?: string
          schema?: Json
          status?: Database["public"]["Enums"]["form_status"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forms_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      guide_versions: {
        Row: {
          content: Json
          created_at: string
          created_by: string | null
          guide_id: string
          id: string
          is_current: boolean
          version: number
        }
        Insert: {
          content?: Json
          created_at?: string
          created_by?: string | null
          guide_id: string
          id?: string
          is_current?: boolean
          version: number
        }
        Update: {
          content?: Json
          created_at?: string
          created_by?: string | null
          guide_id?: string
          id?: string
          is_current?: boolean
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "guide_versions_guide_id_fkey"
            columns: ["guide_id"]
            isOneToOne: false
            referencedRelation: "guides"
            referencedColumns: ["id"]
          },
        ]
      }
      guides: {
        Row: {
          campaign_id: string | null
          created_at: string
          created_by: string | null
          current_version: number
          description: string | null
          id: string
          metadata: Json
          name: string
          source_id: string | null
          source_type: string | null
          status: Database["public"]["Enums"]["guide_status"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          created_by?: string | null
          current_version?: number
          description?: string | null
          id?: string
          metadata?: Json
          name: string
          source_id?: string | null
          source_type?: string | null
          status?: Database["public"]["Enums"]["guide_status"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          created_by?: string | null
          current_version?: number
          description?: string | null
          id?: string
          metadata?: Json
          name?: string
          source_id?: string | null
          source_type?: string | null
          status?: Database["public"]["Enums"]["guide_status"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guides_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guides_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      identity_xrefs: {
        Row: {
          external_id: string
          external_system: string
          id: string
          internal_id: string
          organization_id: string
          person_type: string
          synced_at: string | null
        }
        Insert: {
          external_id: string
          external_system: string
          id?: string
          internal_id: string
          organization_id: string
          person_type: string
          synced_at?: string | null
        }
        Update: {
          external_id?: string
          external_system?: string
          id?: string
          internal_id?: string
          organization_id?: string
          person_type?: string
          synced_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "identity_xrefs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_connections: {
        Row: {
          auth_type: string | null
          client_id: string | null
          config: Json
          created_at: string
          created_by: string | null
          credentials_ref: string | null
          display_name: string | null
          id: string
          last_error: string | null
          last_sync_at: string | null
          organization_id: string
          provider_id: string
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          auth_type?: string | null
          client_id?: string | null
          config?: Json
          created_at?: string
          created_by?: string | null
          credentials_ref?: string | null
          display_name?: string | null
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          organization_id: string
          provider_id: string
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          auth_type?: string | null
          client_id?: string | null
          config?: Json
          created_at?: string
          created_by?: string | null
          credentials_ref?: string | null
          display_name?: string | null
          id?: string
          last_error?: string | null
          last_sync_at?: string | null
          organization_id?: string
          provider_id?: string
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_connections_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "integration_connections_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_connections_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "integration_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_connections_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "integration_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_connections_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_mappings: {
        Row: {
          client_id: string | null
          created_at: string
          external_ids: Json
          id: string
          lookup_key: string
          lookup_kind: string
          organization_id: string
          provider_id: string
          source: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          external_ids?: Json
          id?: string
          lookup_key: string
          lookup_kind?: string
          organization_id: string
          provider_id: string
          source?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          client_id?: string | null
          created_at?: string
          external_ids?: Json
          id?: string
          lookup_key?: string
          lookup_kind?: string
          organization_id?: string
          provider_id?: string
          source?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_mappings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "integration_mappings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_mappings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "integration_mappings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_mappings_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "integration_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "integration_mappings_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_providers: {
        Row: {
          auth_type: string
          capabilities: Json
          category: string
          created_at: string
          display_name: string
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          auth_type?: string
          capabilities?: Json
          category: string
          created_at?: string
          display_name: string
          id: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          auth_type?: string
          capabilities?: Json
          category?: string
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      invoice_line_items: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          invoice_id: string
          metadata: Json | null
          quantity: number
          rate: number
          tenant_id: string | null
          unit: string
        }
        Insert: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          invoice_id: string
          metadata?: Json | null
          quantity?: number
          rate?: number
          tenant_id?: string | null
          unit?: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          metadata?: Json | null
          quantity?: number
          rate?: number
          tenant_id?: string | null
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "invoice_line_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_line_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          due_date: string | null
          id: string
          issue_date: string
          notes: string | null
          organization_id: string
          partner_id: string | null
          source_period_end: string | null
          source_period_start: string | null
          source_upload_id: string | null
          status: string
          tenant_id: string | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string
          due_date?: string | null
          id?: string
          issue_date?: string
          notes?: string | null
          organization_id: string
          partner_id?: string | null
          source_period_end?: string | null
          source_period_start?: string | null
          source_upload_id?: string | null
          status?: string
          tenant_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          due_date?: string | null
          id?: string
          issue_date?: string
          notes?: string | null
          organization_id?: string
          partner_id?: string | null
          source_period_end?: string | null
          source_period_start?: string | null
          source_upload_id?: string | null
          status?: string
          tenant_id?: string | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_source_upload_id_fkey"
            columns: ["source_upload_id"]
            isOneToOne: false
            referencedRelation: "report_uploads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
        ]
      }
      kb_articles: {
        Row: {
          category_id: string | null
          content: string
          created_at: string
          created_by: string | null
          id: string
          organization_id: string
          slug: string
          status: string
          tenant_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id: string
          slug: string
          status?: string
          tenant_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          organization_id?: string
          slug?: string
          status?: string
          tenant_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kb_articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "kb_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_articles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_articles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_articles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "kb_articles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_articles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
        ]
      }
      kb_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string
          sort_order: number
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id: string
          sort_order?: number
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          sort_order?: number
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kb_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "kb_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kb_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
        ]
      }
      legal_connect_ack_tokens: {
        Row: {
          action: string
          created_at: string
          event_id: string | null
          expires_at: string
          id: string
          issue_key: string
          organization_id: string
          sink_id: string | null
          source: string
          tenant_id: string | null
          token: string
          used_at: string | null
          used_by: string | null
        }
        Insert: {
          action: string
          created_at?: string
          event_id?: string | null
          expires_at: string
          id?: string
          issue_key: string
          organization_id: string
          sink_id?: string | null
          source?: string
          tenant_id?: string | null
          token: string
          used_at?: string | null
          used_by?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          event_id?: string | null
          expires_at?: string
          id?: string
          issue_key?: string
          organization_id?: string
          sink_id?: string | null
          source?: string
          tenant_id?: string | null
          token?: string
          used_at?: string | null
          used_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_connect_ack_tokens_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "legal_connect_escalation_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_ack_tokens_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_ack_tokens_sink_id_fkey"
            columns: ["sink_id"]
            isOneToOne: false
            referencedRelation: "legal_connect_escalation_sinks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_ack_tokens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "legal_connect_ack_tokens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_ack_tokens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
        ]
      }
      legal_connect_ai_checklists: {
        Row: {
          checklist_items: Json | null
          checklist_type: string
          client_id: string
          created_at: string
          id: string
          organization_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          checklist_items?: Json | null
          checklist_type: string
          client_id: string
          created_at?: string
          id?: string
          organization_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          checklist_items?: Json | null
          checklist_type?: string
          client_id?: string
          created_at?: string
          id?: string
          organization_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_connect_ai_checklists_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "legal_connect_ai_checklists_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_ai_checklists_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "legal_connect_ai_checklists_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_connect_ai_sessions: {
        Row: {
          client_id: string
          created_at: string
          created_by: string | null
          id: string
          input_context: Json | null
          organization_id: string
          output_json: Json | null
          output_markdown: string | null
          session_type: string
        }
        Insert: {
          client_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          input_context?: Json | null
          organization_id: string
          output_json?: Json | null
          output_markdown?: string | null
          session_type: string
        }
        Update: {
          client_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          input_context?: Json | null
          organization_id?: string
          output_json?: Json | null
          output_markdown?: string | null
          session_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_connect_ai_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "legal_connect_ai_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_ai_sessions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "legal_connect_ai_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_connect_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_kind: string
          client_id: string | null
          created_at: string
          details: Json
          id: string
          organization_id: string
          resolved_at: string | null
          severity: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_kind: string
          client_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          organization_id: string
          resolved_at?: string | null
          severity?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_kind?: string
          client_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          organization_id?: string
          resolved_at?: string | null
          severity?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_connect_alerts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "legal_connect_alerts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_alerts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "legal_connect_alerts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_connect_call_variable_mappings: {
        Row: {
          campaign_id: string | null
          canonical_field: string | null
          client_id: string
          created_at: string
          default_value: string | null
          id: string
          metadata: Json | null
          organization_id: string
          pass_through_mode: string
          provider_field_path: string | null
          required: boolean
          sensitive: boolean
          source_location: string
          target_entity: string | null
          transform_rule: string | null
          updated_at: string
          variable_label: string | null
          variable_name: string
          variable_type: string | null
        }
        Insert: {
          campaign_id?: string | null
          canonical_field?: string | null
          client_id: string
          created_at?: string
          default_value?: string | null
          id?: string
          metadata?: Json | null
          organization_id: string
          pass_through_mode?: string
          provider_field_path?: string | null
          required?: boolean
          sensitive?: boolean
          source_location?: string
          target_entity?: string | null
          transform_rule?: string | null
          updated_at?: string
          variable_label?: string | null
          variable_name: string
          variable_type?: string | null
        }
        Update: {
          campaign_id?: string | null
          canonical_field?: string | null
          client_id?: string
          created_at?: string
          default_value?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string
          pass_through_mode?: string
          provider_field_path?: string | null
          required?: boolean
          sensitive?: boolean
          source_location?: string
          target_entity?: string | null
          transform_rule?: string | null
          updated_at?: string
          variable_label?: string | null
          variable_name?: string
          variable_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_connect_call_variable_mappings_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "legal_connect_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_call_variable_mappings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "legal_connect_call_variable_mappings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_call_variable_mappings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "legal_connect_call_variable_mappings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_connect_campaigns: {
        Row: {
          active: boolean
          agent_group: string | null
          campaign_type: string
          client_id: string
          created_at: string
          dnis: string | null
          five9_campaign_id: string | null
          five9_campaign_name: string | null
          id: string
          lookup_on_call_start: boolean
          metadata: Json | null
          organization_id: string
          provider_connection_id: string | null
          queue_name: string | null
          script_template_key: string | null
          submit_on_acw_complete: boolean
          submit_on_disposition: boolean
          updated_at: string
        }
        Insert: {
          active?: boolean
          agent_group?: string | null
          campaign_type?: string
          client_id: string
          created_at?: string
          dnis?: string | null
          five9_campaign_id?: string | null
          five9_campaign_name?: string | null
          id?: string
          lookup_on_call_start?: boolean
          metadata?: Json | null
          organization_id: string
          provider_connection_id?: string | null
          queue_name?: string | null
          script_template_key?: string | null
          submit_on_acw_complete?: boolean
          submit_on_disposition?: boolean
          updated_at?: string
        }
        Update: {
          active?: boolean
          agent_group?: string | null
          campaign_type?: string
          client_id?: string
          created_at?: string
          dnis?: string | null
          five9_campaign_id?: string | null
          five9_campaign_name?: string | null
          id?: string
          lookup_on_call_start?: boolean
          metadata?: Json | null
          organization_id?: string
          provider_connection_id?: string | null
          queue_name?: string | null
          script_template_key?: string | null
          submit_on_acw_complete?: boolean
          submit_on_disposition?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_connect_campaigns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "legal_connect_campaigns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_campaigns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "legal_connect_campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_campaigns_provider_connection_id_fkey"
            columns: ["provider_connection_id"]
            isOneToOne: false
            referencedRelation: "legal_connect_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_campaigns_provider_connection_id_fkey"
            columns: ["provider_connection_id"]
            isOneToOne: false
            referencedRelation: "legal_connect_connections_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_connect_client_capabilities: {
        Row: {
          capability_key: string
          client_id: string
          created_at: string
          enabled: boolean
          id: string
          mode: string
          notes: string | null
          organization_id: string
          provider: string
          updated_at: string
        }
        Insert: {
          capability_key: string
          client_id: string
          created_at?: string
          enabled?: boolean
          id?: string
          mode?: string
          notes?: string | null
          organization_id: string
          provider: string
          updated_at?: string
        }
        Update: {
          capability_key?: string
          client_id?: string
          created_at?: string
          enabled?: boolean
          id?: string
          mode?: string
          notes?: string | null
          organization_id?: string
          provider?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_connect_client_capabilities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "legal_connect_client_capabilities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_client_capabilities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "legal_connect_client_capabilities_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_connect_conflicts: {
        Row: {
          assigned_to: string | null
          canonical_entity_id: string | null
          canonical_entity_type: string | null
          client_id: string
          conflict_type: string
          created_at: string
          details: Json | null
          id: string
          organization_id: string
          provider: string | null
          related_event_log_id: string | null
          related_sync_job_id: string | null
          resolution_status: string
          resolved_at: string | null
          severity: string
          suggested_resolution: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          canonical_entity_id?: string | null
          canonical_entity_type?: string | null
          client_id: string
          conflict_type: string
          created_at?: string
          details?: Json | null
          id?: string
          organization_id: string
          provider?: string | null
          related_event_log_id?: string | null
          related_sync_job_id?: string | null
          resolution_status?: string
          resolved_at?: string | null
          severity?: string
          suggested_resolution?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          canonical_entity_id?: string | null
          canonical_entity_type?: string | null
          client_id?: string
          conflict_type?: string
          created_at?: string
          details?: Json | null
          id?: string
          organization_id?: string
          provider?: string | null
          related_event_log_id?: string | null
          related_sync_job_id?: string | null
          resolution_status?: string
          resolved_at?: string | null
          severity?: string
          suggested_resolution?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_connect_conflicts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "legal_connect_conflicts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_conflicts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "legal_connect_conflicts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_conflicts_related_event_log_id_fkey"
            columns: ["related_event_log_id"]
            isOneToOne: false
            referencedRelation: "legal_connect_event_log"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_conflicts_related_sync_job_id_fkey"
            columns: ["related_sync_job_id"]
            isOneToOne: false
            referencedRelation: "legal_connect_sync_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_connect_connections: {
        Row: {
          access_token_expires_at: string | null
          auth_state_meta: Json
          auth_type: string | null
          base_url: string | null
          client_id: string
          connection_name: string | null
          created_at: string
          deauth_callback_enabled: boolean | null
          encrypted_access_token: string | null
          encrypted_refresh_token: string | null
          id: string
          is_sandbox: boolean
          last_connected_at: string | null
          last_error_at: string | null
          last_error_message: string | null
          last_refreshed_at: string | null
          metadata: Json | null
          organization_id: string
          provider: string
          provider_account_id: string | null
          provider_region: string | null
          refresh_token_expires_at: string | null
          scopes: Json | null
          status: string
          updated_at: string
        }
        Insert: {
          access_token_expires_at?: string | null
          auth_state_meta?: Json
          auth_type?: string | null
          base_url?: string | null
          client_id: string
          connection_name?: string | null
          created_at?: string
          deauth_callback_enabled?: boolean | null
          encrypted_access_token?: string | null
          encrypted_refresh_token?: string | null
          id?: string
          is_sandbox?: boolean
          last_connected_at?: string | null
          last_error_at?: string | null
          last_error_message?: string | null
          last_refreshed_at?: string | null
          metadata?: Json | null
          organization_id: string
          provider: string
          provider_account_id?: string | null
          provider_region?: string | null
          refresh_token_expires_at?: string | null
          scopes?: Json | null
          status?: string
          updated_at?: string
        }
        Update: {
          access_token_expires_at?: string | null
          auth_state_meta?: Json
          auth_type?: string | null
          base_url?: string | null
          client_id?: string
          connection_name?: string | null
          created_at?: string
          deauth_callback_enabled?: boolean | null
          encrypted_access_token?: string | null
          encrypted_refresh_token?: string | null
          id?: string
          is_sandbox?: boolean
          last_connected_at?: string | null
          last_error_at?: string | null
          last_error_message?: string | null
          last_refreshed_at?: string | null
          metadata?: Json | null
          organization_id?: string
          provider?: string
          provider_account_id?: string | null
          provider_region?: string | null
          refresh_token_expires_at?: string | null
          scopes?: Json | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_connect_connections_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "legal_connect_connections_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_connections_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "legal_connect_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_connect_contacts: {
        Row: {
          alt_phone_e164: string | null
          client_id: string
          created_at: string
          email: string | null
          first_name: string | null
          full_name: string | null
          id: string
          last_name: string | null
          metadata: Json | null
          organization_id: string
          organization_name: string | null
          phone_e164: string | null
          source_provider: string | null
          source_updated_at: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          alt_phone_e164?: string | null
          client_id: string
          created_at?: string
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          metadata?: Json | null
          organization_id: string
          organization_name?: string | null
          phone_e164?: string | null
          source_provider?: string | null
          source_updated_at?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          alt_phone_e164?: string | null
          client_id?: string
          created_at?: string
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          id?: string
          last_name?: string | null
          metadata?: Json | null
          organization_id?: string
          organization_name?: string | null
          phone_e164?: string | null
          source_provider?: string | null
          source_updated_at?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_connect_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "legal_connect_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_contacts_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "legal_connect_contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_connect_digest_runs: {
        Row: {
          cadence: string
          cohort: string
          created_at: string
          delivery_error: string | null
          delivery_status: string
          id: string
          last_html: string | null
          organization_id: string
          recipients_count: number
          summary: Json
          tenant_id: string | null
          triggered_by: string | null
          window_end: string
          window_start: string
        }
        Insert: {
          cadence?: string
          cohort?: string
          created_at?: string
          delivery_error?: string | null
          delivery_status?: string
          id?: string
          last_html?: string | null
          organization_id: string
          recipients_count?: number
          summary?: Json
          tenant_id?: string | null
          triggered_by?: string | null
          window_end: string
          window_start: string
        }
        Update: {
          cadence?: string
          cohort?: string
          created_at?: string
          delivery_error?: string | null
          delivery_status?: string
          id?: string
          last_html?: string | null
          organization_id?: string
          recipients_count?: number
          summary?: Json
          tenant_id?: string | null
          triggered_by?: string | null
          window_end?: string
          window_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_connect_digest_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_digest_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "legal_connect_digest_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_digest_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
        ]
      }
      legal_connect_digest_schedules: {
        Row: {
          cadence: string
          cohort: string
          created_at: string
          created_by: string | null
          enabled: boolean
          hour_utc: number
          id: string
          last_run_at: string | null
          next_run_at: string | null
          organization_id: string
          tenant_id: string | null
          updated_at: string
          weekday: number
        }
        Insert: {
          cadence?: string
          cohort?: string
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          hour_utc?: number
          id?: string
          last_run_at?: string | null
          next_run_at?: string | null
          organization_id: string
          tenant_id?: string | null
          updated_at?: string
          weekday?: number
        }
        Update: {
          cadence?: string
          cohort?: string
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          hour_utc?: number
          id?: string
          last_run_at?: string | null
          next_run_at?: string | null
          organization_id?: string
          tenant_id?: string | null
          updated_at?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "legal_connect_digest_schedules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_digest_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "legal_connect_digest_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_digest_schedules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
        ]
      }
      legal_connect_digest_subscriptions: {
        Row: {
          cadence: string
          cohort: string
          created_at: string
          created_by: string | null
          enabled: boolean
          id: string
          last_sent_at: string | null
          organization_id: string
          recipient_email: string
          recipient_name: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          cadence?: string
          cohort?: string
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          id?: string
          last_sent_at?: string | null
          organization_id: string
          recipient_email: string
          recipient_name?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          cadence?: string
          cohort?: string
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          id?: string
          last_sent_at?: string | null
          organization_id?: string
          recipient_email?: string
          recipient_name?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_connect_digest_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_digest_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "legal_connect_digest_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_digest_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
        ]
      }
      legal_connect_disposition_mappings: {
        Row: {
          action_profile_key: string | null
          attach_to_existing_matter: boolean
          campaign_id: string | null
          client_id: string
          create_activity: boolean
          create_callback: boolean
          create_contact: boolean
          create_matter: boolean
          create_note: boolean
          create_task: boolean
          create_time_entry: boolean
          created_at: string
          crm_status_target: string | null
          disposition_code: string
          disposition_label: string | null
          id: string
          is_open_disposition: boolean
          mark_consult_booked: boolean
          metadata: Json | null
          organization_id: string
          priority: number
          provider_target: string | null
          reporting_value: string | null
          require_call_notes: boolean
          require_followup_date: boolean
          required_call_variables: string[]
          send_to_manual_review: boolean
          unsupported_action_behavior: string
          update_contact: boolean
          updated_at: string
        }
        Insert: {
          action_profile_key?: string | null
          attach_to_existing_matter?: boolean
          campaign_id?: string | null
          client_id: string
          create_activity?: boolean
          create_callback?: boolean
          create_contact?: boolean
          create_matter?: boolean
          create_note?: boolean
          create_task?: boolean
          create_time_entry?: boolean
          created_at?: string
          crm_status_target?: string | null
          disposition_code: string
          disposition_label?: string | null
          id?: string
          is_open_disposition?: boolean
          mark_consult_booked?: boolean
          metadata?: Json | null
          organization_id: string
          priority?: number
          provider_target?: string | null
          reporting_value?: string | null
          require_call_notes?: boolean
          require_followup_date?: boolean
          required_call_variables?: string[]
          send_to_manual_review?: boolean
          unsupported_action_behavior?: string
          update_contact?: boolean
          updated_at?: string
        }
        Update: {
          action_profile_key?: string | null
          attach_to_existing_matter?: boolean
          campaign_id?: string | null
          client_id?: string
          create_activity?: boolean
          create_callback?: boolean
          create_contact?: boolean
          create_matter?: boolean
          create_note?: boolean
          create_task?: boolean
          create_time_entry?: boolean
          created_at?: string
          crm_status_target?: string | null
          disposition_code?: string
          disposition_label?: string | null
          id?: string
          is_open_disposition?: boolean
          mark_consult_booked?: boolean
          metadata?: Json | null
          organization_id?: string
          priority?: number
          provider_target?: string | null
          reporting_value?: string | null
          require_call_notes?: boolean
          require_followup_date?: boolean
          required_call_variables?: string[]
          send_to_manual_review?: boolean
          unsupported_action_behavior?: string
          update_contact?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_connect_disposition_mappings_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "legal_connect_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_disposition_mappings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "legal_connect_disposition_mappings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_disposition_mappings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "legal_connect_disposition_mappings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_connect_entity_links: {
        Row: {
          canonical_entity_id: string
          client_id: string
          created_at: string
          entity_type: string
          id: string
          last_synced_at: string | null
          organization_id: string
          provider: string
          provider_entity_id: string
          provider_parent_entity_id: string | null
          sync_hash: string | null
          updated_at: string
        }
        Insert: {
          canonical_entity_id: string
          client_id: string
          created_at?: string
          entity_type: string
          id?: string
          last_synced_at?: string | null
          organization_id: string
          provider: string
          provider_entity_id: string
          provider_parent_entity_id?: string | null
          sync_hash?: string | null
          updated_at?: string
        }
        Update: {
          canonical_entity_id?: string
          client_id?: string
          created_at?: string
          entity_type?: string
          id?: string
          last_synced_at?: string | null
          organization_id?: string
          provider?: string
          provider_entity_id?: string
          provider_parent_entity_id?: string | null
          sync_hash?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_connect_entity_links_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "legal_connect_entity_links_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_entity_links_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "legal_connect_entity_links_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_connect_escalation_events: {
        Row: {
          ack_status: string
          acked_at: string | null
          acked_by: string | null
          created_at: string
          delivery_error: string | null
          delivery_status: string
          id: string
          linked_issue_key: string | null
          organization_id: string
          payload: Json
          severity: string
          sink_id: string | null
          tenant_id: string | null
          trigger_kind: string
        }
        Insert: {
          ack_status?: string
          acked_at?: string | null
          acked_by?: string | null
          created_at?: string
          delivery_error?: string | null
          delivery_status?: string
          id?: string
          linked_issue_key?: string | null
          organization_id: string
          payload: Json
          severity: string
          sink_id?: string | null
          tenant_id?: string | null
          trigger_kind: string
        }
        Update: {
          ack_status?: string
          acked_at?: string | null
          acked_by?: string | null
          created_at?: string
          delivery_error?: string | null
          delivery_status?: string
          id?: string
          linked_issue_key?: string | null
          organization_id?: string
          payload?: Json
          severity?: string
          sink_id?: string | null
          tenant_id?: string | null
          trigger_kind?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_connect_escalation_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_escalation_events_sink_id_fkey"
            columns: ["sink_id"]
            isOneToOne: false
            referencedRelation: "legal_connect_escalation_sinks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_escalation_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "legal_connect_escalation_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_escalation_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
        ]
      }
      legal_connect_escalation_sinks: {
        Row: {
          cohort_filter: string | null
          created_at: string
          created_by: string | null
          enabled: boolean
          hmac_secret: string | null
          id: string
          kind: string
          last_fired_at: string | null
          name: string
          organization_id: string
          severity_threshold: string
          target: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          cohort_filter?: string | null
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          hmac_secret?: string | null
          id?: string
          kind: string
          last_fired_at?: string | null
          name: string
          organization_id: string
          severity_threshold?: string
          target: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          cohort_filter?: string | null
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          hmac_secret?: string | null
          id?: string
          kind?: string
          last_fired_at?: string | null
          name?: string
          organization_id?: string
          severity_threshold?: string
          target?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_connect_escalation_sinks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_escalation_sinks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "legal_connect_escalation_sinks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_escalation_sinks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
        ]
      }
      legal_connect_event_log: {
        Row: {
          call_id: string | null
          campaign_id: string | null
          client_id: string
          correlation_id: string | null
          created_at: string
          direction: string
          event_key: string | null
          failure_reason: string | null
          id: string
          normalized_payload: Json | null
          organization_id: string
          payload: Json | null
          processed_at: string | null
          processing_status: string
          provider: string | null
          raw_headers: Json | null
          received_at: string
          signature_valid: boolean | null
          source_event_type: string | null
          source_type: string
        }
        Insert: {
          call_id?: string | null
          campaign_id?: string | null
          client_id: string
          correlation_id?: string | null
          created_at?: string
          direction: string
          event_key?: string | null
          failure_reason?: string | null
          id?: string
          normalized_payload?: Json | null
          organization_id: string
          payload?: Json | null
          processed_at?: string | null
          processing_status?: string
          provider?: string | null
          raw_headers?: Json | null
          received_at?: string
          signature_valid?: boolean | null
          source_event_type?: string | null
          source_type: string
        }
        Update: {
          call_id?: string | null
          campaign_id?: string | null
          client_id?: string
          correlation_id?: string | null
          created_at?: string
          direction?: string
          event_key?: string | null
          failure_reason?: string | null
          id?: string
          normalized_payload?: Json | null
          organization_id?: string
          payload?: Json | null
          processed_at?: string | null
          processing_status?: string
          provider?: string | null
          raw_headers?: Json | null
          received_at?: string
          signature_valid?: boolean | null
          source_event_type?: string | null
          source_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_connect_event_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "legal_connect_event_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_event_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "legal_connect_event_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_connect_examples: {
        Row: {
          capability_check: Json | null
          category: string
          created_at: string
          description: string | null
          five9_input: Json | null
          id: string
          normalized_event: Json
          policy_decision: Json
          provider: string
          raw_payload: Json
          review_triggers: Json
          scenario_key: string
          sort_order: number
          sync_jobs_emitted: Json
          tags: string[]
          title: string
        }
        Insert: {
          capability_check?: Json | null
          category: string
          created_at?: string
          description?: string | null
          five9_input?: Json | null
          id?: string
          normalized_event?: Json
          policy_decision?: Json
          provider: string
          raw_payload?: Json
          review_triggers?: Json
          scenario_key: string
          sort_order?: number
          sync_jobs_emitted?: Json
          tags?: string[]
          title: string
        }
        Update: {
          capability_check?: Json | null
          category?: string
          created_at?: string
          description?: string | null
          five9_input?: Json | null
          id?: string
          normalized_event?: Json
          policy_decision?: Json
          provider?: string
          raw_payload?: Json
          review_triggers?: Json
          scenario_key?: string
          sort_order?: number
          sync_jobs_emitted?: Json
          tags?: string[]
          title?: string
        }
        Relationships: []
      }
      legal_connect_failure_classifications: {
        Row: {
          classification: Database["public"]["Enums"]["failure_classification_type"]
          client_id: string
          created_at: string
          event_log_id: string | null
          id: string
          is_retryable: boolean
          notes: string | null
          organization_id: string
          sync_job_id: string | null
        }
        Insert: {
          classification: Database["public"]["Enums"]["failure_classification_type"]
          client_id: string
          created_at?: string
          event_log_id?: string | null
          id?: string
          is_retryable?: boolean
          notes?: string | null
          organization_id: string
          sync_job_id?: string | null
        }
        Update: {
          classification?: Database["public"]["Enums"]["failure_classification_type"]
          client_id?: string
          created_at?: string
          event_log_id?: string | null
          id?: string
          is_retryable?: boolean
          notes?: string | null
          organization_id?: string
          sync_job_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_connect_failure_classifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "legal_connect_failure_classifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_failure_classifications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "legal_connect_failure_classifications_event_log_id_fkey"
            columns: ["event_log_id"]
            isOneToOne: false
            referencedRelation: "legal_connect_event_log"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_failure_classifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_failure_classifications_sync_job_id_fkey"
            columns: ["sync_job_id"]
            isOneToOne: false
            referencedRelation: "legal_connect_sync_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_connect_feedback_entries: {
        Row: {
          client_id: string | null
          created_at: string
          entry_type: string
          id: string
          logged_by: string | null
          logged_by_name: string | null
          message: string
          metadata: Json
          organization_id: string
          severity: string | null
          shipped_release_note_id: string | null
          source: string
          status: string
          topic: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          created_at?: string
          entry_type?: string
          id?: string
          logged_by?: string | null
          logged_by_name?: string | null
          message: string
          metadata?: Json
          organization_id: string
          severity?: string | null
          shipped_release_note_id?: string | null
          source?: string
          status?: string
          topic?: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          created_at?: string
          entry_type?: string
          id?: string
          logged_by?: string | null
          logged_by_name?: string | null
          message?: string
          metadata?: Json
          organization_id?: string
          severity?: string | null
          shipped_release_note_id?: string | null
          source?: string
          status?: string
          topic?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_connect_feedback_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "legal_connect_feedback_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_feedback_entries_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "legal_connect_feedback_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_feedback_entries_shipped_release_note_id_fkey"
            columns: ["shipped_release_note_id"]
            isOneToOne: false
            referencedRelation: "legal_connect_release_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_connect_field_policies: {
        Row: {
          canonical_field: string | null
          client_id: string
          created_at: string
          direction: string
          entity_name: string
          id: string
          mode: string
          notes: string | null
          organization_id: string
          provider: string
          sensitivity_level: string
          updated_at: string
        }
        Insert: {
          canonical_field?: string | null
          client_id: string
          created_at?: string
          direction: string
          entity_name: string
          id?: string
          mode?: string
          notes?: string | null
          organization_id: string
          provider: string
          sensitivity_level?: string
          updated_at?: string
        }
        Update: {
          canonical_field?: string | null
          client_id?: string
          created_at?: string
          direction?: string
          entity_name?: string
          id?: string
          mode?: string
          notes?: string | null
          organization_id?: string
          provider?: string
          sensitivity_level?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_connect_field_policies_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "legal_connect_field_policies_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_field_policies_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "legal_connect_field_policies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_connect_ga_checklist_state: {
        Row: {
          created_at: string
          id: string
          item_id: string
          note: string | null
          organization_id: string
          status: string
          tenant_id: string
          updated_at: string
          updated_by: string | null
          updated_by_name: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          note?: string | null
          organization_id: string
          status?: string
          tenant_id: string
          updated_at?: string
          updated_by?: string | null
          updated_by_name?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          note?: string | null
          organization_id?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          updated_by?: string | null
          updated_by_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_connect_ga_checklist_state_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "legal_connect_ga_checklist_state_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_ga_checklist_state_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
        ]
      }
      legal_connect_issue_reviews: {
        Row: {
          created_at: string
          external_actor: string | null
          id: string
          issue_key: string
          note: string | null
          organization_id: string
          status: string
          updated_at: string
          updated_by: string | null
          updated_by_name: string | null
          updated_from: string
        }
        Insert: {
          created_at?: string
          external_actor?: string | null
          id?: string
          issue_key: string
          note?: string | null
          organization_id: string
          status?: string
          updated_at?: string
          updated_by?: string | null
          updated_by_name?: string | null
          updated_from?: string
        }
        Update: {
          created_at?: string
          external_actor?: string | null
          id?: string
          issue_key?: string
          note?: string | null
          organization_id?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
          updated_by_name?: string | null
          updated_from?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_connect_issue_reviews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_connect_matters: {
        Row: {
          client_id: string
          created_at: string
          id: string
          matter_name: string | null
          matter_number: string | null
          metadata: Json | null
          organization_id: string
          practice_area: string | null
          primary_contact_id: string | null
          source_provider: string | null
          source_updated_at: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          matter_name?: string | null
          matter_number?: string | null
          metadata?: Json | null
          organization_id: string
          practice_area?: string | null
          primary_contact_id?: string | null
          source_provider?: string | null
          source_updated_at?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          matter_name?: string | null
          matter_number?: string | null
          metadata?: Json | null
          organization_id?: string
          practice_area?: string | null
          primary_contact_id?: string | null
          source_provider?: string | null
          source_updated_at?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_connect_matters_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "legal_connect_matters_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_matters_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "legal_connect_matters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_matters_primary_contact_id_fkey"
            columns: ["primary_contact_id"]
            isOneToOne: false
            referencedRelation: "legal_connect_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_connect_notes: {
        Row: {
          body: string | null
          call_id: string | null
          client_id: string
          created_at: string
          disposition_code: string | null
          id: string
          metadata: Json | null
          note_type: string | null
          organization_id: string
          related_contact_id: string | null
          related_matter_id: string | null
          source_provider: string | null
          source_updated_at: string | null
          updated_at: string
        }
        Insert: {
          body?: string | null
          call_id?: string | null
          client_id: string
          created_at?: string
          disposition_code?: string | null
          id?: string
          metadata?: Json | null
          note_type?: string | null
          organization_id: string
          related_contact_id?: string | null
          related_matter_id?: string | null
          source_provider?: string | null
          source_updated_at?: string | null
          updated_at?: string
        }
        Update: {
          body?: string | null
          call_id?: string | null
          client_id?: string
          created_at?: string
          disposition_code?: string | null
          id?: string
          metadata?: Json | null
          note_type?: string | null
          organization_id?: string
          related_contact_id?: string | null
          related_matter_id?: string | null
          source_provider?: string | null
          source_updated_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_connect_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "legal_connect_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "legal_connect_notes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_notes_related_contact_id_fkey"
            columns: ["related_contact_id"]
            isOneToOne: false
            referencedRelation: "legal_connect_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_notes_related_matter_id_fkey"
            columns: ["related_matter_id"]
            isOneToOne: false
            referencedRelation: "legal_connect_matters"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_connect_oauth_states: {
        Row: {
          client_id: string
          created_at: string
          expires_at: string
          organization_id: string
          provider: string
          redirect_after: string | null
          state: string
          user_id: string | null
        }
        Insert: {
          client_id: string
          created_at?: string
          expires_at?: string
          organization_id: string
          provider: string
          redirect_after?: string | null
          state: string
          user_id?: string | null
        }
        Update: {
          client_id?: string
          created_at?: string
          expires_at?: string
          organization_id?: string
          provider?: string
          redirect_after?: string | null
          state?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_connect_oauth_states_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "legal_connect_oauth_states_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_oauth_states_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "legal_connect_oauth_states_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_connect_policy_profiles: {
        Row: {
          allow_activity_create: boolean
          allow_callback_create: boolean
          allow_contact_create: boolean
          allow_contact_update: boolean
          allow_matter_create: boolean
          allow_matter_update: boolean
          allow_note_create: boolean
          allow_sensitive_field_sync: boolean
          allow_task_create: boolean
          allow_time_entry_create: boolean
          ambiguous_match_mode: string
          client_id: string
          created_at: string
          duplicate_prevention_mode: string
          id: string
          is_default: boolean
          name: string
          organization_id: string
          unknown_caller_mode: string
          unmatched_matter_mode: string
          updated_at: string
        }
        Insert: {
          allow_activity_create?: boolean
          allow_callback_create?: boolean
          allow_contact_create?: boolean
          allow_contact_update?: boolean
          allow_matter_create?: boolean
          allow_matter_update?: boolean
          allow_note_create?: boolean
          allow_sensitive_field_sync?: boolean
          allow_task_create?: boolean
          allow_time_entry_create?: boolean
          ambiguous_match_mode?: string
          client_id: string
          created_at?: string
          duplicate_prevention_mode?: string
          id?: string
          is_default?: boolean
          name: string
          organization_id: string
          unknown_caller_mode?: string
          unmatched_matter_mode?: string
          updated_at?: string
        }
        Update: {
          allow_activity_create?: boolean
          allow_callback_create?: boolean
          allow_contact_create?: boolean
          allow_contact_update?: boolean
          allow_matter_create?: boolean
          allow_matter_update?: boolean
          allow_note_create?: boolean
          allow_sensitive_field_sync?: boolean
          allow_task_create?: boolean
          allow_time_entry_create?: boolean
          ambiguous_match_mode?: string
          client_id?: string
          created_at?: string
          duplicate_prevention_mode?: string
          id?: string
          is_default?: boolean
          name?: string
          organization_id?: string
          unknown_caller_mode?: string
          unmatched_matter_mode?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_connect_policy_profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "legal_connect_policy_profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_policy_profiles_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "legal_connect_policy_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_connect_prompt_templates: {
        Row: {
          campaign_type_overrides: Json | null
          category: string
          created_at: string
          description: string | null
          enabled: boolean
          id: string
          input_schema: Json
          organization_id: string | null
          output_schema: Json
          prompt_key: string
          provider_notes: Json | null
          role: string
          system_prompt: string
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          campaign_type_overrides?: Json | null
          category: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          input_schema?: Json
          organization_id?: string | null
          output_schema?: Json
          prompt_key: string
          provider_notes?: Json | null
          role?: string
          system_prompt: string
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          campaign_type_overrides?: Json | null
          category?: string
          created_at?: string
          description?: string | null
          enabled?: boolean
          id?: string
          input_schema?: Json
          organization_id?: string | null
          output_schema?: Json
          prompt_key?: string
          provider_notes?: Json | null
          role?: string
          system_prompt?: string
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "legal_connect_prompt_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_connect_provider_capabilities: {
        Row: {
          capability_key: string
          capability_name: string
          created_at: string
          id: string
          notes: string | null
          provider: string
          support_mode: string
          supported: boolean
          updated_at: string
        }
        Insert: {
          capability_key: string
          capability_name: string
          created_at?: string
          id?: string
          notes?: string | null
          provider: string
          support_mode?: string
          supported?: boolean
          updated_at?: string
        }
        Update: {
          capability_key?: string
          capability_name?: string
          created_at?: string
          id?: string
          notes?: string | null
          provider?: string
          support_mode?: string
          supported?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      legal_connect_release_notes: {
        Row: {
          audience: string
          created_at: string
          details: Json
          dev_guide_link: string | null
          highlights: Json
          id: string
          published_at: string
          slug: string
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          audience?: string
          created_at?: string
          details?: Json
          dev_guide_link?: string | null
          highlights?: Json
          id?: string
          published_at?: string
          slug: string
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          audience?: string
          created_at?: string
          details?: Json
          dev_guide_link?: string | null
          highlights?: Json
          id?: string
          published_at?: string
          slug?: string
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      legal_connect_retention_policies: {
        Row: {
          action: string
          category: string
          created_at: string
          id: string
          notes: string | null
          organization_id: string
          retention_days: number
          updated_at: string
          updated_by: string | null
          updated_by_name: string | null
        }
        Insert: {
          action?: string
          category: string
          created_at?: string
          id?: string
          notes?: string | null
          organization_id: string
          retention_days: number
          updated_at?: string
          updated_by?: string | null
          updated_by_name?: string | null
        }
        Update: {
          action?: string
          category?: string
          created_at?: string
          id?: string
          notes?: string | null
          organization_id?: string
          retention_days?: number
          updated_at?: string
          updated_by?: string | null
          updated_by_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_connect_retention_policies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_connect_review_queue: {
        Row: {
          acted_at: string | null
          acted_by: string | null
          action_payload: Json | null
          client_id: string
          created_at: string
          created_by: string | null
          description: string | null
          event_log_id: string | null
          id: string
          organization_id: string
          provider: string | null
          recommended_action: string | null
          review_type: string
          status: string
          sync_job_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          acted_at?: string | null
          acted_by?: string | null
          action_payload?: Json | null
          client_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_log_id?: string | null
          id?: string
          organization_id: string
          provider?: string | null
          recommended_action?: string | null
          review_type: string
          status?: string
          sync_job_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          acted_at?: string | null
          acted_by?: string | null
          action_payload?: Json | null
          client_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_log_id?: string | null
          id?: string
          organization_id?: string
          provider?: string | null
          recommended_action?: string | null
          review_type?: string
          status?: string
          sync_job_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_connect_review_queue_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "legal_connect_review_queue_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_review_queue_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "legal_connect_review_queue_event_log_id_fkey"
            columns: ["event_log_id"]
            isOneToOne: false
            referencedRelation: "legal_connect_event_log"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_review_queue_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_review_queue_sync_job_id_fkey"
            columns: ["sync_job_id"]
            isOneToOne: false
            referencedRelation: "legal_connect_sync_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_connect_secret_rotations: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          organization_id: string
          rotated_by: string | null
          rotated_by_name: string | null
          secret_kind: string
          secret_ref: string | null
          source: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          organization_id: string
          rotated_by?: string | null
          rotated_by_name?: string | null
          secret_kind: string
          secret_ref?: string | null
          source?: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          organization_id?: string
          rotated_by?: string | null
          rotated_by_name?: string | null
          secret_kind?: string
          secret_ref?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_connect_secret_rotations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_connect_sync_jobs: {
        Row: {
          attempt_count: number
          client_id: string
          correlation_id: string | null
          created_at: string
          direction: string | null
          failed_at: string | null
          failure_classification: string | null
          failure_reason: string | null
          id: string
          idempotency_key: string | null
          input_payload: Json | null
          is_replay: boolean
          job_type: string
          last_attempt_at: string | null
          max_attempts: number
          next_attempt_at: string | null
          organization_id: string
          output_payload: Json | null
          priority: number
          provider: string
          replay_source_id: string | null
          source_event_log_id: string | null
          status: string
          succeeded_at: string | null
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          client_id: string
          correlation_id?: string | null
          created_at?: string
          direction?: string | null
          failed_at?: string | null
          failure_classification?: string | null
          failure_reason?: string | null
          id?: string
          idempotency_key?: string | null
          input_payload?: Json | null
          is_replay?: boolean
          job_type: string
          last_attempt_at?: string | null
          max_attempts?: number
          next_attempt_at?: string | null
          organization_id: string
          output_payload?: Json | null
          priority?: number
          provider: string
          replay_source_id?: string | null
          source_event_log_id?: string | null
          status?: string
          succeeded_at?: string | null
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          client_id?: string
          correlation_id?: string | null
          created_at?: string
          direction?: string | null
          failed_at?: string | null
          failure_classification?: string | null
          failure_reason?: string | null
          id?: string
          idempotency_key?: string | null
          input_payload?: Json | null
          is_replay?: boolean
          job_type?: string
          last_attempt_at?: string | null
          max_attempts?: number
          next_attempt_at?: string | null
          organization_id?: string
          output_payload?: Json | null
          priority?: number
          provider?: string
          replay_source_id?: string | null
          source_event_log_id?: string | null
          status?: string
          succeeded_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_connect_sync_jobs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "legal_connect_sync_jobs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_sync_jobs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "legal_connect_sync_jobs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_sync_jobs_replay_source_id_fkey"
            columns: ["replay_source_id"]
            isOneToOne: false
            referencedRelation: "legal_connect_sync_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_sync_jobs_source_event_log_id_fkey"
            columns: ["source_event_log_id"]
            isOneToOne: false
            referencedRelation: "legal_connect_event_log"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_connect_tasks: {
        Row: {
          assigned_to: string | null
          client_id: string
          created_at: string
          description: string | null
          due_at: string | null
          id: string
          metadata: Json | null
          organization_id: string
          related_contact_id: string | null
          related_matter_id: string | null
          source_provider: string | null
          source_updated_at: string | null
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          client_id: string
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          metadata?: Json | null
          organization_id: string
          related_contact_id?: string | null
          related_matter_id?: string | null
          source_provider?: string | null
          source_updated_at?: string | null
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          client_id?: string
          created_at?: string
          description?: string | null
          due_at?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string
          related_contact_id?: string | null
          related_matter_id?: string | null
          source_provider?: string | null
          source_updated_at?: string | null
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_connect_tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "legal_connect_tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "legal_connect_tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_tasks_related_contact_id_fkey"
            columns: ["related_contact_id"]
            isOneToOne: false
            referencedRelation: "legal_connect_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_tasks_related_matter_id_fkey"
            columns: ["related_matter_id"]
            isOneToOne: false
            referencedRelation: "legal_connect_matters"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_connect_tenant_configs: {
        Row: {
          ai_preferences: Json
          billing_config: Json
          client_id: string
          created_at: string
          feature_flags: Json
          id: string
          onboarding_status: string
          organization_id: string
          outage_mode: boolean
          provider_overrides: Json
          sandbox_mode: boolean
          updated_at: string
        }
        Insert: {
          ai_preferences?: Json
          billing_config?: Json
          client_id: string
          created_at?: string
          feature_flags?: Json
          id?: string
          onboarding_status?: string
          organization_id: string
          outage_mode?: boolean
          provider_overrides?: Json
          sandbox_mode?: boolean
          updated_at?: string
        }
        Update: {
          ai_preferences?: Json
          billing_config?: Json
          client_id?: string
          created_at?: string
          feature_flags?: Json
          id?: string
          onboarding_status?: string
          organization_id?: string
          outage_mode?: boolean
          provider_overrides?: Json
          sandbox_mode?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_connect_tenant_configs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "legal_connect_tenant_configs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_tenant_configs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "legal_connect_tenant_configs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_connect_test_plans: {
        Row: {
          campaign_types: string[] | null
          client_id: string
          created_at: string
          generated_by: string
          id: string
          organization_id: string
          plan_name: string
          provider: string | null
          status: string
          test_cases: Json
        }
        Insert: {
          campaign_types?: string[] | null
          client_id: string
          created_at?: string
          generated_by?: string
          id?: string
          organization_id: string
          plan_name: string
          provider?: string | null
          status?: string
          test_cases?: Json
        }
        Update: {
          campaign_types?: string[] | null
          client_id?: string
          created_at?: string
          generated_by?: string
          id?: string
          organization_id?: string
          plan_name?: string
          provider?: string | null
          status?: string
          test_cases?: Json
        }
        Relationships: [
          {
            foreignKeyName: "legal_connect_test_plans_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "legal_connect_test_plans_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_test_plans_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "legal_connect_test_plans_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_connect_test_runs: {
        Row: {
          actual_output: Json | null
          client_id: string
          correlation_id: string | null
          created_at: string
          duration_ms: number | null
          error_message: string | null
          expected_output: Json | null
          id: string
          organization_id: string
          status: string
          test_category: string
          test_config: Json
          test_type: string
        }
        Insert: {
          actual_output?: Json | null
          client_id: string
          correlation_id?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          expected_output?: Json | null
          id?: string
          organization_id: string
          status?: string
          test_category: string
          test_config?: Json
          test_type: string
        }
        Update: {
          actual_output?: Json | null
          client_id?: string
          correlation_id?: string | null
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          expected_output?: Json | null
          id?: string
          organization_id?: string
          status?: string
          test_category?: string
          test_config?: Json
          test_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "legal_connect_test_runs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "legal_connect_test_runs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_test_runs_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "legal_connect_test_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_connect_webhook_failures: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          ip_address: string | null
          organization_id: string | null
          payload_excerpt: string | null
          reason: string
          signature_present: boolean
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          ip_address?: string | null
          organization_id?: string | null
          payload_excerpt?: string | null
          reason: string
          signature_present?: boolean
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          ip_address?: string | null
          organization_id?: string | null
          payload_excerpt?: string | null
          reason?: string
          signature_present?: boolean
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_connect_webhook_failures_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_connect_webhook_renewal_log: {
        Row: {
          action: string
          client_id: string
          created_at: string
          error_message: string | null
          id: string
          new_expires_at: string | null
          organization_id: string
          previous_expires_at: string | null
          subscription_id: string
          success: boolean
        }
        Insert: {
          action: string
          client_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          new_expires_at?: string | null
          organization_id: string
          previous_expires_at?: string | null
          subscription_id: string
          success?: boolean
        }
        Update: {
          action?: string
          client_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          new_expires_at?: string | null
          organization_id?: string
          previous_expires_at?: string | null
          subscription_id?: string
          success?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "legal_connect_webhook_renewal_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "legal_connect_webhook_renewal_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_webhook_renewal_log_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "legal_connect_webhook_renewal_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_webhook_renewal_log_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "legal_connect_webhook_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      legal_connect_webhook_subscriptions: {
        Row: {
          callback_url: string | null
          client_id: string
          connection_id: string | null
          created_at: string
          disabled_reason: string | null
          events: string[] | null
          expires_at: string | null
          failure_count: number
          health_status: string
          id: string
          last_delivery_at: string | null
          last_failure_at: string | null
          metadata: Json | null
          model_name: string | null
          organization_id: string
          provider: string
          remote_webhook_id: string | null
          renew_after: string | null
          secret_reference: string | null
          status: string
          subscribed_at: string | null
          updated_at: string
          verification_status: string | null
        }
        Insert: {
          callback_url?: string | null
          client_id: string
          connection_id?: string | null
          created_at?: string
          disabled_reason?: string | null
          events?: string[] | null
          expires_at?: string | null
          failure_count?: number
          health_status?: string
          id?: string
          last_delivery_at?: string | null
          last_failure_at?: string | null
          metadata?: Json | null
          model_name?: string | null
          organization_id: string
          provider: string
          remote_webhook_id?: string | null
          renew_after?: string | null
          secret_reference?: string | null
          status?: string
          subscribed_at?: string | null
          updated_at?: string
          verification_status?: string | null
        }
        Update: {
          callback_url?: string | null
          client_id?: string
          connection_id?: string | null
          created_at?: string
          disabled_reason?: string | null
          events?: string[] | null
          expires_at?: string | null
          failure_count?: number
          health_status?: string
          id?: string
          last_delivery_at?: string | null
          last_failure_at?: string | null
          metadata?: Json | null
          model_name?: string | null
          organization_id?: string
          provider?: string
          remote_webhook_id?: string | null
          renew_after?: string | null
          secret_reference?: string | null
          status?: string
          subscribed_at?: string | null
          updated_at?: string
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_connect_webhook_subscriptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "legal_connect_webhook_subscriptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_webhook_subscriptions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "legal_connect_webhook_subscriptions_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "legal_connect_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_webhook_subscriptions_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "legal_connect_connections_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_webhook_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      mycase_mappings: {
        Row: {
          case_id: string | null
          contact_id: string | null
          created_at: string
          id: string
          organization_id: string
          phone: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          case_id?: string | null
          contact_id?: string | null
          created_at?: string
          id?: string
          organization_id: string
          phone: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          case_id?: string | null
          contact_id?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          phone?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mycase_mappings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mycase_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "mycase_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mycase_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
        ]
      }
      notifications: {
        Row: {
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          id: string
          payload: Json
          recipient: string
          response: Json | null
          status: Database["public"]["Enums"]["notification_status"]
          tenant_id: string
          trigger_event: string
        }
        Insert: {
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          id?: string
          payload?: Json
          recipient: string
          response?: Json | null
          status?: Database["public"]["Enums"]["notification_status"]
          tenant_id: string
          trigger_event: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          id?: string
          payload?: Json
          recipient?: string
          response?: Json | null
          status?: Database["public"]["Enums"]["notification_status"]
          tenant_id?: string
          trigger_event?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
        ]
      }
      oauth_tokens: {
        Row: {
          access_token_encrypted: string | null
          created_at: string
          expires_at: string | null
          id: string
          organization_id: string
          provider: string
          refresh_token_encrypted: string | null
          scopes: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          access_token_encrypted?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          organization_id: string
          provider?: string
          refresh_token_encrypted?: string | null
          scopes?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          access_token_encrypted?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          organization_id?: string
          provider?: string
          refresh_token_encrypted?: string | null
          scopes?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "oauth_tokens_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oauth_tokens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "oauth_tokens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oauth_tokens_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
        ]
      }
      organization_members: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          billing_email: string | null
          brand_from_email: string | null
          brand_logo_url: string | null
          brand_name: string | null
          brand_primary_color: string | null
          brand_reply_to: string | null
          created_at: string
          five9_ownership_mode: Database["public"]["Enums"]["five9_ownership_mode"]
          id: string
          integration_configs: Json | null
          name: string
          plan: Database["public"]["Enums"]["org_plan"]
          status: Database["public"]["Enums"]["org_status"]
          updated_at: string
        }
        Insert: {
          billing_email?: string | null
          brand_from_email?: string | null
          brand_logo_url?: string | null
          brand_name?: string | null
          brand_primary_color?: string | null
          brand_reply_to?: string | null
          created_at?: string
          five9_ownership_mode?: Database["public"]["Enums"]["five9_ownership_mode"]
          id?: string
          integration_configs?: Json | null
          name: string
          plan?: Database["public"]["Enums"]["org_plan"]
          status?: Database["public"]["Enums"]["org_status"]
          updated_at?: string
        }
        Update: {
          billing_email?: string | null
          brand_from_email?: string | null
          brand_logo_url?: string | null
          brand_name?: string | null
          brand_primary_color?: string | null
          brand_reply_to?: string | null
          created_at?: string
          five9_ownership_mode?: Database["public"]["Enums"]["five9_ownership_mode"]
          id?: string
          integration_configs?: Json | null
          name?: string
          plan?: Database["public"]["Enums"]["org_plan"]
          status?: Database["public"]["Enums"]["org_status"]
          updated_at?: string
        }
        Relationships: []
      }
      partners: {
        Row: {
          billing_currency: string | null
          billing_default_rate_per_minute: number | null
          created_at: string
          id: string
          integration_configs: Json | null
          name: string
          organization_id: string
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          billing_currency?: string | null
          billing_default_rate_per_minute?: number | null
          created_at?: string
          id?: string
          integration_configs?: Json | null
          name: string
          organization_id: string
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          billing_currency?: string | null
          billing_default_rate_per_minute?: number | null
          created_at?: string
          id?: string
          integration_configs?: Json | null
          name?: string
          organization_id?: string
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partners_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_goals: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string | null
          id: string
          metric: string
          name: string
          organization_id: string
          partner_id: string | null
          start_date: string | null
          status: string
          target_value: number
          tenant_id: string | null
          timeframe: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          metric: string
          name: string
          organization_id: string
          partner_id?: string | null
          start_date?: string | null
          status?: string
          target_value: number
          tenant_id?: string | null
          timeframe?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string | null
          id?: string
          metric?: string
          name?: string
          organization_id?: string
          partner_id?: string | null
          start_date?: string | null
          status?: string
          target_value?: number
          tenant_id?: string | null
          timeframe?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_goals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_goals_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_events: {
        Row: {
          correlation_id: string | null
          created_at: string
          event_type: string
          id: string
          organization_id: string
          payload: Json
          source: string | null
        }
        Insert: {
          correlation_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          organization_id: string
          payload?: Json
          source?: string | null
        }
        Update: {
          correlation_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          organization_id?: string
          payload?: Json
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      post_call_automations: {
        Row: {
          action_type: string
          config: Json
          created_at: string
          disposition_match: string
          enabled: boolean
          id: string
          name: string
          organization_id: string
          script_id: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          action_type: string
          config?: Json
          created_at?: string
          disposition_match: string
          enabled?: boolean
          id?: string
          name?: string
          organization_id: string
          script_id?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          action_type?: string
          config?: Json
          created_at?: string
          disposition_match?: string
          enabled?: boolean
          id?: string
          name?: string
          organization_id?: string
          script_id?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_call_automations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_call_automations_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_call_automations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "post_call_automations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_call_automations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          display_name: string | null
          email: string | null
          id: string
          onboarding_completed: Json | null
          phone: string | null
          timezone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          display_name?: string | null
          email?: string | null
          id: string
          onboarding_completed?: Json | null
          phone?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          onboarding_completed?: Json | null
          phone?: string | null
          timezone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      qa_reviews: {
        Row: {
          agent_id: string | null
          created_at: string
          id: string
          notes: string | null
          organization_id: string
          reviewer_id: string | null
          scores: Json | null
          script_session_id: string | null
          status: string
          total_score: number | null
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          organization_id: string
          reviewer_id?: string | null
          scores?: Json | null
          script_session_id?: string | null
          status?: string
          total_score?: number | null
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          organization_id?: string
          reviewer_id?: string | null
          scores?: Json | null
          script_session_id?: string | null
          status?: string
          total_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "qa_reviews_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qa_reviews_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "fabric59_agents_identity"
            referencedColumns: ["fabric59_agent_id"]
          },
          {
            foreignKeyName: "qa_reviews_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qa_reviews_script_session_id_fkey"
            columns: ["script_session_id"]
            isOneToOne: false
            referencedRelation: "script_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_did_mappings: {
        Row: {
          created_at: string
          did: string
          id: string
          is_active: boolean
          label: string | null
          organization_id: string
          routing_config_id: string | null
          source_channel: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          did: string
          id?: string
          is_active?: boolean
          label?: string | null
          organization_id: string
          routing_config_id?: string | null
          source_channel?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          did?: string
          id?: string
          is_active?: boolean
          label?: string | null
          organization_id?: string
          routing_config_id?: string | null
          source_channel?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "qr_did_mappings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_did_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "qr_did_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_did_mappings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
        ]
      }
      report_templates: {
        Row: {
          created_at: string
          created_by: string | null
          field_config: Json
          filter_config: Json
          id: string
          name: string
          organization_id: string
          report_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          field_config?: Json
          filter_config?: Json
          id?: string
          name: string
          organization_id: string
          report_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          field_config?: Json
          filter_config?: Json
          id?: string
          name?: string
          organization_id?: string
          report_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      report_uploads: {
        Row: {
          created_at: string
          exclusions_applied: string[] | null
          file_size_bytes: number | null
          file_type: string
          five9_domain_id: string | null
          id: string
          organization_id: string
          original_filename: string
          parsed_summary: Json | null
          partner_id: string | null
          row_count: number | null
          tenant_id: string | null
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          exclusions_applied?: string[] | null
          file_size_bytes?: number | null
          file_type?: string
          five9_domain_id?: string | null
          id?: string
          organization_id: string
          original_filename: string
          parsed_summary?: Json | null
          partner_id?: string | null
          row_count?: number | null
          tenant_id?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          exclusions_applied?: string[] | null
          file_size_bytes?: number | null
          file_type?: string
          five9_domain_id?: string | null
          id?: string
          organization_id?: string
          original_filename?: string
          parsed_summary?: Json | null
          partner_id?: string | null
          row_count?: number | null
          tenant_id?: string | null
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "report_uploads_five9_domain_id_fkey"
            columns: ["five9_domain_id"]
            isOneToOne: false
            referencedRelation: "five9_domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_uploads_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_uploads_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_uploads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "report_uploads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_uploads_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "report_uploads_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_jobs: {
        Row: {
          agent_id: string
          cancelled_at: string | null
          cancelled_by: string | null
          config: Json | null
          created_at: string
          error_message: string | null
          id: string
          initiated_by: string | null
          job_type: string
          result: Json | null
          scheduled_for: string
          status: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          cancelled_at?: string | null
          cancelled_by?: string | null
          config?: Json | null
          created_at?: string
          error_message?: string | null
          id?: string
          initiated_by?: string | null
          job_type: string
          result?: Json | null
          scheduled_for: string
          status?: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          cancelled_at?: string | null
          cancelled_by?: string | null
          config?: Json | null
          created_at?: string
          error_message?: string | null
          id?: string
          initiated_by?: string | null
          job_type?: string
          result?: Json | null
          scheduled_for?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_jobs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_jobs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "fabric59_agents_identity"
            referencedColumns: ["fabric59_agent_id"]
          },
        ]
      }
      scheduled_reports: {
        Row: {
          created_at: string
          created_by: string | null
          date_range_type: string
          export_format: string
          filters: Json
          five9_report_id: string | null
          frequency: string
          id: string
          last_run_at: string | null
          organization_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date_range_type?: string
          export_format?: string
          filters?: Json
          five9_report_id?: string | null
          frequency?: string
          id?: string
          last_run_at?: string | null
          organization_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date_range_type?: string
          export_format?: string
          filters?: Json
          five9_report_id?: string | null
          frequency?: string
          id?: string
          last_run_at?: string | null
          organization_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      script_node_links: {
        Row: {
          created_at: string
          id: string
          label: string | null
          node_id: string
          script_id: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          node_id: string
          script_id: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          node_id?: string
          script_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "script_node_links_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      script_sessions: {
        Row: {
          agent_id: string | null
          disposition: string | null
          duration_seconds: number | null
          ended_at: string | null
          five9_call_id: string | null
          id: string
          metadata: Json | null
          organization_id: string
          post_call_status: string
          script_id: string | null
          started_at: string
          tenant_id: string | null
          variables: Json | null
        }
        Insert: {
          agent_id?: string | null
          disposition?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          five9_call_id?: string | null
          id?: string
          metadata?: Json | null
          organization_id: string
          post_call_status?: string
          script_id?: string | null
          started_at?: string
          tenant_id?: string | null
          variables?: Json | null
        }
        Update: {
          agent_id?: string | null
          disposition?: string | null
          duration_seconds?: number | null
          ended_at?: string | null
          five9_call_id?: string | null
          id?: string
          metadata?: Json | null
          organization_id?: string
          post_call_status?: string
          script_id?: string | null
          started_at?: string
          tenant_id?: string | null
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "script_sessions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "script_sessions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "fabric59_agents_identity"
            referencedColumns: ["fabric59_agent_id"]
          },
          {
            foreignKeyName: "script_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "script_sessions_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "script_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "script_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "script_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
        ]
      }
      script_templates: {
        Row: {
          category: string
          content: Json
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_built_in: boolean
          name: string
          organization_id: string
          tenant_id: string | null
        }
        Insert: {
          category?: string
          content?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_built_in?: boolean
          name: string
          organization_id: string
          tenant_id?: string | null
        }
        Update: {
          category?: string
          content?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_built_in?: boolean
          name?: string
          organization_id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "script_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "script_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "script_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "script_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
        ]
      }
      script_versions: {
        Row: {
          content: Json
          created_at: string
          created_by: string | null
          id: string
          script_id: string
          version: number
        }
        Insert: {
          content?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          script_id: string
          version?: number
        }
        Update: {
          content?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          script_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "script_versions_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      scripts: {
        Row: {
          created_at: string
          created_by: string | null
          definition: Json
          description: string | null
          dnis: string | null
          id: string
          is_live: boolean
          is_template: boolean
          name: string
          organization_id: string
          partner_id: string | null
          status: string
          tenant_id: string | null
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          definition?: Json
          description?: string | null
          dnis?: string | null
          id?: string
          is_live?: boolean
          is_template?: boolean
          name: string
          organization_id: string
          partner_id?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          definition?: Json
          description?: string | null
          dnis?: string | null
          id?: string
          is_live?: boolean
          is_template?: boolean
          name?: string
          organization_id?: string
          partner_id?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "scripts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scripts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scripts_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scripts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "scripts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scripts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          organization_id: string
          priority: string
          script_session_id: string | null
          status: string
          tenant_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          organization_id: string
          priority?: string
          script_session_id?: string | null
          status?: string
          tenant_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          organization_id?: string
          priority?: string
          script_session_id?: string | null
          status?: string
          tenant_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_script_session_id_fkey"
            columns: ["script_session_id"]
            isOneToOne: false
            referencedRelation: "script_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
        ]
      }
      template_versions: {
        Row: {
          content: Json
          created_at: string
          created_by: string | null
          id: string
          is_current: boolean
          template_id: string
          version: number
        }
        Insert: {
          content?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          is_current?: boolean
          template_id: string
          version: number
        }
        Update: {
          content?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          is_current?: boolean
          template_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "template_versions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      templates: {
        Row: {
          content: Json
          created_at: string
          created_by: string | null
          current_version: number
          description: string | null
          id: string
          kind: Database["public"]["Enums"]["template_kind"]
          metadata: Json
          name: string
          organization_id: string | null
          parent_template_id: string | null
          scope_id: string | null
          scope_type: Database["public"]["Enums"]["template_scope"]
          source_id: string | null
          source_type: string | null
          status: Database["public"]["Enums"]["template_status"]
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          created_by?: string | null
          current_version?: number
          description?: string | null
          id?: string
          kind: Database["public"]["Enums"]["template_kind"]
          metadata?: Json
          name: string
          organization_id?: string | null
          parent_template_id?: string | null
          scope_id?: string | null
          scope_type: Database["public"]["Enums"]["template_scope"]
          source_id?: string | null
          source_type?: string | null
          status?: Database["public"]["Enums"]["template_status"]
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          created_by?: string | null
          current_version?: number
          description?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["template_kind"]
          metadata?: Json
          name?: string
          organization_id?: string | null
          parent_template_id?: string | null
          scope_id?: string | null
          scope_type?: Database["public"]["Enums"]["template_scope"]
          source_id?: string | null
          source_type?: string | null
          status?: Database["public"]["Enums"]["template_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "templates_parent_template_id_fkey"
            columns: ["parent_template_id"]
            isOneToOne: false
            referencedRelation: "templates"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          asana_api_key: string | null
          billing_rate_per_minute: number | null
          calendly_api_key: string | null
          created_at: string
          crm_api_key: string | null
          crm_api_url: string | null
          crm_type: Database["public"]["Enums"]["crm_type"]
          custom_mappings: Json | null
          design_partner_notes: Json
          docusign_api_key: string | null
          dropbox_api_key: string | null
          five9_campaign_identifier: string | null
          five9_domain_id: string | null
          five9_ownership_mode:
            | Database["public"]["Enums"]["five9_ownership_mode"]
            | null
          google_calendar_id: string | null
          id: string
          integration_configs: Json | null
          is_design_partner: boolean
          legal_connect_go_live_checklist: Json
          legal_connect_pilot_approval: Json
          legal_connect_pilot_block_reason: string | null
          legal_connect_pilot_checklist: Json
          legal_connect_pilot_status: string
          legal_connect_pilot_template: string | null
          legal_connect_pilot_updated_at: string | null
          legal_connect_readiness_state: Database["public"]["Enums"]["legal_connect_readiness"]
          legal_connect_readiness_updated_at: string | null
          legal_connect_rollout_status: Database["public"]["Enums"]["legal_connect_rollout_status"]
          legal_connect_safe_mode: Database["public"]["Enums"]["legal_connect_safe_mode"]
          make_webhook_url: string | null
          max_jobs_per_hour: number
          max_jobs_per_minute: number
          microsoft365_api_key: string | null
          n8n_webhook_url: string | null
          name: string
          notification_triggers: Json | null
          openai_api_key: string | null
          organization_id: string | null
          pabbly_webhook_url: string | null
          partner_id: string | null
          power_automate_webhook_url: string | null
          quickbooks_api_key: string | null
          slack_webhook_url: string | null
          status: string
          stripe_api_key: string | null
          teams_webhook_url: string | null
          twilio_account_sid: string | null
          twilio_auth_token: string | null
          twilio_from_number: string | null
          updated_at: string
          webhook_url: string | null
          workspace_id: string | null
          zapier_webhook_url: string | null
          zoom_api_key: string | null
        }
        Insert: {
          asana_api_key?: string | null
          billing_rate_per_minute?: number | null
          calendly_api_key?: string | null
          created_at?: string
          crm_api_key?: string | null
          crm_api_url?: string | null
          crm_type?: Database["public"]["Enums"]["crm_type"]
          custom_mappings?: Json | null
          design_partner_notes?: Json
          docusign_api_key?: string | null
          dropbox_api_key?: string | null
          five9_campaign_identifier?: string | null
          five9_domain_id?: string | null
          five9_ownership_mode?:
            | Database["public"]["Enums"]["five9_ownership_mode"]
            | null
          google_calendar_id?: string | null
          id?: string
          integration_configs?: Json | null
          is_design_partner?: boolean
          legal_connect_go_live_checklist?: Json
          legal_connect_pilot_approval?: Json
          legal_connect_pilot_block_reason?: string | null
          legal_connect_pilot_checklist?: Json
          legal_connect_pilot_status?: string
          legal_connect_pilot_template?: string | null
          legal_connect_pilot_updated_at?: string | null
          legal_connect_readiness_state?: Database["public"]["Enums"]["legal_connect_readiness"]
          legal_connect_readiness_updated_at?: string | null
          legal_connect_rollout_status?: Database["public"]["Enums"]["legal_connect_rollout_status"]
          legal_connect_safe_mode?: Database["public"]["Enums"]["legal_connect_safe_mode"]
          make_webhook_url?: string | null
          max_jobs_per_hour?: number
          max_jobs_per_minute?: number
          microsoft365_api_key?: string | null
          n8n_webhook_url?: string | null
          name: string
          notification_triggers?: Json | null
          openai_api_key?: string | null
          organization_id?: string | null
          pabbly_webhook_url?: string | null
          partner_id?: string | null
          power_automate_webhook_url?: string | null
          quickbooks_api_key?: string | null
          slack_webhook_url?: string | null
          status?: string
          stripe_api_key?: string | null
          teams_webhook_url?: string | null
          twilio_account_sid?: string | null
          twilio_auth_token?: string | null
          twilio_from_number?: string | null
          updated_at?: string
          webhook_url?: string | null
          workspace_id?: string | null
          zapier_webhook_url?: string | null
          zoom_api_key?: string | null
        }
        Update: {
          asana_api_key?: string | null
          billing_rate_per_minute?: number | null
          calendly_api_key?: string | null
          created_at?: string
          crm_api_key?: string | null
          crm_api_url?: string | null
          crm_type?: Database["public"]["Enums"]["crm_type"]
          custom_mappings?: Json | null
          design_partner_notes?: Json
          docusign_api_key?: string | null
          dropbox_api_key?: string | null
          five9_campaign_identifier?: string | null
          five9_domain_id?: string | null
          five9_ownership_mode?:
            | Database["public"]["Enums"]["five9_ownership_mode"]
            | null
          google_calendar_id?: string | null
          id?: string
          integration_configs?: Json | null
          is_design_partner?: boolean
          legal_connect_go_live_checklist?: Json
          legal_connect_pilot_approval?: Json
          legal_connect_pilot_block_reason?: string | null
          legal_connect_pilot_checklist?: Json
          legal_connect_pilot_status?: string
          legal_connect_pilot_template?: string | null
          legal_connect_pilot_updated_at?: string | null
          legal_connect_readiness_state?: Database["public"]["Enums"]["legal_connect_readiness"]
          legal_connect_readiness_updated_at?: string | null
          legal_connect_rollout_status?: Database["public"]["Enums"]["legal_connect_rollout_status"]
          legal_connect_safe_mode?: Database["public"]["Enums"]["legal_connect_safe_mode"]
          make_webhook_url?: string | null
          max_jobs_per_hour?: number
          max_jobs_per_minute?: number
          microsoft365_api_key?: string | null
          n8n_webhook_url?: string | null
          name?: string
          notification_triggers?: Json | null
          openai_api_key?: string | null
          organization_id?: string | null
          pabbly_webhook_url?: string | null
          partner_id?: string | null
          power_automate_webhook_url?: string | null
          quickbooks_api_key?: string | null
          slack_webhook_url?: string | null
          status?: string
          stripe_api_key?: string | null
          teams_webhook_url?: string | null
          twilio_account_sid?: string | null
          twilio_auth_token?: string | null
          twilio_from_number?: string | null
          updated_at?: string
          webhook_url?: string | null
          workspace_id?: string | null
          zapier_webhook_url?: string | null
          zoom_api_key?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenants_five9_domain_id_fkey"
            columns: ["five9_domain_id"]
            isOneToOne: false
            referencedRelation: "five9_domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenants_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenants_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenants_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      training_lessons: {
        Row: {
          content: string
          created_at: string
          duration_minutes: number | null
          id: string
          module_id: string
          sort_order: number
          title: string
        }
        Insert: {
          content?: string
          created_at?: string
          duration_minutes?: number | null
          id?: string
          module_id: string
          sort_order?: number
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          duration_minutes?: number | null
          id?: string
          module_id?: string
          sort_order?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "training_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      training_modules: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          organization_id: string
          sort_order: number
          status: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          organization_id: string
          sort_order?: number
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          sort_order?: number
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_modules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_modules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "training_modules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_modules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
        ]
      }
      training_progress: {
        Row: {
          completed_at: string | null
          id: string
          lesson_id: string
          module_id: string
          score: number | null
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          id?: string
          lesson_id: string
          module_id: string
          score?: number | null
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          id?: string
          lesson_id?: string
          module_id?: string
          score?: number | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "training_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_progress_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "training_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      unified_schema: {
        Row: {
          created_at: string
          entity: string
          fields: Json
          id: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          entity: string
          fields?: Json
          id?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          entity?: string
          fields?: Json
          id?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "unified_schema_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "unified_schema_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unified_schema_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          organization_id: string
          permission: string
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          organization_id: string
          permission: string
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
          id?: string
          organization_id?: string
          permission?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vault_exports: {
        Row: {
          bundle_path: string
          created_at: string
          created_by: string | null
          feature_id: string
          id: string
          manifest: Json
          size_bytes: number
          version: string
        }
        Insert: {
          bundle_path: string
          created_at?: string
          created_by?: string | null
          feature_id: string
          id?: string
          manifest?: Json
          size_bytes?: number
          version?: string
        }
        Update: {
          bundle_path?: string
          created_at?: string
          created_by?: string | null
          feature_id?: string
          id?: string
          manifest?: Json
          size_bytes?: number
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "vault_exports_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "vault_features"
            referencedColumns: ["id"]
          },
        ]
      }
      vault_features: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          backend_files: string[]
          created_at: string
          db_objects: string[]
          dependencies: Json
          edge_functions: string[]
          extraction_notes: string | null
          frontend_files: string[]
          id: string
          name: string
          original_routes: string[]
          reason_archived: string | null
          required_secrets: string[]
          restore_notes: string | null
          risks: string | null
          slug: string
          status: Database["public"]["Enums"]["vault_feature_status"]
          summary: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          backend_files?: string[]
          created_at?: string
          db_objects?: string[]
          dependencies?: Json
          edge_functions?: string[]
          extraction_notes?: string | null
          frontend_files?: string[]
          id?: string
          name: string
          original_routes?: string[]
          reason_archived?: string | null
          required_secrets?: string[]
          restore_notes?: string | null
          risks?: string | null
          slug: string
          status?: Database["public"]["Enums"]["vault_feature_status"]
          summary?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          backend_files?: string[]
          created_at?: string
          db_objects?: string[]
          dependencies?: Json
          edge_functions?: string[]
          extraction_notes?: string | null
          frontend_files?: string[]
          id?: string
          name?: string
          original_routes?: string[]
          reason_archived?: string | null
          required_secrets?: string[]
          restore_notes?: string | null
          risks?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["vault_feature_status"]
          summary?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      walkthrough_requests: {
        Row: {
          company: string | null
          created_at: string
          current_crm: string | null
          five9_status: string | null
          id: string
          message: string | null
          name: string
          role: string | null
          source_url: string | null
          status: Database["public"]["Enums"]["walkthrough_request_status"]
          team_size: string | null
          updated_at: string
          user_agent: string | null
          work_email: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          current_crm?: string | null
          five9_status?: string | null
          id?: string
          message?: string | null
          name: string
          role?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["walkthrough_request_status"]
          team_size?: string | null
          updated_at?: string
          user_agent?: string | null
          work_email: string
        }
        Update: {
          company?: string | null
          created_at?: string
          current_crm?: string | null
          five9_status?: string | null
          id?: string
          message?: string | null
          name?: string
          role?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["walkthrough_request_status"]
          team_size?: string | null
          updated_at?: string
          user_agent?: string | null
          work_email?: string
        }
        Relationships: []
      }
      web_callbacks: {
        Row: {
          call_disposition: string | null
          call_duration_seconds: number | null
          callback_time: string | null
          callback_type: string
          contact_email: string | null
          contact_name: string | null
          contact_phone: string
          created_at: string
          error_message: string | null
          five9_call_id: string | null
          five9_domain_id: string | null
          id: string
          mode: string
          organization_id: string
          priority: string
          queue: string
          reason: string
          recording_url: string | null
          source_channel: string | null
          source_url: string | null
          status: string
          tenant_id: string | null
          updated_at: string
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          call_disposition?: string | null
          call_duration_seconds?: number | null
          callback_time?: string | null
          callback_type?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone: string
          created_at?: string
          error_message?: string | null
          five9_call_id?: string | null
          five9_domain_id?: string | null
          id?: string
          mode?: string
          organization_id: string
          priority?: string
          queue?: string
          reason?: string
          recording_url?: string | null
          source_channel?: string | null
          source_url?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          call_disposition?: string | null
          call_duration_seconds?: number | null
          callback_time?: string | null
          callback_type?: string
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string
          created_at?: string
          error_message?: string | null
          five9_call_id?: string | null
          five9_domain_id?: string | null
          id?: string
          mode?: string
          organization_id?: string
          priority?: string
          queue?: string
          reason?: string
          recording_url?: string | null
          source_channel?: string | null
          source_url?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "web_callbacks_five9_domain_id_fkey"
            columns: ["five9_domain_id"]
            isOneToOne: false
            referencedRelation: "five9_domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "web_callbacks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "web_callbacks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "web_callbacks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
        ]
      }
      worksheet_field_definitions: {
        Row: {
          campaign_id: string | null
          category: string | null
          client_id: string
          created_at: string
          description: string | null
          field_key: string
          field_type: string
          id: string
          is_active: boolean
          label: string
          options: Json | null
          organization_id: string
          position: number
          required: boolean
          updated_at: string
        }
        Insert: {
          campaign_id?: string | null
          category?: string | null
          client_id: string
          created_at?: string
          description?: string | null
          field_key: string
          field_type?: string
          id?: string
          is_active?: boolean
          label: string
          options?: Json | null
          organization_id: string
          position?: number
          required?: boolean
          updated_at?: string
        }
        Update: {
          campaign_id?: string | null
          category?: string | null
          client_id?: string
          created_at?: string
          description?: string | null
          field_key?: string
          field_type?: string
          id?: string
          is_active?: boolean
          label?: string
          options?: Json | null
          organization_id?: string
          position?: number
          required?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "worksheet_field_definitions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "legal_connect_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worksheet_field_definitions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "worksheet_field_definitions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worksheet_field_definitions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "worksheet_field_definitions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      worksheet_responses: {
        Row: {
          call_session_id: string | null
          campaign_id: string | null
          captured_by: string | null
          captured_phase: string
          client_id: string
          correlation_id: string | null
          created_at: string
          id: string
          is_complete: boolean
          organization_id: string
          responses: Json
          updated_at: string
        }
        Insert: {
          call_session_id?: string | null
          campaign_id?: string | null
          captured_by?: string | null
          captured_phase?: string
          client_id: string
          correlation_id?: string | null
          created_at?: string
          id?: string
          is_complete?: boolean
          organization_id: string
          responses?: Json
          updated_at?: string
        }
        Update: {
          call_session_id?: string | null
          campaign_id?: string | null
          captured_by?: string | null
          captured_phase?: string
          client_id?: string
          correlation_id?: string | null
          created_at?: string
          id?: string
          is_complete?: boolean
          organization_id?: string
          responses?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "worksheet_responses_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "legal_connect_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worksheet_responses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "worksheet_responses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worksheet_responses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "worksheet_responses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_ai_configs: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          industry: string | null
          jurisdiction: string | null
          knowledge_only: boolean
          source_preference: string
          terminology: Json
          tone: string
          updated_at: string
          updated_by: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          industry?: string | null
          jurisdiction?: string | null
          knowledge_only?: boolean
          source_preference?: string
          terminology?: Json
          tone?: string
          updated_at?: string
          updated_by?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          industry?: string | null
          jurisdiction?: string | null
          knowledge_only?: boolean
          source_preference?: string
          terminology?: Json
          tone?: string
          updated_at?: string
          updated_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_ai_configs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_ai_conversations: {
        Row: {
          created_at: string
          id: string
          started_by: string | null
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          started_by?: string | null
          title?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          started_by?: string | null
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_ai_conversations_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_ai_logs: {
        Row: {
          action: string
          created_at: string
          details: Json
          id: string
          surface: string
          user_id: string | null
          workspace_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json
          id?: string
          surface: string
          user_id?: string | null
          workspace_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json
          id?: string
          surface?: string
          user_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_ai_logs_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          created_by: string | null
          grounding: Json
          id: string
          role: string
          workspace_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          created_by?: string | null
          grounding?: Json
          id?: string
          role: string
          workspace_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          created_by?: string | null
          grounding?: Json
          id?: string
          role?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "workspace_ai_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_ai_messages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_knowledge_sources: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          item_count: number
          last_indexed_at: string | null
          notes: string | null
          source_type: string
          status: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          item_count?: number
          last_indexed_at?: string | null
          notes?: string | null
          source_type: string
          status?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          item_count?: number
          last_indexed_at?: string | null
          notes?: string | null
          source_type?: string
          status?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_knowledge_sources_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          name: string
          organization_id: string
          slug: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          name: string
          organization_id: string
          slug?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          name?: string
          organization_id?: string
          slug?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      fabric59_agent_activity_summary: {
        Row: {
          agent_name: string | null
          external_agent_id: string | null
          five9_domain_id: string | null
          org_id: string | null
          period_start: string | null
          total_calls: number | null
          total_duration_seconds: number | null
          total_hold_seconds: number | null
          total_talk_seconds: number | null
          total_wrap_seconds: number | null
        }
        Relationships: []
      }
      fabric59_agents_identity: {
        Row: {
          deprovisioned_at: string | null
          email: string | null
          extension: string | null
          fabric59_agent_id: string | null
          first_name: string | null
          five9_user_id: string | null
          five9_username: string | null
          google_user_id: string | null
          last_name: string | null
          provisioned_at: string | null
          role: string | null
          slack_user_id: string | null
          status: string | null
        }
        Insert: {
          deprovisioned_at?: string | null
          email?: string | null
          extension?: string | null
          fabric59_agent_id?: string | null
          first_name?: string | null
          five9_user_id?: string | null
          five9_username?: string | null
          google_user_id?: string | null
          last_name?: string | null
          provisioned_at?: string | null
          role?: string | null
          slack_user_id?: string | null
          status?: string | null
        }
        Update: {
          deprovisioned_at?: string | null
          email?: string | null
          extension?: string | null
          fabric59_agent_id?: string | null
          first_name?: string | null
          five9_user_id?: string | null
          five9_username?: string | null
          google_user_id?: string | null
          last_name?: string | null
          provisioned_at?: string | null
          role?: string | null
          slack_user_id?: string | null
          status?: string | null
        }
        Relationships: []
      }
      fabric59_call_usage_summary: {
        Row: {
          campaign: string | null
          disposition: string | null
          five9_domain_id: string | null
          org_id: string | null
          period_start: string | null
          skill: string | null
          total_calls: number | null
          total_seconds: number | null
        }
        Relationships: []
      }
      fabric59_crm_push_leads: {
        Row: {
          contact_company: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string | null
          crm_action: string | null
          crm_type: Database["public"]["Enums"]["crm_type"] | null
          log_id: string | null
          org_id: string | null
          response: Json | null
          status: string | null
          tenant_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "api_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "api_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "api_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "tenants_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      fabric59_customers_identity: {
        Row: {
          client_name: string | null
          created_at: string | null
          crm_api_url: string | null
          crm_type: Database["public"]["Enums"]["crm_type"] | null
          fabric59_client_id: string | null
          five9_domain_id: string | null
          has_quickbooks: boolean | null
          has_stripe: boolean | null
          integration_configs: Json | null
          org_id: string | null
          status: string | null
        }
        Insert: {
          client_name?: string | null
          created_at?: string | null
          crm_api_url?: string | null
          crm_type?: Database["public"]["Enums"]["crm_type"] | null
          fabric59_client_id?: string | null
          five9_domain_id?: string | null
          has_quickbooks?: never
          has_stripe?: never
          integration_configs?: Json | null
          org_id?: string | null
          status?: string | null
        }
        Update: {
          client_name?: string | null
          created_at?: string | null
          crm_api_url?: string | null
          crm_type?: Database["public"]["Enums"]["crm_type"] | null
          fabric59_client_id?: string | null
          five9_domain_id?: string | null
          has_quickbooks?: never
          has_stripe?: never
          integration_configs?: Json | null
          org_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenants_five9_domain_id_fkey"
            columns: ["five9_domain_id"]
            isOneToOne: false
            referencedRelation: "five9_domains"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenants_organization_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      fabric59_lifecycle_audit: {
        Row: {
          action: string | null
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string | null
          ip_address: string | null
          performed_by: string | null
        }
        Insert: {
          action?: string | null
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string | null
          ip_address?: string | null
          performed_by?: string | null
        }
        Update: {
          action?: string | null
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string | null
          ip_address?: string | null
          performed_by?: string | null
        }
        Relationships: []
      }
      legal_connect_audit_overview: {
        Row: {
          action: string | null
          actor_email: string | null
          actor_name: string | null
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string | null
          organization_id: string | null
          source: string | null
          tenant_id: string | null
          tenant_name: string | null
          user_id: string | null
        }
        Relationships: []
      }
      legal_connect_connections_safe: {
        Row: {
          access_token_expires_at: string | null
          auth_type: string | null
          base_url: string | null
          client_id: string | null
          connection_name: string | null
          created_at: string | null
          deauth_callback_enabled: boolean | null
          has_access_token: boolean | null
          has_refresh_token: boolean | null
          id: string | null
          is_sandbox: boolean | null
          last_connected_at: string | null
          last_error_at: string | null
          last_error_message: string | null
          last_refreshed_at: string | null
          metadata: Json | null
          organization_id: string | null
          provider: string | null
          provider_account_id: string | null
          provider_region: string | null
          refresh_token_expires_at: string | null
          scopes: Json | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          access_token_expires_at?: string | null
          auth_type?: string | null
          base_url?: string | null
          client_id?: string | null
          connection_name?: string | null
          created_at?: string | null
          deauth_callback_enabled?: boolean | null
          has_access_token?: never
          has_refresh_token?: never
          id?: string | null
          is_sandbox?: boolean | null
          last_connected_at?: string | null
          last_error_at?: string | null
          last_error_message?: string | null
          last_refreshed_at?: string | null
          metadata?: Json | null
          organization_id?: string | null
          provider?: string | null
          provider_account_id?: string | null
          provider_region?: string | null
          refresh_token_expires_at?: string | null
          scopes?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token_expires_at?: string | null
          auth_type?: string | null
          base_url?: string | null
          client_id?: string | null
          connection_name?: string | null
          created_at?: string | null
          deauth_callback_enabled?: boolean | null
          has_access_token?: never
          has_refresh_token?: never
          id?: string | null
          is_sandbox?: boolean | null
          last_connected_at?: string | null
          last_error_at?: string | null
          last_error_message?: string | null
          last_refreshed_at?: string | null
          metadata?: Json | null
          organization_id?: string | null
          provider?: string | null
          provider_account_id?: string | null
          provider_region?: string | null
          refresh_token_expires_at?: string | null
          scopes?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_connect_connections_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "legal_connect_connections_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "legal_connect_connections_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "legal_connect_connections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      v_campaign_readiness: {
        Row: {
          campaign_name: string | null
          client_id: string | null
          disposition_count: number | null
          domain_connected: boolean | null
          five9_domain: string | null
          organization_id: string | null
          provider_connected: boolean | null
          provider_target: string | null
          required_variable_count: number | null
          route_id: string | null
          status: string | null
          successful_event_count: number | null
          variable_count: number | null
          variable_group_assigned: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "five9_campaign_routes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fabric59_customers_identity"
            referencedColumns: ["fabric59_client_id"]
          },
          {
            foreignKeyName: "five9_campaign_routes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "five9_campaign_routes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "v_client_readiness"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "five9_campaign_routes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      v_client_readiness: {
        Row: {
          campaign_exists: boolean | null
          client_id: string | null
          dispositions_configured: boolean | null
          domain_connected: boolean | null
          organization_id: string | null
          provider_connected: boolean | null
          ready_route_count: number | null
          route_count: number | null
          status: string | null
          variable_group_exists: boolean | null
        }
        Insert: {
          campaign_exists?: never
          client_id?: string | null
          dispositions_configured?: never
          domain_connected?: never
          organization_id?: string | null
          provider_connected?: never
          ready_route_count?: never
          route_count?: never
          status?: never
          variable_group_exists?: never
        }
        Update: {
          campaign_exists?: never
          client_id?: string | null
          dispositions_configured?: never
          domain_connected?: never
          organization_id?: string | null
          provider_connected?: never
          ready_route_count?: never
          route_count?: never
          status?: never
          variable_group_exists?: never
        }
        Relationships: [
          {
            foreignKeyName: "tenants_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_rls_policy_snapshot: {
        Args: { _tables: string[] }
        Returns: {
          cmd: string
          policyname: string
          qual: string
          roles: string[]
          schemaname: string
          tablename: string
          with_check: string
        }[]
      }
      get_user_org_ids: { Args: { _user_id: string }; Returns: string[] }
      get_user_workspace_ids: { Args: { _user_id: string }; Returns: string[] }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_master_admin: { Args: { _user_id: string }; Returns: boolean }
      is_ops_member: { Args: { _user_id: string }; Returns: boolean }
      is_org_member: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_org_owner_or_admin: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_workspace_member: {
        Args: { _user_id: string; _workspace_id: string }
        Returns: boolean
      }
      legal_connect_cleanup_retention: {
        Args: { _org_id?: string }
        Returns: Json
      }
      map_legacy_campaign_status: {
        Args: { _legacy: string }
        Returns: Database["public"]["Enums"]["campaign_status"]
      }
      map_legacy_script_status: {
        Args: { _legacy: string }
        Returns: Database["public"]["Enums"]["guide_status"]
      }
      preview_workspace_demo_data: {
        Args: { _workspace_id: string }
        Returns: Json
      }
      user_has_permission: {
        Args: { _org_id: string; _permission: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "master_admin" | "admin" | "ops_team" | "viewer"
      campaign_status: "draft" | "ready" | "live" | "paused" | "archived"
      crm_type:
        | "clio"
        | "workiz"
        | "salesforce"
        | "generic_rest"
        | "other"
        | "hubspot"
        | "zendesk"
      demo_request_status: "new" | "scheduled" | "completed" | "archived"
      failure_classification_type:
        | "invalid_signature"
        | "expired_subscription"
        | "renewal_failed"
        | "provider_unavailable"
        | "token_refresh_failed"
        | "unsupported_action"
        | "payload_validation_failed"
        | "duplicate_event"
        | "rate_limited"
        | "transient_network_error"
        | "downstream_write_failed"
        | "internal_processing_error"
        | "dead_lettered"
      five9_domain_status: "active" | "inactive" | "pending_verification"
      five9_ownership_mode: "client" | "workspace"
      form_status: "draft" | "published" | "archived"
      guide_status: "draft" | "published" | "archived"
      legal_connect_readiness:
        | "draft"
        | "setup_in_progress"
        | "test_passed"
        | "ready_for_live"
        | "live"
        | "paused"
      legal_connect_rollout_status:
        | "not_started"
        | "onboarding_in_progress"
        | "testing"
        | "ready_for_live"
        | "live_pilot"
        | "live_steady"
        | "paused"
      legal_connect_safe_mode: "none" | "email_only" | "no_writeback"
      notification_channel:
        | "slack"
        | "email"
        | "sms"
        | "zapier"
        | "make"
        | "pabbly"
        | "n8n"
        | "webhook"
      notification_status: "sent" | "failed" | "pending"
      org_plan: "free" | "starter" | "pro" | "enterprise"
      org_role: "owner" | "admin" | "member"
      org_status: "active" | "suspended" | "cancelled"
      template_kind:
        | "guide"
        | "flow"
        | "campaign"
        | "email"
        | "summary"
        | "prompt"
        | "report"
      template_scope: "platform" | "org" | "partner" | "client" | "workspace"
      template_status: "draft" | "published" | "archived"
      vault_feature_status:
        | "core"
        | "archived"
        | "experimental"
        | "deprecated"
        | "extracted"
      walkthrough_request_status: "new" | "contacted" | "qualified" | "archived"
      workspace_role: "owner" | "admin" | "manager" | "member" | "viewer"
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
    Enums: {
      app_role: ["master_admin", "admin", "ops_team", "viewer"],
      campaign_status: ["draft", "ready", "live", "paused", "archived"],
      crm_type: [
        "clio",
        "workiz",
        "salesforce",
        "generic_rest",
        "other",
        "hubspot",
        "zendesk",
      ],
      demo_request_status: ["new", "scheduled", "completed", "archived"],
      failure_classification_type: [
        "invalid_signature",
        "expired_subscription",
        "renewal_failed",
        "provider_unavailable",
        "token_refresh_failed",
        "unsupported_action",
        "payload_validation_failed",
        "duplicate_event",
        "rate_limited",
        "transient_network_error",
        "downstream_write_failed",
        "internal_processing_error",
        "dead_lettered",
      ],
      five9_domain_status: ["active", "inactive", "pending_verification"],
      five9_ownership_mode: ["client", "workspace"],
      form_status: ["draft", "published", "archived"],
      guide_status: ["draft", "published", "archived"],
      legal_connect_readiness: [
        "draft",
        "setup_in_progress",
        "test_passed",
        "ready_for_live",
        "live",
        "paused",
      ],
      legal_connect_rollout_status: [
        "not_started",
        "onboarding_in_progress",
        "testing",
        "ready_for_live",
        "live_pilot",
        "live_steady",
        "paused",
      ],
      legal_connect_safe_mode: ["none", "email_only", "no_writeback"],
      notification_channel: [
        "slack",
        "email",
        "sms",
        "zapier",
        "make",
        "pabbly",
        "n8n",
        "webhook",
      ],
      notification_status: ["sent", "failed", "pending"],
      org_plan: ["free", "starter", "pro", "enterprise"],
      org_role: ["owner", "admin", "member"],
      org_status: ["active", "suspended", "cancelled"],
      template_kind: [
        "guide",
        "flow",
        "campaign",
        "email",
        "summary",
        "prompt",
        "report",
      ],
      template_scope: ["platform", "org", "partner", "client", "workspace"],
      template_status: ["draft", "published", "archived"],
      vault_feature_status: [
        "core",
        "archived",
        "experimental",
        "deprecated",
        "extracted",
      ],
      walkthrough_request_status: ["new", "contacted", "qualified", "archived"],
      workspace_role: ["owner", "admin", "manager", "member", "viewer"],
    },
  },
} as const
