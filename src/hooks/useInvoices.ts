import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Invoice {
  id: string;
  organization_id: string;
  partner_id: string | null;
  tenant_id: string | null;
  status: string;
  issue_date: string;
  due_date: string | null;
  currency: string;
  total_amount: number;
  notes: string | null;
  source_upload_id: string | null;
  source_period_start: string | null;
  source_period_end: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  tenant_id: string | null;
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
  metadata: Record<string, unknown>;
  created_at: string;
}

export function useInvoices(statusFilter?: string) {
  const { organization } = useOrganization();
  const orgId = organization?.id;

  return useQuery({
    queryKey: ["invoices", orgId, statusFilter],
    queryFn: async () => {
      if (!orgId) return [];
      let query = supabase
        .from("invoices")
        .select("*")
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });
      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as Invoice[];
    },
    enabled: !!orgId,
  });
}

export function useInvoiceLineItems(invoiceId: string | null) {
  return useQuery({
    queryKey: ["invoice_line_items", invoiceId],
    queryFn: async () => {
      if (!invoiceId) return [];
      const { data, error } = await supabase
        .from("invoice_line_items")
        .select("*")
        .eq("invoice_id", invoiceId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as InvoiceLineItem[];
    },
    enabled: !!invoiceId,
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  const { organization } = useOrganization();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      partner_id?: string | null;
      tenant_id?: string | null;
      status?: string;
      issue_date?: string;
      due_date?: string | null;
      currency?: string;
      total_amount: number;
      notes?: string;
      source_upload_id?: string | null;
      source_period_start?: string | null;
      source_period_end?: string | null;
      line_items?: Array<{
        tenant_id?: string | null;
        description: string;
        quantity: number;
        unit?: string;
        rate: number;
        amount: number;
        metadata?: Record<string, unknown>;
      }>;
    }) => {
      if (!organization?.id) throw new Error("No organization");
      
      const { line_items, ...invoiceData } = input;
      const { data: invoice, error } = await supabase
        .from("invoices")
        .insert({
          organization_id: organization.id,
          created_by: user?.id || null,
          partner_id: invoiceData.partner_id || null,
          tenant_id: invoiceData.tenant_id || null,
          status: invoiceData.status || "draft",
          issue_date: invoiceData.issue_date || new Date().toISOString().split("T")[0],
          due_date: invoiceData.due_date || null,
          currency: invoiceData.currency || "USD",
          total_amount: invoiceData.total_amount,
          notes: invoiceData.notes || null,
          source_upload_id: invoiceData.source_upload_id || null,
          source_period_start: invoiceData.source_period_start || null,
          source_period_end: invoiceData.source_period_end || null,
        })
        .select()
        .single();
      if (error) throw error;

      if (line_items && line_items.length > 0) {
        const items = line_items.map((li) => ({
          invoice_id: invoice.id,
          tenant_id: li.tenant_id || null,
          description: li.description,
          quantity: li.quantity,
          unit: li.unit || "minutes",
          rate: li.rate,
          amount: li.amount,
          metadata: (li.metadata || {}) as any,
        }));
        const { error: liError } = await supabase
          .from("invoice_line_items")
          .insert(items);
        if (liError) throw liError;
      }

      return invoice;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice created");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateInvoiceStatus() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("invoices")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Invoice updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
