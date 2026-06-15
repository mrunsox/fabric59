/**
 * Human-readable bucket / rationale formatters for the transfer directory UI.
 */
import type { TargetBucket } from "./types";

export const BUCKET_LABEL: Record<TargetBucket, string> = {
  recommended: "Recommended",
  allowed: "Allowed",
  escalation: "Escalation",
  fallback: "Fallback",
  unavailable: "Unavailable",
};

export const BUCKET_DESCRIPTION: Record<TargetBucket, string> = {
  recommended: "Best fit for the current context.",
  allowed: "Permitted transfer targets.",
  escalation: "Reserved for escalation paths.",
  fallback: "Use only when nothing else applies.",
  unavailable: "Not available for this context.",
};

export function formatPhone(phone?: string, ext?: string): string | null {
  if (!phone && !ext) return null;
  if (phone && ext) return `${phone} x${ext}`;
  return phone ?? `x${ext}`;
}
