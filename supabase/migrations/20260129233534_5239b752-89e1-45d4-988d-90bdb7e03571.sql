-- Fix the overly permissive INSERT policy on api_logs
-- Drop the existing permissive policy
DROP POLICY IF EXISTS "System can insert logs" ON public.api_logs;

-- Create a more restrictive policy - only ops team members can insert logs
-- In production, edge functions will use service role key which bypasses RLS
CREATE POLICY "Ops team can insert logs"
ON public.api_logs FOR INSERT
TO authenticated
WITH CHECK (public.is_ops_member(auth.uid()));