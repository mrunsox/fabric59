// Mirrors isRetriable() in supabase/functions/flow-runner/index.ts so the UI
// can label failures the same way the runner does.

export type RetryClass = "retriable" | "non_retriable" | "unknown";

export interface RetryVerdict {
  cls: RetryClass;
  reason: string;
  status?: number;
}

/** Parse an HTTP status code out of a free-form error message, if present. */
function extractStatus(msg: string): number | undefined {
  // Patterns: "[429]", " 500 ", "status 404", "HTTP 502"
  const m =
    msg.match(/\b(?:status|HTTP)?\s*\[?(\d{3})\]?\b/i) ||
    msg.match(/\b(\d{3})\b/);
  if (!m) return undefined;
  const n = parseInt(m[1], 10);
  return n >= 100 && n < 600 ? n : undefined;
}

export function classifyError(error: string | null | undefined): RetryVerdict {
  if (!error) return { cls: "unknown", reason: "No error recorded." };

  const lower = error.toLowerCase();

  // Network / timeout style failures => retriable
  if (
    /timeout|timed out|econnreset|econnrefused|enotfound|fetch failed|network|socket hang up/i.test(
      error
    )
  ) {
    return { cls: "retriable", reason: "Network or timeout error. Safe to retry." };
  }

  const status = extractStatus(error);
  if (status !== undefined) {
    if (status >= 500) {
      return { cls: "retriable", status, reason: `Upstream ${status}. Server error, retried with backoff.` };
    }
    if (status === 408) {
      return { cls: "retriable", status, reason: "408 Request Timeout. Retried with backoff." };
    }
    if (status === 429) {
      return { cls: "retriable", status, reason: "429 Rate limited. Retried with backoff." };
    }
    if (status >= 400) {
      return {
        cls: "non_retriable",
        status,
        reason: `Client error ${status}. Fix the request or mapping; retries will fail the same way.`,
      };
    }
  }

  // Authoritative non-retriable hints
  if (/invalid_payload|validation|schema|missing required|unauthorized|forbidden/i.test(lower)) {
    return {
      cls: "non_retriable",
      reason: "Validation or auth error. Replays will not change the outcome until the flow is fixed.",
    };
  }

  return { cls: "unknown", reason: "Could not classify; replay at your discretion." };
}
