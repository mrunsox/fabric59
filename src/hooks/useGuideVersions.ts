import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

/**
 * Phase 6 — Native guide lifecycle hooks.
 *
 * These run alongside the legacy ScriptBuilderPage bridge (which remains
 * authoritative for guides whose source_type='script'). For canonical
 * native guides (source_type IS NULL), these are the real read/write path.
 */
export type GuideVersion = {
  id: string;
  guide_id: string;
  version: number;
  content: Record<string, unknown>;
  is_current: boolean;
  created_by: string | null;
  created_at: string;
};

export function useGuideVersions(guideId: string | undefined) {
  return useQuery({
    queryKey: ["guide-versions", guideId ?? null],
    enabled: !!guideId,
    queryFn: async (): Promise<GuideVersion[]> => {
      const { data, error } = await supabase
        .from("guide_versions")
        .select("id, guide_id, version, content, is_current, created_by, created_at")
        .eq("guide_id", guideId!)
        .order("version", { ascending: false });
      if (error) throw error;
      return (data ?? []) as GuideVersion[];
    },
  });
}

export function useCurrentGuideVersion(guideId: string | undefined) {
  return useQuery({
    queryKey: ["guide-version-current", guideId ?? null],
    enabled: !!guideId,
    queryFn: async (): Promise<GuideVersion | null> => {
      const { data, error } = await supabase
        .from("guide_versions")
        .select("id, guide_id, version, content, is_current, created_by, created_at")
        .eq("guide_id", guideId!)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as GuideVersion | null) ?? null;
    },
  });
}

/** Save a new draft version (always non-current; bumps version number). */
export function useSaveGuideDraft() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({
      guideId,
      content,
    }: { guideId: string; content: Record<string, unknown> }) => {
      const { data: latest, error: lerr } = await supabase
        .from("guide_versions")
        .select("version")
        .eq("guide_id", guideId)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (lerr) throw lerr;
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
      qc.invalidateQueries({ queryKey: ["guide-versions", vars.guideId] });
      qc.invalidateQueries({ queryKey: ["guide-version-current", vars.guideId] });
      toast.success("Draft saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/** Publish a specific version: flip is_current, set guides.current_version + status='published'. */
export function usePublishGuideVersion() {
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
      qc.invalidateQueries({ queryKey: ["guide-versions", vars.guideId] });
      qc.invalidateQueries({ queryKey: ["workspace-guide"] });
      qc.invalidateQueries({ queryKey: ["workspace-guides"] });
      toast.success(`Published v${vars.version}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/** Rollback: republish a prior version, leaving newer versions intact. */
export function useRollbackGuide() {
  const publish = usePublishGuideVersion();
  return useMutation({
    mutationFn: async (vars: { guideId: string; version: number }) => publish.mutateAsync(vars),
  });
}

/** Create a native canonical guide (no legacy script source). */
export function useCreateNativeGuide() {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { name: string; description?: string; campaignId?: string | null }) => {
      if (!workspace) throw new Error("No workspace");
      const { data: guide, error } = await supabase
        .from("guides")
        .insert({
          workspace_id: workspace.id,
          name: input.name,
          description: input.description ?? null,
          status: "draft",
          current_version: 1,
          campaign_id: input.campaignId ?? null,
          metadata: { native: true } as never,
          created_by: user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      const { error: vErr } = await supabase.from("guide_versions").insert({
        guide_id: guide.id,
        version: 1,
        content: { nodes: [], edges: [] } as never,
        is_current: false,
        created_by: user?.id ?? null,
      });
      if (vErr) throw vErr;
      return guide;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace-guides"] });
      toast.success("Guide created");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/** Create a native guide seeded from a canonical template (kind='guide'). */
export function useCreateGuideFromTemplate() {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      template: { id: string; name: string; content: Record<string, unknown>; kind: string };
      name?: string;
      campaignId?: string | null;
    }) => {
      if (!workspace) throw new Error("No workspace");
      if (input.template.kind !== "guide") {
        throw new Error("Only guide-kind templates can seed a guide");
      }
      const { data: guide, error } = await supabase
        .from("guides")
        .insert({
          workspace_id: workspace.id,
          name: input.name?.trim() || `${input.template.name} (from template)`,
          status: "draft",
          current_version: 1,
          campaign_id: input.campaignId ?? null,
          metadata: { from_template_id: input.template.id, native: true } as never,
          created_by: user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      const { error: vErr } = await supabase.from("guide_versions").insert({
        guide_id: guide.id,
        version: 1,
        content: input.template.content as never,
        is_current: false,
        created_by: user?.id ?? null,
      });
      if (vErr) throw vErr;
      return guide;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace-guides"] });
      toast.success("Guide created from template");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/** Update guide name/description/campaign without touching content. */
export function useUpdateGuideMeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      guideId: string;
      name?: string;
      description?: string | null;
      status?: "draft" | "published" | "archived";
    }) => {
      const updates: Record<string, unknown> = {};
      if (input.name !== undefined) updates.name = input.name;
      if (input.description !== undefined) updates.description = input.description;
      if (input.status !== undefined) updates.status = input.status;
      const { error } = await supabase.from("guides").update(updates).eq("id", input.guideId);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["workspace-guide"] });
      qc.invalidateQueries({ queryKey: ["workspace-guides"] });
      toast.success("Guide updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
