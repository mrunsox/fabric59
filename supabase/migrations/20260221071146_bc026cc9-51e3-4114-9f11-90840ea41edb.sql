
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS stripe_api_key text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS quickbooks_api_key text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS calendly_api_key text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS docusign_api_key text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS dropbox_api_key text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS microsoft365_api_key text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS asana_api_key text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS openai_api_key text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS power_automate_webhook_url text;
