/**
 * Business Brain — React Query hooks (Slice 1).
 *
 * Scope:
 *   - List sources, extractions, facts for the active workspace.
 *   - Create a paste-text / paste-faq source and kick off extraction.
 *   - Upload a doc to the `business-brain-sources` storage bucket and kick
 *     off extraction.
 *   - Approve / reject extraction; approve supports explicit merge into an
 *     existing fact.
 *
 * All mutations emit `bb_*` telemetry. Failures surface as `toast.error`.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { emitBbEvent } from "@/lib/business-brain/telemetry";
import type {
  BbEntityType,
  BbReviewStatus,
  BbSourceKind,
  BbSourceStatus,
} from "@/lib/business-brain/types";

export interface BbSourceRow {
  id: string;
  workspace_id: string;
  client_id: string | null;
  kind: BbSourceKind;
  title: string;
  uri: string | null;
  content_hash: string | null;
  version: number;
  prior_source_id: string | null;
  status: BbSourceStatus;
  status_message: string | null;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  processed_at: string | null;
}

export interface BbExtractionRow {
  id: string;
  workspace_id: string;
  source_id: string;
  chunk_id: string | null;
  entity_type: BbEntityType;
  payload: Record<string, unknown>;
  snippet: string | null;
  confidence: number;
  review_status: BbReviewStatus;
  reviewer_id: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  approved_fact_id: string | null;
  extraction_metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface BbFactRow {
  id: string;
  workspace_id: string;
  client_id: string | null;
  entity_type: BbEntityType;
  canonical_key: string;
  display_name: string;
  payload: Record<string, unknown>;
  confidence_at_review: number | null;
  verification_state: "approved" | "needs_review" | "stale";
  source_refs: Array<{ source_id: string; extraction_id: string | null; snippet: string | null }>;
  superseded_by: string | null;
  notes: string | null;
  last_reviewed_at: string;
  last_reviewed_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useBbSources(workspaceId: string | null) {
  return useQuery({
    queryKey: ["bb_sources", workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<BbSourceRow[]> => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("bb_sources" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as BbSourceRow[];
    },
  });
}

export function useBbExtractions(workspaceId: string | null) {
  return useQuery({
    queryKey: ["bb_extractions", workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<BbExtractionRow[]> => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("bb_extractions" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as BbExtractionRow[];
    },
  });
}

export function useBbFacts(workspaceId: string | null) {
  return useQuery({
    queryKey: ["bb_facts", workspaceId],
    enabled: !!workspaceId,
    queryFn: async (): Promise<BbFactRow[]> => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("bb_facts" as any)
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as BbFactRow[];
    },
  });
}

async function sha256Hex(input: string): Promise<string> {
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const bytes = new TextEncoder().encode(input);
    const buf = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  // Fallback: rough hash. Not cryptographic; only used in non-browser tests.
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return String(h >>> 0);
}

export interface IngestPasteInput {
  workspaceId: string;
  clientId?: string | null;
  title: string;
  text: string;
  kind: "paste_text" | "paste_faq";
}

export function useBbIngestPaste() {
  const qc = useQueryClient();
  const { organization } = useAuth();
  return useMutation({
    mutationFn: async (input: IngestPasteInput) => {
      const hash = await sha256Hex(input.text);
      // Idempotency: same workspace + hash → reuse source.
      const { data: existing } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("bb_sources" as any)
        .select("id")
        .eq("workspace_id", input.workspaceId)
        .eq("content_hash", hash)
        .maybeSingle();
      if (existing && (existing as { id: string }).id) {
        return { id: (existing as { id: string }).id, reused: true };
      }

      const { data, error } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("bb_sources" as any)
        .insert([
          {
            workspace_id: input.workspaceId,
            client_id: input.clientId ?? null,
            kind: input.kind,
            title: input.title,
            content_hash: hash,
            metadata: { byteLength: input.text.length, inline: true },
          },
        ])
        .select("id")
        .single();
      if (error) throw error;
      const sourceId = (data as { id: string }).id;
      emitBbEvent("bb_source_added", {
        workspaceId: input.workspaceId,
        organizationId: organization?.id ?? null,
        sourceId,
      });
      const { error: fnErr } = await supabase.functions.invoke("bb-ingest", {
        body: { sourceId, text: input.text, kind: input.kind },
      });
      if (fnErr) {
        emitBbEvent("bb_source_failed", {
          workspaceId: input.workspaceId,
          organizationId: organization?.id ?? null,
          sourceId,
          errorCode: "ingest_invoke_failed",
        });
        throw fnErr;
      }
      return { id: sourceId, reused: false };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bb_sources"] });
      qc.invalidateQueries({ queryKey: ["bb_extractions"] });
      toast.success("Source ingested. Extraction running.");
    },
    onError: (e: Error) => toast.error(e.message || "Ingest failed"),
  });
}

export interface IngestUploadInput {
  workspaceId: string;
  clientId?: string | null;
  file: File;
}

export function useBbIngestUpload() {
  const qc = useQueryClient();
  const { organization } = useAuth();
  return useMutation({
    mutationFn: async (input: IngestUploadInput) => {
      const path = `${input.workspaceId}/${crypto.randomUUID()}-${input.file.name}`;
      const { error: upErr } = await supabase.storage
        .from("business-brain-sources")
        .upload(path, input.file, { upsert: false });
      if (upErr) throw upErr;

      // Best-effort text extraction client-side for plain-text-ish files.
      // PDF/DOCX text extraction lives on the edge function side in P1
      // Slice 2 — for Slice 1 we ingest as-is and let the edge function
      // skip extraction when content is non-text. The file remains stored
      // for re-processing later.
      let text = "";
      try {
        text = await input.file.text();
      } catch {
        text = "";
      }
      const hash = await sha256Hex(text || path);

      const { data, error } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("bb_sources" as any)
        .insert([
          {
            workspace_id: input.workspaceId,
            client_id: input.clientId ?? null,
            kind: "upload_doc",
            title: input.file.name,
            uri: path,
            content_hash: hash,
            metadata: {
              byteLength: input.file.size,
              mimeType: input.file.type,
            },
          },
        ])
        .select("id")
        .single();
      if (error) throw error;
      const sourceId = (data as { id: string }).id;
      emitBbEvent("bb_source_added", {
        workspaceId: input.workspaceId,
        organizationId: organization?.id ?? null,
        sourceId,
      });
      const { error: fnErr } = await supabase.functions.invoke("bb-ingest", {
        body: { sourceId, text, kind: "upload_doc" },
      });
      if (fnErr) {
        emitBbEvent("bb_source_failed", {
          workspaceId: input.workspaceId,
          organizationId: organization?.id ?? null,
          sourceId,
          errorCode: "ingest_invoke_failed",
        });
        throw fnErr;
      }
      return { id: sourceId };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bb_sources"] });
      qc.invalidateQueries({ queryKey: ["bb_extractions"] });
      toast.success("File uploaded. Extraction running.");
    },
    onError: (e: Error) => toast.error(e.message || "Upload failed"),
  });
}

export interface ApproveInput {
  extractionId: string;
  workspaceId: string;
  /** Optional edits to the payload before promotion. */
  payloadOverride?: Record<string, unknown>;
  /** Explicit merge target. When set, no new fact is created. */
  mergeIntoFactId?: string;
}

export function useBbApproveExtraction() {
  const qc = useQueryClient();
  const { organization } = useAuth();
  return useMutation({
    mutationFn: async (input: ApproveInput) => {
      const { data, error } = await supabase.functions.invoke("bb-approve-fact", {
        body: {
          extractionId: input.extractionId,
          payloadOverride: input.payloadOverride ?? null,
          mergeIntoFactId: input.mergeIntoFactId ?? null,
        },
      });
      if (error) throw error;
      const result = data as { factId: string; merged: boolean };
      emitBbEvent(input.mergeIntoFactId ? "bb_fact_merged" : "bb_fact_approved", {
        workspaceId: input.workspaceId,
        organizationId: organization?.id ?? null,
        extractionId: input.extractionId,
        factId: result.factId,
      });
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bb_extractions"] });
      qc.invalidateQueries({ queryKey: ["bb_facts"] });
      toast.success("Approved into knowledge.");
    },
    onError: (e: Error) => toast.error(e.message || "Approve failed"),
  });
}

export function useBbRejectExtraction() {
  const qc = useQueryClient();
  const { organization } = useAuth();
  return useMutation({
    mutationFn: async (input: { extractionId: string; workspaceId: string; reason?: string }) => {
      const { error } = await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("bb_extractions" as any)
        .update({
          review_status: "rejected",
          reviewed_at: new Date().toISOString(),
          review_notes: input.reason ?? null,
        })
        .eq("id", input.extractionId);
      if (error) throw error;
      await supabase
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("bb_review_events" as any)
        .insert([
          {
            workspace_id: input.workspaceId,
            extraction_id: input.extractionId,
            action: "reject",
            notes: input.reason ?? null,
          },
        ]);
      emitBbEvent("bb_fact_rejected", {
        workspaceId: input.workspaceId,
        organizationId: organization?.id ?? null,
        extractionId: input.extractionId,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["bb_extractions"] });
      toast.success("Suggestion rejected.");
    },
    onError: (e: Error) => toast.error(e.message || "Reject failed"),
  });
}
