/**
 * Phase 6 · runner session hook.
 *
 * Owns the in-memory session state plus localStorage hydration. Exposes minimal
 * setters so the FlowPanel / CopilotPanel never need to know about persistence.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CallSessionMeta, CallSessionState } from "@/types/call-runner";
import { emptySession, loadSession, saveSession, clearSession } from "@/lib/call-runner/session-store";

export interface UseCallRunnerSessionResult {
  session: CallSessionState;
  resumed: boolean;
  setCurrentStepId: (id: string | null) => void;
  setValue: (key: string, value: unknown) => void;
  patchValues: (partial: Record<string, unknown>) => void;
  pushCompleted: (id: string) => void;
  setNotes: (notes: string) => void;
  markFinalized: () => void;
  reset: () => void;
}

export function useCallRunnerSession(meta: CallSessionMeta): UseCallRunnerSessionResult {
  const metaRef = useRef(meta);
  metaRef.current = meta;

  // Hydrate from localStorage exactly once per (workspace, campaign, call).
  const [session, setSession] = useState<CallSessionState>(() => loadSession(meta) ?? emptySession(meta));
  const [resumed] = useState<boolean>(() => loadSession(meta) !== null);

  // Debounced persist on each change.
  useEffect(() => {
    const t = setTimeout(() => saveSession(session), 200);
    return () => clearTimeout(t);
  }, [session]);

  const setCurrentStepId = useCallback((id: string | null) => {
    setSession((s) => ({ ...s, currentStepId: id }));
  }, []);

  const setValue = useCallback((key: string, value: unknown) => {
    setSession((s) => ({ ...s, values: { ...s.values, [key]: value } }));
  }, []);

  const patchValues = useCallback((partial: Record<string, unknown>) => {
    setSession((s) => ({ ...s, values: { ...s.values, ...partial } }));
  }, []);

  const pushCompleted = useCallback((id: string) => {
    setSession((s) =>
      s.completedStepIds.includes(id) ? s : { ...s, completedStepIds: [...s.completedStepIds, id] },
    );
  }, []);

  const setNotes = useCallback((notes: string) => {
    setSession((s) => ({ ...s, notes }));
  }, []);

  const markFinalized = useCallback(() => {
    setSession((s) => ({ ...s, finalized: true, updatedAt: new Date().toISOString() }));
  }, []);

  const reset = useCallback(() => {
    clearSession(metaRef.current);
    setSession(emptySession(metaRef.current));
  }, []);

  return useMemo(
    () => ({ session, resumed, setCurrentStepId, setValue, patchValues, pushCompleted, setNotes, markFinalized, reset }),
    [session, resumed, setCurrentStepId, setValue, patchValues, pushCompleted, setNotes, markFinalized, reset],
  );
}
