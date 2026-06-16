/**
 * ASC Slice 2 — draft persistence hook (Supabase-backed).
 *
 * Persistence model:
 *   - Drafts live inside `campaign_setups.intake_data.ascDraft` (Phase 2
 *     contract). The row is created LAZILY on the first successful autosave
 *     — never on mount — to avoid polluting `campaign_setups` with abandoned
 *     drafts. Once the row exists, subsequent autosaves update by id.
 *   - `intake_data.source = "asc-wizard"` is set on every write so that
 *     dashboards, list views, and analytics can filter ASC drafts out of
 *     normal campaign rollups (see `useCampaignSetups` for the canonical
 *     filter; additional surfaces may need a follow-up filter pass).
 *   - The campaign row is named "Untitled ASC draft" only as an internal
 *     scaffold; the name is overwritten with `business.description` (first
 *     ~60 chars) as soon as the user types anything in Step 1, so the
 *     placeholder rarely escapes into visible naming surfaces.
 *
 * The full `AscDraft` (including front-end bookkeeping fields — id,
 * workspaceId, step, stepStatus, schemaVersion) rides along in
 * `intake_data.ascDraft`. The Phase 2 contract is untouched.
 */
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ascReducer } from "@/lib/asc/reducer";
import { createEmptyAscDraft } from "@/lib/asc/fixtures";
import type { AscDraft } from "@/lib/asc/types";
import type { AscAction } from "@/lib/asc/actions";

export type AscAutosaveStatus = "idle" | "saving" | "saved" | "error";

const SCAFFOLD_NAME = "Untitled ASC draft";

export interface UseAscDraftResult {
  draft: AscDraft;
  setupId: string | null;
  dispatch: (action: AscAction) => void;
  autosaveStatus: AscAutosaveStatus;
  lastSavedAt: string | null;
  handoffToManual: (workspaceId: string) => string;
}

function makeDraftId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `asc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function deriveCampaignName(draft: AscDraft): string {
  const desc = draft.input?.business?.description?.trim();
  if (desc && desc.length > 0) {
    return desc.length > 60 ? `${desc.slice(0, 57)}…` : desc;
  }
  return SCAFFOLD_NAME;
}

function buildIntakePayload(
  draft: AscDraft,
  existing?: Record<string, unknown> | null,
): Record<string, unknown> {
  const base = (existing && typeof existing === "object" ? existing : {}) as Record<
    string,
    unknown
  >;
  return {
    ...base,
    source: "asc-wizard",
    ascDraft: JSON.parse(JSON.stringify(draft)) as Record<string, unknown>,
  };
}

export function useAscDraft(params: {
  workspaceId: string;
  createdBy: string;
  skinId?: string;
  existingSetupId?: string | null;
  autosaveDebounceMs?: number;
  /**
   * Fires when a fresh `campaign_setups` row is created on the first
   * autosave; lets the host page mirror `?setupId=` into the URL so a
   * refresh resumes against the same row.
   */
  onSetupIdAssigned?: (setupId: string) => void;
}): UseAscDraftResult {
  const { workspaceId, createdBy, skinId, existingSetupId, onSetupIdAssigned } =
    params;
  const debounceMs = params.autosaveDebounceMs ?? 800;
  const { organization, user } = useAuth();

  const seededDraftId = useMemo(() => existingSetupId ?? makeDraftId(), [existingSetupId]);

  const initial = useMemo<AscDraft>(
    () =>
      createEmptyAscDraft({
        id: seededDraftId,
        workspaceId,
        createdBy,
        skinId,
      }),
    [seededDraftId, workspaceId, createdBy, skinId],
  );

  const [draft, dispatch] = useReducer(ascReducer, initial);
  const [setupId, setSetupId] = useState<string | null>(existingSetupId ?? null);
  const [status, setStatus] = useState<AscAutosaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState<boolean>(!existingSetupId);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipNextAutosave = useRef<boolean>(true);
  const existingIntakeRef = useRef<Record<string, unknown> | null>(null);

  // Hydrate from an existing campaign_setups row when resuming.
  useEffect(() => {
    if (!existingSetupId) {
      setHydrated(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("campaign_setups")
          .select("*")
          .eq("id", existingSetupId)
          .maybeSingle();
        if (cancelled) return;
        if (error) {
          setStatus("error");
          setHydrated(true);
          return;
        }
        const intake = (data?.intake_data ?? null) as Record<string, unknown> | null;
        existingIntakeRef.current = intake;
        const asc = intake?.ascDraft as AscDraft | undefined;
        if (asc && asc.schemaVersion === 1) {
          skipNextAutosave.current = true;
          dispatch({ type: "INIT_DRAFT", draft: asc });
        }
        if (data?.id) setSetupId(data.id);
      } catch {
        if (!cancelled) setStatus("error");
      } finally {
        if (!cancelled) setHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [existingSetupId]);

  // Debounced autosave: lazy insert, then update by id.
  useEffect(() => {
    if (!hydrated) return;
    if (skipNextAutosave.current) {
      skipNextAutosave.current = false;
      return;
    }
    setStatus("saving");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const intakeData = buildIntakePayload(draft, existingIntakeRef.current);
        const campaignName = deriveCampaignName(draft);

        if (setupId === null) {
          if (!organization?.id) {
            // Without an org we cannot insert; keep retrying once an org loads.
            setStatus("error");
            return;
          }
          const { data, error } = await supabase
            .from("campaign_setups")
            .insert({
              organization_id: organization.id,
              campaign_name: campaignName,
              client_name: "",
              status: "draft",
              priority: "normal",
              intake_data: intakeData,
              checklist_state: {},
              created_by: user?.id ?? createdBy ?? null,
            })
            .select("id, intake_data")
            .single();
          if (error) throw error;
          existingIntakeRef.current = (data?.intake_data ?? intakeData) as Record<
            string,
            unknown
          >;
          if (data?.id) {
            setSetupId(data.id);
            onSetupIdAssigned?.(data.id);
          }
        } else {
          const updatePayload: Record<string, unknown> = {
            intake_data: intakeData,
          };
          // Keep campaign_name in step with the user's first identifying input
          // so the scaffold "Untitled ASC draft" rarely shows up in lists.
          updatePayload.campaign_name = campaignName;
          const { error } = await supabase
            .from("campaign_setups")
            .update(updatePayload)
            .eq("id", setupId);
          if (error) throw error;
          existingIntakeRef.current = intakeData;
        }

        setLastSavedAt(new Date().toISOString());
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    }, debounceMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // organization/user are stable across the wizard session; we deliberately
    // omit them to avoid re-firing autosave when AuthContext re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, hydrated, setupId, debounceMs]);

  const handoffToManual = useCallback(
    (wsId: string) => {
      const seed = setupId ?? draft.id;
      return `/w/${wsId}/campaigns/new/manual?seedFromAsc=${encodeURIComponent(seed)}`;
    },
    [draft.id, setupId],
  );

  return {
    draft,
    setupId,
    dispatch,
    autosaveStatus: status,
    lastSavedAt,
    handoffToManual,
  };
}
