-- Create notification_channel enum type
CREATE TYPE notification_channel AS ENUM ('slack', 'email', 'sms');

-- Create notification_status enum type
CREATE TYPE notification_status AS ENUM ('sent', 'failed', 'pending');

-- Create notifications table to log all sent notifications
CREATE TABLE public.notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    channel notification_channel NOT NULL DEFAULT 'slack',
    recipient TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',
    status notification_status NOT NULL DEFAULT 'pending',
    response JSONB,
    trigger_event TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add optional Slack fields to tenants table
ALTER TABLE public.tenants 
ADD COLUMN slack_webhook_url TEXT,
ADD COLUMN notification_triggers JSONB DEFAULT '{"intake_created": false, "call_ended": false, "contact_updated": false}'::jsonb;

-- Enable RLS on notifications table
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Ops team can view all notifications (for monitoring/debugging)
CREATE POLICY "Ops team can view all notifications"
ON public.notifications
FOR SELECT
USING (is_ops_member(auth.uid()));

-- Ops team can insert notifications (from edge functions via service role)
CREATE POLICY "Service role can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Create index for faster tenant lookups
CREATE INDEX idx_notifications_tenant_id ON public.notifications(tenant_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_status ON public.notifications(status);