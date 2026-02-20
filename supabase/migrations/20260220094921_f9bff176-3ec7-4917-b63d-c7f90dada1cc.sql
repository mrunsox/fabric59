
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS brand_name text,
  ADD COLUMN IF NOT EXISTS brand_logo_url text,
  ADD COLUMN IF NOT EXISTS brand_primary_color text,
  ADD COLUMN IF NOT EXISTS brand_from_email text,
  ADD COLUMN IF NOT EXISTS brand_reply_to text;
