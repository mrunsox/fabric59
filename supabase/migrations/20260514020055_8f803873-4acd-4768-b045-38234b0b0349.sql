-- Add workspace_id to deployment_runs and agents for workspace-strict filtering.
-- Nullable + ON DELETE SET NULL so existing org-scoped rows remain visible until backfilled.

ALTER TABLE public.deployment_runs
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_deployment_runs_workspace
  ON public.deployment_runs(workspace_id, started_at DESC);

-- Backfill from deployments.owner_scope_id where the deployment was scoped to a workspace.
UPDATE public.deployment_runs r
SET workspace_id = d.owner_scope_id
FROM public.deployments d
WHERE r.deployment_id = d.id
  AND r.workspace_id IS NULL
  AND d.owner_scope_type = 'workspace'
  AND d.owner_scope_id IS NOT NULL;

-- Backfill remaining rows to the org's default workspace when one exists.
UPDATE public.deployment_runs r
SET workspace_id = w.id
FROM public.workspaces w
WHERE r.workspace_id IS NULL
  AND w.organization_id = r.organization_id
  AND w.is_default = true;

ALTER TABLE public.agents
  ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_agents_workspace ON public.agents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_agents_org ON public.agents(organization_id);
