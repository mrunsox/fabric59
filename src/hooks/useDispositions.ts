/**
 * Dispositions hook — queries the disposition_access table,
 * which is Fabric59's canonical source for disposition names.
 *
 * Each row can optionally be scoped to a campaign via campaign_id.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Disposition {
  id: string;
  name: string;
  campaign_id: string | null;
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
        .order('sort_order', { ascending: true })
        .order('disposition_name', { ascending: true });

      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        name: row.disposition_name,
        campaign_id: row.campaign_id ?? null,
        email_subject: null,
        recipient_emails: [],
        is_active: row.is_active ?? true,
        sort_order: row.sort_order ?? 0,
        script_id: null,
        email_template_id: null,
        auto_send_email: false,
        auto_send_sms: false,
        sms_template: null,
        callback_delay_minutes: null,
        created_at: row.created_at,
        updated_at: row.updated_at ?? row.created_at,
      }));
    },
    enabled: !!organization?.id,
  });
}

export function useCreateDisposition() {
  const queryClient = useQueryClient();
  const { organization, session } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      name: string;
      campaignId?: string | null;
      sortOrder?: number;
      isActive?: boolean;
    }) => {
      if (!organization?.id) throw new Error('No organization');

      const { data: row, error } = await supabase
        .from('disposition_access')
        .insert({
          organization_id: organization.id,
          disposition_name: data.name,
          campaign_id: data.campaignId ?? null,
          sort_order: data.sortOrder ?? 0,
          is_active: data.isActive ?? true,
          created_by: session?.user?.id ?? null,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return row;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispositions'] });
      toast.success('Disposition created');
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to create disposition'),
  });
}

export function useUpdateDisposition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      name?: string;
      campaignId?: string | null;
      sortOrder?: number;
      isActive?: boolean;
    }) => {
      const patch: Record<string, unknown> = {};
      if (input.name !== undefined) patch.disposition_name = input.name;
      if (input.campaignId !== undefined) patch.campaign_id = input.campaignId;
      if (input.sortOrder !== undefined) patch.sort_order = input.sortOrder;
      if (input.isActive !== undefined) patch.is_active = input.isActive;

      const { data, error } = await supabase
        .from('disposition_access')
        .update(patch as any)
        .eq('id', input.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispositions'] });
      toast.success('Disposition updated');
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to update disposition'),
  });
}

export function useDeleteDisposition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('disposition_access')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dispositions'] });
      toast.success('Disposition deleted');
    },
    onError: (e: Error) => toast.error(e.message || 'Failed to delete disposition'),
  });
}
