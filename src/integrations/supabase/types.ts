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
          created_at: string
          id: string
          name: string
          plan: Database["public"]["Enums"]["org_plan"]
          status: Database["public"]["Enums"]["org_status"]
          updated_at: string
        }
        Insert: {
          billing_email?: string | null
          created_at?: string
          id?: string
          name: string
          plan?: Database["public"]["Enums"]["org_plan"]
          status?: Database["public"]["Enums"]["org_status"]
          updated_at?: string
        }
        Update: {
          billing_email?: string | null
          created_at?: string
          id?: string
          name?: string
          plan?: Database["public"]["Enums"]["org_plan"]
          status?: Database["public"]["Enums"]["org_status"]
          updated_at?: string
        }
        Relationships: []
      }
      tenants: {
        Row: {
          created_at: string
          crm_api_key: string | null
          crm_api_url: string | null
          crm_type: Database["public"]["Enums"]["crm_type"]
          custom_mappings: Json | null
          five9_domain_id: string | null
          id: string
          make_webhook_url: string | null
          n8n_webhook_url: string | null
          name: string
          notification_triggers: Json | null
          organization_id: string | null
          pabbly_webhook_url: string | null
          slack_webhook_url: string | null
          status: string
          updated_at: string
          webhook_url: string | null
          zapier_webhook_url: string | null
        }
        Insert: {
          created_at?: string
          crm_api_key?: string | null
          crm_api_url?: string | null
          crm_type?: Database["public"]["Enums"]["crm_type"]
          custom_mappings?: Json | null
          five9_domain_id?: string | null
          id?: string
          make_webhook_url?: string | null
          n8n_webhook_url?: string | null
          name: string
          notification_triggers?: Json | null
          organization_id?: string | null
          pabbly_webhook_url?: string | null
          slack_webhook_url?: string | null
          status?: string
          updated_at?: string
          webhook_url?: string | null
          zapier_webhook_url?: string | null
        }
        Update: {
          created_at?: string
          crm_api_key?: string | null
          crm_api_url?: string | null
          crm_type?: Database["public"]["Enums"]["crm_type"]
          custom_mappings?: Json | null
          five9_domain_id?: string | null
          id?: string
          make_webhook_url?: string | null
          n8n_webhook_url?: string | null
          name?: string
          notification_triggers?: Json | null
          organization_id?: string | null
          pabbly_webhook_url?: string | null
          slack_webhook_url?: string | null
          status?: string
          updated_at?: string
          webhook_url?: string | null
          zapier_webhook_url?: string | null
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
            referencedRelation: "tenants"
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
    }
    Views: {
      [_ in never]: never
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
    }
    Enums: {
      app_role: "master_admin" | "admin" | "ops_team" | "viewer"
      crm_type: "clio" | "workiz" | "salesforce" | "generic_rest" | "other"
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
      crm_type: ["clio", "workiz", "salesforce", "generic_rest", "other"],
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
