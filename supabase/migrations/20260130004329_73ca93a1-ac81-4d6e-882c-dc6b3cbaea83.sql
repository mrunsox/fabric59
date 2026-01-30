-- Drop the overly permissive INSERT policy
DROP POLICY IF EXISTS "Service role can insert notifications" ON public.notifications;

-- The service role bypasses RLS entirely, so no INSERT policy is needed for edge functions.
-- Edge functions using the service_role key will insert notifications directly.
-- This is the secure pattern for server-side inserts.