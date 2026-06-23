/**
 * Phase 7A — Read helpers for call_session_snapshots.
 *
 * Single contract for future consumers (Phase 7B and beyond). RLS enforces
 * workspace scoping; these helpers exist to keep the JSON contract centralized.
 */

import { supabase } from "@/integrations/supabase/client";
import type { CallSessionSnapshotV1 } from "./snapshotContract";

export interface SnapshotRecord {
  id: string;
  call_session_id: string;
  workspace_id: string;
  campaign_id: string | null;
  version: number;
  source: string;
  snapshot: CallSessionSnapshotV1;
  metadata: Record<string, unknown>;
  created_at: string;
}

export async function getLatestSnapshotForSession(
  callSessionId: string,
): Promise<SnapshotRecord | null> {
  const { data, error } = await supabase
    .from("call_session_snapshots" as never)
    .select("*")
    .eq("call_session_id", callSessionId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as SnapshotRecord | null) ?? null;
}

export async function listRecentSnapshotsForWorkspace(
  workspaceId: string,
  opts: { limit?: number; since?: string } = {},
): Promise<SnapshotRecord[]> {
  let q = supabase
    .from("call_session_snapshots" as never)
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(Math.max(1, Math.min(opts.limit ?? 50, 200)));
  if (opts.since) q = q.gte("created_at", opts.since);
  const { data, error } = await q;
  if (error) throw error;
  return (data as SnapshotRecord[] | null) ?? [];
}
