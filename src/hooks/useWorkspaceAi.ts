// Phase 10 — Workspace AI hooks: config, knowledge sources, conversations, chat.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export interface WorkspaceAiConfig {
  id: string;
  workspace_id: string;
  enabled: boolean;
  knowledge_only: boolean;
  tone: string;
  industry: string | null;
  jurisdiction: string | null;
  terminology: Record<string, string>;
  source_preference: string;
  updated_at: string;
}

export interface WorkspaceKnowledgeSource {
  id: string;
  workspace_id: string;
  source_type: string;
  enabled: boolean;
  last_indexed_at: string | null;
  item_count: number;
  status: string;
  notes: string | null;
}

export interface WorkspaceAiConversation {
  id: string;
  workspace_id: string;
  title: string;
  started_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceAiMessage {
  id: string;
  conversation_id: string;
  workspace_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  grounding: Record<string, unknown>;
  created_at: string;
}

export function useWorkspaceAiConfig(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["workspace-ai-config", workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<WorkspaceAiConfig | null> => {
      const { data, error } = await db
        .from("workspace_ai_configs")
        .select("*")
        .eq("workspace_id", workspaceId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateWorkspaceAiConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: { workspaceId: string } & Partial<Omit<WorkspaceAiConfig, "id" | "workspace_id" | "updated_at">>,
    ) => {
      const { workspaceId, ...rest } = input;
      const { error } = await db
        .from("workspace_ai_configs")
        .upsert({ workspace_id: workspaceId, ...rest }, { onConflict: "workspace_id" });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["workspace-ai-config", vars.workspaceId] });
      toast.success("AI configuration saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useWorkspaceKnowledgeSources(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["workspace-knowledge-sources", workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<WorkspaceKnowledgeSource[]> => {
      const { data, error } = await db
        .from("workspace_knowledge_sources")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("source_type");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useToggleKnowledgeSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; workspaceId: string; enabled: boolean }) => {
      const { error } = await db
        .from("workspace_knowledge_sources")
        .update({ enabled: input.enabled })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["workspace-knowledge-sources", vars.workspaceId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useWorkspaceAiConversations(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ["workspace-ai-conversations", workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<WorkspaceAiConversation[]> => {
      const { data, error } = await db
        .from("workspace_ai_conversations")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateAiConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { workspaceId: string; title?: string }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { data, error } = await db
        .from("workspace_ai_conversations")
        .insert({
          workspace_id: input.workspaceId,
          title: input.title ?? "New conversation",
          started_by: userData?.user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as WorkspaceAiConversation;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["workspace-ai-conversations", vars.workspaceId] });
    },
  });
}

export function useWorkspaceAiMessages(conversationId: string | null) {
  return useQuery({
    queryKey: ["workspace-ai-messages", conversationId],
    enabled: !!conversationId,
    queryFn: async (): Promise<WorkspaceAiMessage[]> => {
      const { data, error } = await db
        .from("workspace_ai_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as WorkspaceAiMessage[];
    },
  });
}

export interface SendAssistantMessageResult {
  reply: string;
  grounding: {
    sources: Record<string, number>;
    knowledge_only: boolean;
    used_workspace_knowledge: boolean;
  };
}

export function useSendAssistantMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      workspaceId: string;
      conversationId: string;
      message: string;
      knowledgeOnly?: boolean;
      history: { role: "user" | "assistant"; content: string }[];
    }): Promise<SendAssistantMessageResult> => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id ?? null;

      // Persist user message immediately
      const { error: userMsgErr } = await db.from("workspace_ai_messages").insert({
        conversation_id: input.conversationId,
        workspace_id: input.workspaceId,
        role: "user",
        content: input.message,
        created_by: userId,
      });
      if (userMsgErr) throw userMsgErr;

      const { data, error } = await supabase.functions.invoke("workspace-assistant", {
        body: {
          workspaceId: input.workspaceId,
          conversationId: input.conversationId,
          knowledgeOnly: input.knowledgeOnly ?? false,
          messages: [...input.history, { role: "user", content: input.message }],
        },
      });
      if (error) throw error;
      const result = data as SendAssistantMessageResult;

      await db.from("workspace_ai_messages").insert({
        conversation_id: input.conversationId,
        workspace_id: input.workspaceId,
        role: "assistant",
        content: result.reply,
        grounding: result.grounding ?? {},
        created_by: userId,
      });

      await db
        .from("workspace_ai_conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", input.conversationId);

      return result;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["workspace-ai-messages", vars.conversationId] });
      qc.invalidateQueries({ queryKey: ["workspace-ai-conversations", vars.workspaceId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
