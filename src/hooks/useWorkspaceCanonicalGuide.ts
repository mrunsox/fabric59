import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  WORKSPACE_GUIDE_SINGLETON_KIND,
  WORKSPACE_GUIDE_SINGLETON_NAME,
  type WorkspaceGuideContentV2,
} from "@/types/workspace-guide";
import { migrateWorkspaceGuideContent } from "@/lib/workspace-guide/schema";

/**
 * Phase 4 — Canonical singleton workspace guide.
 *
 * One row per workspace in the `guides` table, identified by:
 *   name = '__workspace_guide__'
 *   metadata.kind = 'workspace_singleton'
 *   source_type = null
 *
 * Sections live in guide_versions.content as { schemaVersion: 2, sections: [...] }.
 * This reuses the existing draft/publish/version table so we get history for free
 * with no schema changes.
 */

export type SingletonGuideRow = {
  id: string;
  workspace_id: string;
  status: "draft" | "published" | "archived";
  current_version: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type SingletonGuideVersionRow = {
  id: string;
  version: number;
  is_current: boolean;
  content: WorkspaceGuideContentV2;
  created_by: string | null;
  created_at: string;
};

const SINGLETON_KEY = ["workspace-canonical-guide"] as const;

async function findSingleton(workspaceId: string): Promise<SingletonGuideRow | null> {
  const { data, error } = await supabase
    .from("guides")
    .select("id, workspace_id, status, current_version, metadata, created_at, updated_at")
    .eq("workspace_id", workspaceId)
    .eq("name", WORKSPACE_GUIDE_SINGLETON_NAME)
    .is("source_type", null)
    .maybeSingle();
  if (error) throw error;
  return (data as SingletonGuideRow | null) ?? null;
}

async function createSingleton(workspaceId: string, userId: string | null): Promise<SingletonGuideRow> {
  const { data, error } = await supabase
    .from("guides")
    .insert({
      workspace_id: workspaceId,
      name: WORKSPACE_GUIDE_SINGLETON_NAME,
      description: "Workspace canonical guide",
      status: "draft",
      current_version: 1,
      campaign_id: null,
      metadata: { kind: WORKSPACE_GUIDE_SINGLETON_KIND, native: true } as never,
      created_by: userId,
    })
    .select("id, workspace_id, status, current_version, metadata, created_at, updated_at")
    .single();
  if (error) throw error;
  // Seed empty v1 (non-current).
  const { error: vErr } = await supabase.from("guide_versions").insert({
    guide_id: data.id,
    version: 1,
    content: { schemaVersion: 2, sections: [] } as never,
    is_current: false,
    created_by: userId,
  });
  if (vErr) throw vErr;
  return data as SingletonGuideRow;
}

export function useWorkspaceCanonicalGuide() {
  const { workspace } = useWorkspace();
  const { user } = useAuth();
  return useQuery({
    queryKey: [...SINGLETON_KEY, "row", workspace?.id ?? null],
    enabled: !!workspace,
    queryFn: async (): Promise<SingletonGuideRow> => {
      const existing = await findSingleton(workspace!.id);
      if (existing) return existing;
      return createSingleton(workspace!.id, user?.id ?? null);
    },
  });
}

export function useSingletonGuideVersions(guideId: string | undefined) {
  return useQuery({
    queryKey: [...SINGLETON_KEY, "versions", guideId ?? null],
    enabled: !!guideId,
    queryFn: async (): Promise<SingletonGuideVersionRow[]> => {
      const { data, error } = await supabase
        .from("guide_versions")
        .select("id, version, is_current, content, created_by, created_at")
        .eq("guide_id", guideId!)
        .order("version", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        ...r,
        content: migrateWorkspaceGuideContent(r.content),
      })) as SingletonGuideVersionRow[];
    },
  });
}

/** Latest version (draft or published, whichever has highest version). */
export function useLatestSingletonVersion(guideId: string | undefined) {
  return useQuery({
    queryKey: [...SINGLETON_KEY, "latest", guideId ?? null],
    enabled: !!guideId,
    queryFn: async (): Promise<SingletonGuideVersionRow | null> => {
      const { data, error } = await supabase
        .from("guide_versions")
        .select("id, version, is_current, content, created_by, created_at")
        .eq("guide_id", guideId!)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return { ...data, content: migrateWorkspaceGuideContent(data.content) } as SingletonGuideVersionRow;
    },
  });
}

/**
 * Currently published version for a workspace (the read used by the
 * agent runner in Phase 6). Returns null if nothing is published yet.
 */
export function usePublishedSingletonGuide() {
  const { workspace } = useWorkspace();
  return useQuery({
    queryKey: [...SINGLETON_KEY, "published", workspace?.id ?? null],
    enabled: !!workspace,
    queryFn: async (): Promise<WorkspaceGuideContentV2 | null> => {
      const row = await findSingleton(workspace!.id);
      if (!row) return null;
      const { data, error } = await supabase
        .from("guide_versions")
        .select("content")
        .eq("guide_id", row.id)
        .eq("is_current", true)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return migrateWorkspaceGuideContent(data.content);
    },
  });
}

/** Save a new draft version, bumping the version number. */
export function useSaveSingletonDraft() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      guideId,
      content,
    }: { guideId: string; content: WorkspaceGuideContentV2 }) => {
      const { data: latest, error: lErr } = await supabase
        .from("guide_versions")
        .select("version")
        .eq("guide_id", guideId)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lErr) throw lErr;
      const nextVersion = (latest?.version ?? 0) + 1;
      const { error } = await supabase.from("guide_versions").insert({
        guide_id: guideId,
        version: nextVersion,
        content: content as never,
        is_current: false,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
      return nextVersion;
    },
    onSuccess: (_v, vars) => {
      qc.invalidateQueries({ queryKey: [...SINGLETON_KEY, "versions", vars.guideId] });
      qc.invalidateQueries({ queryKey: [...SINGLETON_KEY, "latest", vars.guideId] });
      toast.success("Draft saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/** Publish a specific version. Previous published version moves to history. */
export function usePublishSingletonVersion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ guideId, version }: { guideId: string; version: number }) => {
      const { error: clearErr } = await supabase
        .from("guide_versions")
        .update({ is_current: false })
        .eq("guide_id", guideId);
      if (clearErr) throw clearErr;
      const { error: setErr } = await supabase
        .from("guide_versions")
        .update({ is_current: true })
        .eq("guide_id", guideId)
        .eq("version", version);
      if (setErr) throw setErr;
      const { error: gErr } = await supabase
        .from("guides")
        .update({ status: "published", current_version: version })
        .eq("id", guideId);
      if (gErr) throw gErr;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: [...SINGLETON_KEY] });
      toast.success(`Published v${vars.version}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/** Restore an older version: copies its content into a new draft. */
export function useRestoreSingletonVersion() {
  const save = useSaveSingletonDraft();
  return useMutation({
    mutationFn: async (input: { guideId: string; content: WorkspaceGuideContentV2 }) =>
      save.mutateAsync({ guideId: input.guideId, content: input.content }),
  });
}
