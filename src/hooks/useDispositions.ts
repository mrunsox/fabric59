// Dispositions stub adapted for Fabric59's architecture
// Fabric59 uses five9_dispositions / disposition_access tables instead of a user-scoped dispositions table
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Disposition {
  id: string;
  name: string;
  email_subject: string | null;
  recipient_emails: string[];
  is_active: boolean;
  sort_order: number;
  script_id: string | null;
  email_template_id: string | null;
  auto_send_email: boolean;
  auto_send_sms: boolean;
  sms_template: string | null;
  callback_delay_minutes: number | null;
  created_at: string;
  updated_at: string;
}

export function useDispositions(_scriptId?: string) {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['tree-dispositions', session?.user?.id],
    queryFn: async (): Promise<Disposition[]> => {
      // Return empty array — Fabric59 manages dispositions through disposition_access table
      return [];
    },
    enabled: !!session,
  });
}

export function useCreateDisposition() {
  return {
    mutateAsync: async (_data: any) => {
      console.warn('useCreateDisposition stub: Fabric59 uses disposition_access table');
      return null;
    },
    isPending: false,
  };
}

export function useDeleteDisposition() {
  return {
    mutateAsync: async (_id: string) => {
      console.warn('useDeleteDisposition stub');
    },
    isPending: false,
  };
}
