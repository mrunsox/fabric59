-- ============================================================
-- Phase 10 — AI knowledge layer & workspace intelligence
-- ============================================================

-- 1) Workspace AI configuration (one row per workspace)
CREATE TABLE IF NOT EXISTS public.workspace_ai_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL UNIQUE REFERENCES public.workspaces(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  knowledge_only BOOLEAN NOT NULL DEFAULT false,
  tone TEXT NOT NULL DEFAULT 'professional',
  industry TEXT,
  jurisdiction TEXT,
  terminology JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_preference TEXT NOT NULL DEFAULT 'balanced',
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.workspace_ai_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "AI config readable by workspace members"
  ON public.workspace_ai_configs FOR SELECT TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id) OR is_master_admin(auth.uid()));

CREATE POLICY "AI config managed by org admins"
  ON public.workspace_ai_configs FOR ALL TO authenticated
  USING (
    is_master_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_ai_configs.workspace_id
        AND is_org_owner_or_admin(auth.uid(), w.organization_id)
    )
  )
  WITH CHECK (
    is_master_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_ai_configs.workspace_id
        AND is_org_owner_or_admin(auth.uid(), w.organization_id)
    )
  );

CREATE TRIGGER workspace_ai_configs_set_updated_at
  BEFORE UPDATE ON public.workspace_ai_configs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2) Per-workspace knowledge source registry
CREATE TABLE IF NOT EXISTS public.workspace_knowledge_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  last_indexed_at TIMESTAMPTZ,
  item_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ok',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, source_type)
);

ALTER TABLE public.workspace_knowledge_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Knowledge sources readable by workspace members"
  ON public.workspace_knowledge_sources FOR SELECT TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id) OR is_master_admin(auth.uid()));

CREATE POLICY "Knowledge sources managed by org admins"
  ON public.workspace_knowledge_sources FOR ALL TO authenticated
  USING (
    is_master_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_knowledge_sources.workspace_id
        AND is_org_owner_or_admin(auth.uid(), w.organization_id)
    )
  )
  WITH CHECK (
    is_master_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_knowledge_sources.workspace_id
        AND is_org_owner_or_admin(auth.uid(), w.organization_id)
    )
  );

CREATE TRIGGER workspace_knowledge_sources_set_updated_at
  BEFORE UPDATE ON public.workspace_knowledge_sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3) Workspace assistant conversations
CREATE TABLE IF NOT EXISTS public.workspace_ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New conversation',
  started_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workspace_ai_conversations_ws_idx
  ON public.workspace_ai_conversations (workspace_id, updated_at DESC);

ALTER TABLE public.workspace_ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "AI conversations readable by workspace members"
  ON public.workspace_ai_conversations FOR SELECT TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id) OR is_master_admin(auth.uid()));

CREATE POLICY "AI conversations created by workspace members"
  ON public.workspace_ai_conversations FOR INSERT TO authenticated
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

CREATE POLICY "AI conversations updated by author or org admin"
  ON public.workspace_ai_conversations FOR UPDATE TO authenticated
  USING (
    started_by = auth.uid()
    OR is_master_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_ai_conversations.workspace_id
        AND is_org_owner_or_admin(auth.uid(), w.organization_id)
    )
  );

CREATE POLICY "AI conversations deletable by author or org admin"
  ON public.workspace_ai_conversations FOR DELETE TO authenticated
  USING (
    started_by = auth.uid()
    OR is_master_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_ai_conversations.workspace_id
        AND is_org_owner_or_admin(auth.uid(), w.organization_id)
    )
  );

CREATE TRIGGER workspace_ai_conversations_set_updated_at
  BEFORE UPDATE ON public.workspace_ai_conversations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4) Assistant messages (per conversation)
CREATE TABLE IF NOT EXISTS public.workspace_ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.workspace_ai_conversations(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  grounding JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workspace_ai_messages_conv_idx
  ON public.workspace_ai_messages (conversation_id, created_at);

ALTER TABLE public.workspace_ai_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "AI messages readable by workspace members"
  ON public.workspace_ai_messages FOR SELECT TO authenticated
  USING (is_workspace_member(auth.uid(), workspace_id) OR is_master_admin(auth.uid()));

CREATE POLICY "AI messages created by workspace members"
  ON public.workspace_ai_messages FOR INSERT TO authenticated
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

-- 5) AI interaction audit log
CREATE TABLE IF NOT EXISTS public.workspace_ai_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  surface TEXT NOT NULL,
  action TEXT NOT NULL,
  user_id UUID,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workspace_ai_logs_ws_idx
  ON public.workspace_ai_logs (workspace_id, created_at DESC);

ALTER TABLE public.workspace_ai_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "AI logs readable by org admins"
  ON public.workspace_ai_logs FOR SELECT TO authenticated
  USING (
    is_master_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.workspaces w
      WHERE w.id = workspace_ai_logs.workspace_id
        AND is_org_owner_or_admin(auth.uid(), w.organization_id)
    )
  );

CREATE POLICY "AI logs writable by workspace members"
  ON public.workspace_ai_logs FOR INSERT TO authenticated
  WITH CHECK (is_workspace_member(auth.uid(), workspace_id));

-- 6) Seed default knowledge sources for existing workspaces
INSERT INTO public.workspace_knowledge_sources (workspace_id, source_type, enabled, status)
SELECT w.id, st.source_type, st.enabled, 'ok'
FROM public.workspaces w
CROSS JOIN (VALUES
  ('kb_articles', true),
  ('guides', true),
  ('templates', true),
  ('call_summaries', true),
  ('call_outcomes', true),
  ('uploads', false),
  ('urls', false)
) AS st(source_type, enabled)
ON CONFLICT (workspace_id, source_type) DO NOTHING;

-- 7) Seed default AI config for existing workspaces
INSERT INTO public.workspace_ai_configs (workspace_id)
SELECT id FROM public.workspaces
ON CONFLICT (workspace_id) DO NOTHING;

-- 8) Auto-seed AI config + knowledge sources for new workspaces
CREATE OR REPLACE FUNCTION public.seed_workspace_ai_defaults()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.workspace_ai_configs (workspace_id)
    VALUES (NEW.id)
    ON CONFLICT (workspace_id) DO NOTHING;

  INSERT INTO public.workspace_knowledge_sources (workspace_id, source_type, enabled, status)
  VALUES
    (NEW.id, 'kb_articles', true, 'ok'),
    (NEW.id, 'guides', true, 'ok'),
    (NEW.id, 'templates', true, 'ok'),
    (NEW.id, 'call_summaries', true, 'ok'),
    (NEW.id, 'call_outcomes', true, 'ok'),
    (NEW.id, 'uploads', false, 'ok'),
    (NEW.id, 'urls', false, 'ok')
  ON CONFLICT (workspace_id, source_type) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS workspaces_seed_ai_defaults ON public.workspaces;
CREATE TRIGGER workspaces_seed_ai_defaults
  AFTER INSERT ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.seed_workspace_ai_defaults();
