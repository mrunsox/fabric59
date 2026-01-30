import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { FieldMappingRecord, FieldMapping } from "@/types/mapping";
import { toast } from "sonner";

// Fetch all mappings for a domain
export function useFieldMappings(domainId: string | null) {
  return useQuery({
    queryKey: ["field-mappings", domainId],
    queryFn: async () => {
      if (!domainId) return [];
      
      const { data, error } = await supabase
        .from("field_mappings")
        .select("*")
        .eq("five9_domain_id", domainId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Parse mappings JSON and cast properly
      return (data || []).map(item => ({
        ...item,
        mappings: (item.mappings as unknown as FieldMapping[]) || [],
        transformations: item.transformations || [],
      })) as FieldMappingRecord[];
    },
    enabled: !!domainId,
  });
}

// Fetch a single mapping by ID
export function useFieldMapping(mappingId: string | null) {
  return useQuery({
    queryKey: ["field-mapping", mappingId],
    queryFn: async () => {
      if (!mappingId) return null;
      
      const { data, error } = await supabase
        .from("field_mappings")
        .select("*")
        .eq("id", mappingId)
        .single();

      if (error) throw error;
      
      return {
        ...data,
        mappings: (data.mappings as unknown as FieldMapping[]) || [],
        transformations: data.transformations || [],
      } as FieldMappingRecord;
    },
    enabled: !!mappingId,
  });
}

// Create a new mapping
export function useCreateFieldMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      five9_domain_id: string;
      tenant_id?: string | null;
      name: string;
      description?: string;
      source_type?: string;
      destination_type: string;
      mappings?: FieldMapping[];
    }) => {
      const { data: result, error } = await supabase
        .from("field_mappings")
        .insert([{
          five9_domain_id: data.five9_domain_id,
          tenant_id: data.tenant_id || null,
          name: data.name,
          description: data.description || null,
          source_type: data.source_type || "five9",
          destination_type: data.destination_type,
          mappings: JSON.stringify(data.mappings || []),
        }])
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["field-mappings", variables.five9_domain_id] });
      toast.success("Mapping created successfully");
    },
    onError: (error) => {
      toast.error(`Failed to create mapping: ${error.message}`);
    },
  });
}

// Update an existing mapping
export function useUpdateFieldMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      name?: string;
      description?: string;
      destination_type?: string;
      mappings?: FieldMapping[];
      is_active?: boolean;
    }) => {
      const updateData: Record<string, unknown> = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.destination_type !== undefined) updateData.destination_type = data.destination_type;
      if (data.mappings !== undefined) updateData.mappings = data.mappings as unknown as Record<string, unknown>[];
      if (data.is_active !== undefined) updateData.is_active = data.is_active;

      const { data: result, error } = await supabase
        .from("field_mappings")
        .update(updateData)
        .eq("id", data.id)
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["field-mappings"] });
      queryClient.invalidateQueries({ queryKey: ["field-mapping", result.id] });
      toast.success("Mapping updated successfully");
    },
    onError: (error) => {
      toast.error(`Failed to update mapping: ${error.message}`);
    },
  });
}

// Delete a mapping
export function useDeleteFieldMapping() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("field_mappings")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["field-mappings"] });
      toast.success("Mapping deleted successfully");
    },
    onError: (error) => {
      toast.error(`Failed to delete mapping: ${error.message}`);
    },
  });
}
