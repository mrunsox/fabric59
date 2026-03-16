
-- Add documents column to campaign_blueprints
ALTER TABLE public.campaign_blueprints
ADD COLUMN IF NOT EXISTS documents jsonb DEFAULT '[]'::jsonb;

-- Create blueprint-documents storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('blueprint-documents', 'blueprint-documents', false)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for blueprint-documents bucket
CREATE POLICY "Authenticated users can upload blueprint docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'blueprint-documents');

CREATE POLICY "Authenticated users can read blueprint docs"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'blueprint-documents');

CREATE POLICY "Authenticated users can delete blueprint docs"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'blueprint-documents');
