
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS teams_webhook_url text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS twilio_account_sid text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS twilio_auth_token text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS twilio_from_number text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS zoom_api_key text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS google_calendar_id text;

ALTER TYPE crm_type ADD VALUE IF NOT EXISTS 'hubspot';
ALTER TYPE crm_type ADD VALUE IF NOT EXISTS 'zendesk';
