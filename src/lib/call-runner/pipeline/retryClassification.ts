/**
 * Phase 7 — retry classification.
 *
 * Mirrors the conventions used by `supabase/functions/legal-connect-jobs`
 * so the worker, dashboards, and tests agree on transient vs permanent
 * failures and the corresponding backoff schedule.
 */
import type { RetryClass } from "./types";

export const MAX_RETRY_ATTEMPTS = 5;

const PERMANENT_PATTERNS = [
  /unsupported_action/i,
  /payload_validation_failed/i,
  /invalid_signature/i,
  /duplicate_event/i,
  /forbidden/i,
  /401|unauthorized/i, // requires reconnect — handled outside the retry loop
];

const TRANSIENT_PATTERNS = [
  /timeout/i,
  /econnreset/i,
  /rate.?limit|429/i,
  /5\d{2}/, // 5xx
  /network/i,
  /temporar/i,
];

export function classifyError(message: string | undefined | null): RetryClass {
  if (!message) return "transient";
  for (const re of PERMANENT_PATTERNS) {
    if (re.test(message)) return "permanent";
  }
  for (const re of TRANSIENT_PATTERNS) {
    if (re.test(message)) return "transient";
  }
  // Default to transient (safer for at-least-once delivery semantics).
  return "transient";
}

/**
 * Exponential backoff with cap. Returns a delay in milliseconds for the
 * upcoming attempt (1-indexed). Matches `legal-connect-jobs`'s schedule
 * within an order of magnitude.
 */
export function backoffMs(attempt: number, opts?: { baseMs?: number; factor?: number; capMs?: number }): number {
  const baseMs = opts?.baseMs ?? 30_000;
  const factor = opts?.factor ?? 3;
  const capMs = opts?.capMs ?? 15 * 60_000;
  const raw = baseMs * Math.pow(factor, Math.max(0, attempt - 1));
  return Math.min(raw, capMs);
}

export function shouldRetry(error: string | null | undefined, attempt: number): boolean {
  if (attempt >= MAX_RETRY_ATTEMPTS) return false;
  return classifyError(error) === "transient";
}
