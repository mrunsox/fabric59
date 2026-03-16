/**
 * Dispositions hook — queries the disposition_access table,
 * which is Fabric59's canonical source for disposition names.
 *
 * The tree editor expects a Disposition interface with richer fields;
 * we map disposition_access rows to that shape with sensible defaults.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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
  const { organization } = useAuth();

  return useQuery({
    queryKey: ['dispositions', organization?.id],
    queryFn: async (): Promise<Disposition[]> => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from('disposition_access')
        .select('*')
        .eq('organization_id', organization.id)
        .order('disposition_name', { ascending: true });

      if (error) throw error;

      return (data || []).map((row, idx) => ({
        id: row.id,
        name: row.disposition_name,
        email_subject: null,
        recipient_emails: [],
        is_active: true,
        sort_order: idx,
        script_id: null,
        email_template_id: null,
        auto_send_email: false,
        auto_send_sms: false,
        sms_template: null,
        callback_delay_minutes: null,
        created_at: row.created_at,
        updated_at: row.created_at,
      }));
    },
    enabled: !!organization?.id,
  });
}

export function useCreateDisposition() {
  const queryClient = useQueryClient();
  const { organization, session } = useAuth();

  return {
    mutateAsync: async (data: { name: string }) => {
      if (!organization?.id) throw new Error('No organization');

      const { data: row, error } = await supabase
        .from('disposition_access')
        .insert({
          organization_id: organization.id,
          disposition_name: data.name,
          created_by: session?.user?.id ?? null,
        })
        .select()
        .single();

      if (error) {
        toast.error('Failed to create disposition');
        throw error;
      }

      queryClient.invalidateQueries({ queryKey: ['dispositions'] });
      return row;
    },
    isPending: false,
  };
}

export function useDeleteDisposition() {
  const queryClient = useQueryClient();

  return {
    mutateAsync: async (id: string) => {
      const { error } = await supabase
        .from('disposition_access')
        .delete()
        .eq('id', id);

      if (error) {
        toast.error('Failed to delete disposition');
        throw error;
      }

      queryClient.invalidateQueries({ queryKey: ['dispositions'] });
    },
    isPending: false,
  };
}
