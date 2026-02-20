import { supabase } from "@/integrations/supabase/client";

interface LogActionParams {
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: Record<string, unknown>;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export function useAuditLog() {
  const logAction = async ({ action, entity_type, entity_id, details }: LogActionParams) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      await db.from('audit_logs').insert({
        user_id: user?.id ?? null,
        action,
        entity_type,
        entity_id: entity_id ?? null,
        details: details ?? null,
      });
    } catch (error) {
      console.error('Failed to log action:', error);
    }
  };

  return { logAction };
}
