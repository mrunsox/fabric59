
CREATE OR REPLACE FUNCTION public.handle_form_submission_side_effects()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_form_name text;
  v_tenant_id uuid;
BEGIN
  -- Resolve workspace org and form name
  SELECT w.organization_id, f.name
    INTO v_org_id, v_form_name
  FROM public.forms f
  JOIN public.workspaces w ON w.id = f.workspace_id
  WHERE f.id = NEW.form_id;

  -- Resolve tenant from campaign if available
  IF NEW.campaign_id IS NOT NULL THEN
    SELECT c.client_id INTO v_tenant_id
    FROM public.campaigns c
    WHERE c.id = NEW.campaign_id;

    -- Auto-create the form/campaign assignment if missing
    INSERT INTO public.form_campaign_assignments (workspace_id, form_id, campaign_id, created_by)
    VALUES (NEW.workspace_id, NEW.form_id, NEW.campaign_id, NEW.submitted_by)
    ON CONFLICT (form_id, campaign_id) DO NOTHING;
  END IF;

  -- Write to api_logs
  INSERT INTO public.api_logs (tenant_id, endpoint, method, request_payload, response, status)
  VALUES (
    v_tenant_id,
    '/forms/' || NEW.form_id::text || '/submissions',
    'POST',
    jsonb_build_object(
      'form_id', NEW.form_id,
      'form_version', NEW.form_version,
      'campaign_id', NEW.campaign_id,
      'source', NEW.source,
      'payload', NEW.payload,
      'mapped', NEW.mapped
    ),
    jsonb_build_object('submission_id', NEW.id, 'submitted_at', NEW.submitted_at),
    'success'
  );

  -- Record interaction outcome as a platform event
  IF v_org_id IS NOT NULL THEN
    INSERT INTO public.platform_events (organization_id, event_type, payload, source, correlation_id)
    VALUES (
      v_org_id,
      'form.submitted',
      jsonb_build_object(
        'form_id', NEW.form_id,
        'form_name', v_form_name,
        'form_version', NEW.form_version,
        'workspace_id', NEW.workspace_id,
        'campaign_id', NEW.campaign_id,
        'tenant_id', v_tenant_id,
        'source', NEW.source,
        'submission_id', NEW.id,
        'mapped', NEW.mapped
      ),
      COALESCE(NEW.source, 'form'),
      NEW.id::text
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS form_submissions_side_effects ON public.form_submissions;
CREATE TRIGGER form_submissions_side_effects
AFTER INSERT ON public.form_submissions
FOR EACH ROW EXECUTE FUNCTION public.handle_form_submission_side_effects();
