import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

/**
 * Phase 5 — Canonical templates hook.
 *
 * Reads from the canonical `templates` table. Legacy template tables
 * (script_templates, flow_templates, email_templates, report_templates,
 * call_summary_templates, legal_connect_prompt_templates, campaign_blueprints)
 * are mirrored in via DB triggers + a Phase 5 backfill, so this is the
 * single canonical read surface regardless of which legacy writer touched
 * the row.
 */
export type TemplateScope = "platform" | "org" | "partner" | "client" | "workspace";
export type TemplateKind = "guide" | "flow" | "campaign" | "email" | "summary" | "prompt" | "report";
export type TemplateStatus = "draft" | "published" | "archived";

export type WorkspaceTemplate = {
  id: string;
  organization_id: string | null;
  scope_type: TemplateScope;
  scope_id: string | null;
  kind: TemplateKind;
  name: string;
  description: string | null;
  status: TemplateStatus;
  content: Record<string, unknown>;
  parent_template_id: string | null;
  current_version: number;
  source_type: string | null;
  source_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

/**
 * Read templates visible to the current workspace.
 *
 * `scope` controls visibility:
 *   - "inherited" (default): inheritance read model — platform + this org.
 *     Used by the Templates library page where forks and lineage matter.
 *   - "workspace": strictly workspace-assigned templates only
 *     (`scope_type='workspace' AND scope_id=workspace.id`). Used by the
 *     Workspace Home KPI + Recent so the empty state is truly empty until
 *     someone forks/creates a template into THIS workspace.
 */
export function useWorkspaceTemplates(opts?: {
  kind?: TemplateKind | "all";
  scope?: "inherited" | "workspace";
}) {
  const { workspace } = useWorkspace();
  const kind = opts?.kind ?? "all";
  const scope = opts?.scope ?? "inherited";
  return useQuery({
    queryKey: [
      "workspace-templates",
      workspace?.organization_id ?? null,
      workspace?.id ?? null,
      kind,
      scope,
    ],
    enabled: !!workspace,
    queryFn: async (): Promise<WorkspaceTemplate[]> => {
      let q = supabase
        .from("templates")
        .select(
          "id, organization_id, scope_type, scope_id, kind, name, description, status, content, parent_template_id, current_version, source_type, source_id, metadata, created_at, updated_at",
        )
        .order("updated_at", { ascending: false });
      if (scope === "workspace") {
        q = q.eq("scope_type", "workspace").eq("scope_id", workspace!.id);
      } else {
        q = q.or(`scope_type.eq.platform,organization_id.eq.${workspace!.organization_id}`);
      }
      if (kind !== "all") q = q.eq("kind", kind);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as WorkspaceTemplate[];
    },
  });
}

export function useWorkspaceTemplate(templateId: string | undefined) {
  return useQuery({
    queryKey: ["workspace-template", templateId ?? null],
    enabled: !!templateId,
    queryFn: async (): Promise<WorkspaceTemplate | null> => {
      const { data, error } = await supabase
        .from("templates")
        .select(
          "id, organization_id, scope_type, scope_id, kind, name, description, status, content, parent_template_id, current_version, source_type, source_id, metadata, created_at, updated_at",
        )
        .eq("id", templateId!)
        .maybeSingle();
      if (error) throw error;
      return (data as WorkspaceTemplate | null) ?? null;
    },
  });
}

/**
 * Fork a (typically platform- or org-scoped) template into a workspace-scoped
 * copy under the current organization. Preserves lineage via parent_template_id.
 * The forked copy is a native canonical row — it does NOT carry source_type/id
 * because those uniquely identify mirrored legacy rows.
 */
export function useForkTemplate() {
  const qc = useQueryClient();
  const { workspace } = useWorkspace();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (source: WorkspaceTemplate) => {
      if (!workspace) throw new Error("No workspace");
      const { data, error } = await supabase
        .from("templates")
        .insert({
          organization_id: workspace.organization_id,
          scope_type: "workspace",
          scope_id: workspace.id,
          kind: source.kind,
          name: `${source.name} (fork)`,
          description: source.description,
          status: "draft",
          content: source.content as never,
          parent_template_id: source.id,
          metadata: { forked_from: source.id, forked_at: new Date().toISOString() } as never,
          created_by: user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace-templates"] });
      toast.success("Template forked into workspace");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
