/**
 * Memoized resource-evaluation hook.
 *
 * Re-runs the deterministic rule engine whenever the config or context
 * changes. Pure derived state — no I/O.
 */
import { useMemo } from "react";
import { evaluateResources } from "@/lib/external-resources/evaluateResources";
import type {
  ExternalResourcesConfig,
  ResourceEvaluationContext,
  ResourceEvaluationResult,
} from "@/lib/external-resources/types";

export function useExternalResources(
  config: ExternalResourcesConfig | undefined,
  context: ResourceEvaluationContext,
): ResourceEvaluationResult | null {
  return useMemo(() => {
    if (!config) return null;
    return evaluateResources(config, context);
  }, [config, context]);
}
