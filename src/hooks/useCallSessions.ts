import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function useCallSessions(limit = 50) {
  const { organization } = useAuth();
  return useQuery({
    queryKey: ["call_sessions", organization?.id, limit],
    queryFn: async () => {
      if (!organization?.id) return [];
      const { data, error } = await supabase
        .from("call_sessions")
        .select("*")
        .eq("organization_id", organization.id)
        .order("started_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data;
    },
    enabled: !!organization?.id,
  });
}

export function useCreateCallSession() {
  const qc = useQueryClient();
  const { organization } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      five9_call_id?: string;
      script_id?: string;
      agent_id?: string;
      tenant_id?: string;
      dnis?: string;
      ani?: string;
    }) => {
      if (!organization?.id) throw new Error("No organization");
      const { data, error } = await supabase
        .from("call_sessions")
        .insert({ ...input, organization_id: organization.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["call_sessions"] }),
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateCallSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; ended_at?: string; duration_seconds?: number; status?: string }) => {
      const { error } = await supabase.from("call_sessions").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["call_sessions"] }),
    onError: (e: Error) => toast.error(e.message),
  });
}

// Call notes
export function useCallNotes(callSessionId?: string) {
  return useQuery({
    queryKey: ["call_notes", callSessionId],
    queryFn: async () => {
      if (!callSessionId) return [];
      const { data, error } = await supabase
        .from("call_notes")
        .select("*")
        .eq("call_session_id", callSessionId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!callSessionId,
  });
}

export function useCreateCallNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { call_session_id: string; agent_id: string; note_text: string }) => {
      const { data, error } = await supabase.from("call_notes").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["call_notes"] }),
    onError: (e: Error) => toast.error(e.message),
  });
}
