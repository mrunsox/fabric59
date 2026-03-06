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
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
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
          id: string
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
          id?: string
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
          id?: string
          name?: string
          plan?: Database["public"]["Enums"]["org_plan"]
          status?: Database["public"]["Enums"]["org_status"]
          updated_at?: string
        }
        Relationships: []
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
      tenants: {
        Row: {
          asana_api_key: string | null
          calendly_api_key: string | null
          created_at: string
          crm_api_key: string | null
          crm_api_url: string | null
          crm_type: Database["public"]["Enums"]["crm_type"]
          custom_mappings: Json | null
          docusign_api_key: string | null
          dropbox_api_key: string | null
          five9_domain_id: string | null
          google_calendar_id: string | null
          id: string
          integration_configs: Json | null
          make_webhook_url: string | null
          microsoft365_api_key: string | null
          n8n_webhook_url: string | null
          name: string
          notification_triggers: Json | null
          openai_api_key: string | null
          organization_id: string | null
          pabbly_webhook_url: string | null
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
          zapier_webhook_url: string | null
          zoom_api_key: string | null
        }
        Insert: {
          asana_api_key?: string | null
          calendly_api_key?: string | null
          created_at?: string
          crm_api_key?: string | null
          crm_api_url?: string | null
          crm_type?: Database["public"]["Enums"]["crm_type"]
          custom_mappings?: Json | null
          docusign_api_key?: string | null
          dropbox_api_key?: string | null
          five9_domain_id?: string | null
          google_calendar_id?: string | null
          id?: string
          integration_configs?: Json | null
          make_webhook_url?: string | null
          microsoft365_api_key?: string | null
          n8n_webhook_url?: string | null
          name: string
          notification_triggers?: Json | null
          openai_api_key?: string | null
          organization_id?: string | null
          pabbly_webhook_url?: string | null
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
          zapier_webhook_url?: string | null
          zoom_api_key?: string | null
        }
        Update: {
          asana_api_key?: string | null
          calendly_api_key?: string | null
          created_at?: string
          crm_api_key?: string | null
          crm_api_url?: string | null
          crm_type?: Database["public"]["Enums"]["crm_type"]
          custom_mappings?: Json | null
          docusign_api_key?: string | null
          dropbox_api_key?: string | null
          five9_domain_id?: string | null
          google_calendar_id?: string | null
          id?: string
          integration_configs?: Json | null
          make_webhook_url?: string | null
          microsoft365_api_key?: string | null
          n8n_webhook_url?: string | null
          name?: string
          notification_triggers?: Json | null
          openai_api_key?: string | null
          organization_id?: string | null
          pabbly_webhook_url?: string | null
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
    }
    Functions: {
      get_user_org_ids: { Args: { _user_id: string }; Returns: string[] }
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
      user_has_permission: {
        Args: { _org_id: string; _permission: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "master_admin" | "admin" | "ops_team" | "viewer"
      crm_type:
        | "clio"
        | "workiz"
        | "salesforce"
        | "generic_rest"
        | "other"
        | "hubspot"
        | "zendesk"
      five9_domain_status: "active" | "inactive" | "pending_verification"
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
      crm_type: [
        "clio",
        "workiz",
        "salesforce",
        "generic_rest",
        "other",
        "hubspot",
        "zendesk",
      ],
      five9_domain_status: ["active", "inactive", "pending_verification"],
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
    },
  },
} as const
