-- Phase 13 — Workspace RBAC enforcement
-- Adds canonical workspace roles required by the spec (supervisor/agent/analyst),
-- two SECURITY DEFINER role-check functions, and tightens RLS on workspace_members
-- and workspaces so workspace owners/admins (not just org admins) can manage them.

-- 1) Extend workspace_role enum with spec-required roles (additive, safe).
ALTER TYPE public.workspace_role ADD VALUE IF NOT EXISTS 'supervisor';
ALTER TYPE public.workspace_role ADD VALUE IF NOT EXISTS 'agent';
ALTER TYPE public.workspace_role ADD VALUE IF NOT EXISTS 'analyst';