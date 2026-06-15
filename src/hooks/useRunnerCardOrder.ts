import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * Persists per-agent ordering of the runner's stacked side cards.
 *
 * Keyed by user (when supplied), workspace, campaign, and an optional surface
 * label so internal runner and embed runner do not collide.
 *
 * - Stored orders are validated against the current known card ids on read:
 *   unknown ids are dropped, and any new ids the agent has not seen yet are
 *   appended at the end so newly-added cards surface without manual reset.
 * - Returns `{ order, setOrder, reset, isCustom }`.
 */
export function useRunnerCardOrder(params: {
  knownIds: readonly string[];
  workspaceId?: string | null;
  campaignId?: string | null;
  userId?: string | null;
  surface?: string;
}) {
  const { knownIds, workspaceId, campaignId, userId, surface = "main" } = params;

  const storageKey = useMemo(
    () =>
      `fabric59:runner:rightStack:v1:${surface}:${userId ?? "anon"}:${
        workspaceId ?? "_"
      }:${campaignId ?? "_"}`,
    [surface, userId, workspaceId, campaignId],
  );

  const known = useMemo(() => Array.from(knownIds), [knownIds]);

  const reconcile = useCallback(
    (raw: unknown): string[] => {
      const stored = Array.isArray(raw) ? (raw.filter((x) => typeof x === "string") as string[]) : [];
      const filtered = stored.filter((id) => known.includes(id));
      const missing = known.filter((id) => !filtered.includes(id));
      return [...filtered, ...missing];
    },
    [known],
  );

  const [order, setOrderState] = useState<string[]>(() => {
    if (typeof window === "undefined") return [...known];
    try {
      const raw = window.localStorage.getItem(storageKey);
      return reconcile(raw ? JSON.parse(raw) : null);
    } catch {
      return [...known];
    }
  });

  // Re-reconcile when the key or the known set changes.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      setOrderState(reconcile(raw ? JSON.parse(raw) : null));
    } catch {
      setOrderState([...known]);
    }
  }, [storageKey, reconcile, known]);

  const setOrder = useCallback(
    (next: string[]) => {
      const cleaned = reconcile(next);
      setOrderState(cleaned);
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(cleaned));
      } catch {
        /* ignore quota / disabled storage */
      }
    },
    [storageKey, reconcile],
  );

  const reset = useCallback(() => {
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
    setOrderState([...known]);
  }, [storageKey, known]);

  const isCustom = useMemo(
    () => order.length === known.length && order.some((id, i) => id !== known[i]),
    [order, known],
  );

  return { order, setOrder, reset, isCustom };
}
