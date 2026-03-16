import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function useKBCategories() {
  const { organization } = useAuth();
  const orgId = organization?.id;

  return useQuery({
    queryKey: ["kb_categories", orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from("kb_categories")
        .select("*")
        .eq("organization_id", orgId)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });
}

export function useKBArticles(categoryId?: string) {
  const { organization } = useAuth();
  const orgId = organization?.id;

  return useQuery({
    queryKey: ["kb_articles", orgId, categoryId],
    queryFn: async () => {
      if (!orgId) return [];
      let query = supabase
        .from("kb_articles")
        .select("*")
        .eq("organization_id", orgId)
        .order("updated_at", { ascending: false });
      if (categoryId) query = query.eq("category_id", categoryId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });
}

export function useCreateKBCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: { name: string; organization_id: string; tenant_id?: string; sort_order?: number }) => {
      const { data, error } = await supabase.from("kb_categories").insert(values).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kb_categories"] });
      toast.success("Category created");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCreateKBArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: {
      title: string;
      slug: string;
      content?: string;
      organization_id: string;
      category_id?: string;
      tenant_id?: string;
      status?: string;
    }) => {
      const { data, error } = await supabase.from("kb_articles").insert(values).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kb_articles"] });
      toast.success("Article created");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateKBArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...values }: { id: string; title?: string; content?: string; status?: string; category_id?: string }) => {
      const { data, error } = await supabase.from("kb_articles").update(values).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kb_articles"] });
      toast.success("Article updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteKBArticle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("kb_articles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kb_articles"] });
      toast.success("Article deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteKBCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("kb_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kb_categories"] });
      toast.success("Category deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
