/**
 * Memoized transfer-recommendation hook. Re-evaluates the rule engine
 * whenever the config or the runner context changes. Pure derived state —
 * does not subscribe to anything external.
 */
import { useMemo } from "react";
import { evaluateTransferRules } from "@/lib/transfer-directory/evaluateRules";
import type {
  EvaluationResult,
  TransferDirectoryConfig,
  TransferEvaluationContext,
} from "@/lib/transfer-directory/types";

export function useTransferRecommendations(
  config: TransferDirectoryConfig | undefined,
  context: TransferEvaluationContext,
): EvaluationResult | null {
  return useMemo(() => {
    if (!config) return null;
    return evaluateTransferRules(config, context);
  }, [config, context]);
}
