-- Add webhook URL columns for automation platforms
ALTER TABLE public.tenants
ADD COLUMN zapier_webhook_url text,
ADD COLUMN make_webhook_url text,
ADD COLUMN pabbly_webhook_url text,
ADD COLUMN n8n_webhook_url text;

-- Add new values to notification_channel enum
ALTER TYPE notification_channel ADD VALUE IF NOT EXISTS 'zapier';
ALTER TYPE notification_channel ADD VALUE IF NOT EXISTS 'make';
ALTER TYPE notification_channel ADD VALUE IF NOT EXISTS 'pabbly';
ALTER TYPE notification_channel ADD VALUE IF NOT EXISTS 'n8n';
ALTER TYPE notification_channel ADD VALUE IF NOT EXISTS 'webhook';