/**
 * ASC Slice 1 — draft persistence hook.
 *
 * Slice 1 is front-end only: drafts persist to localStorage keyed by
 * workspace + draft id. There is no DB write in this slice; the canonical
 * Phase 2 plan keeps drafts inside `campaign_setups.intake_data.ascDraft`,
 * and that wiring lands when the orchestration boundary ships in Slice 2.
 *
 * No new persisted state values are introduced. The handoff-to-manual path
 * simply navigates with `?seedFromAsc=<id>` and leaves `state` unchanged.
 */
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { ascReducer } from "@/lib/asc/reducer";
import { createEmptyAscDraft } from "@/lib/asc/fixtures";
import type { AscDraft } from "@/lib/asc/types";
import type { AscAction } from "@/lib/asc/actions";

const STORAGE_PREFIX = "fabric59.asc.draft.";

function storageKey(workspaceId: string, draftId: string) {
  return `${STORAGE_PREFIX}${workspaceId}.${draftId}`;
}

function readDraft(workspaceId: string, draftId: string): AscDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(workspaceId, draftId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AscDraft;
    if (parsed?.schemaVersion !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeDraft(draft: AscDraft) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      storageKey(draft.workspaceId, draft.id),
      JSON.stringify(draft),
    );
  } catch {
    // ignore quota / privacy-mode errors
  }
}

export type AscAutosaveStatus = "idle" | "saving" | "saved" | "error";

export interface UseAscDraftResult {
  draft: AscDraft;
  dispatch: (action: AscAction) => void;
  autosaveStatus: AscAutosaveStatus;
  lastSavedAt: string | null;
  handoffToManual: (workspaceId: string) => string;
}

export function useAscDraft(params: {
  workspaceId: string;
  draftId: string;
  createdBy: string;
  skinId?: string;
  autosaveDebounceMs?: number;
}): UseAscDraftResult {
  const { workspaceId, draftId, createdBy, skinId } = params;
  const debounceMs = params.autosaveDebounceMs ?? 800;

  const initial = useMemo<AscDraft>(() => {
    const persisted = readDraft(workspaceId, draftId);
    if (persisted) return persisted;
    return createEmptyAscDraft({
      id: draftId,
      workspaceId,
      createdBy,
      skinId,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, draftId]);

  const [draft, dispatch] = useReducer(ascReducer, initial);
  const [status, setStatus] = useState<AscAutosaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setStatus("saving");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        writeDraft(draft);
        const now = new Date().toISOString();
        setLastSavedAt(now);
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    }, debounceMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [draft, debounceMs]);

  const handoffToManual = useCallback(
    (wsId: string) => {
      // Slice 1: no new persisted state values. We keep `state` as is and let
      // the manual page surface the seed param when wiring lands later.
      return `/w/${wsId}/campaigns/new/manual?seedFromAsc=${encodeURIComponent(
        draft.id,
      )}`;
    },
    [draft.id],
  );

  return { draft, dispatch, autosaveStatus: status, lastSavedAt, handoffToManual };
}
