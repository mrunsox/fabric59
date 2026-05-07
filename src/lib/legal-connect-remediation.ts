// Phase 8 — Map recurring issues / alert kinds to next-step destinations.
//
// Returns a remediation hint with a label and href when a sensible target
// exists. Falls back to a generic readiness link.

export interface RemediationTarget {
  label: string;
  href: string;
  hint: string;
}

const READINESS_BASE = "/admin/legal-connect"; // tenant-scoped routes use /admin/legal-connect/<clientId>

function tenantBase(clientId?: string | null) {
  return clientId ? `/admin/legal-connect/${clientId}` : READINESS_BASE;
}

/**
 * Map an error class (auth, rate_limited, validation, upstream, …) to a
 * remediation target. clientId is optional; if omitted we land on the org
 * readiness surface.
 */
export function remediationForErrorClass(
  errorClass: string | null | undefined,
  clientId?: string | null,
): RemediationTarget {
  const k = (errorClass ?? "").toLowerCase();
  const base = tenantBase(clientId);
  if (k.includes("auth")) {
    return {
      label: "Open connection test",
      href: `${base}?tab=connections`,
      hint: "Re-run the auth/connection test and reconnect the provider if needed.",
    };
  }
  if (k.includes("rate")) {
    return {
      label: "Review rate limits",
      href: `${base}?tab=readiness#rate-limits`,
      hint: "Tune per-tenant rate limits in RateLimitsPanel.",
    };
  }
  if (k.includes("valid") || k.includes("schema") || k.includes("mapping")) {
    return {
      label: "Open mapping preview",
      href: `${base}?tab=mappings`,
      hint: "Re-check field mappings and worksheet payload preview.",
    };
  }
  if (k.includes("upstream") || k.includes("5xx") || k.includes("timeout") || k.includes("outage")) {
    return {
      label: "Open runbook",
      href: `${base}?tab=readiness#runbook`,
      hint: "Use the go-live / outage section of the runbook.",
    };
  }
  return {
    label: "Open readiness",
    href: `${base}?tab=readiness`,
    hint: "Inspect tenant readiness, recent jobs, and guided tests.",
  };
}

/**
 * Map an alert_kind to a remediation target.
 */
export function remediationForAlertKind(
  kind: string | null | undefined,
  clientId?: string | null,
): RemediationTarget {
  const k = (kind ?? "").toLowerCase();
  const base = tenantBase(clientId);
  if (k === "zero_jobs") {
    return {
      label: "Verify routing",
      href: `${base}?tab=readiness`,
      hint: "Check ingestion / DNIS routing — tenant has logged no jobs.",
    };
  }
  if (k === "auth_failure") {
    return remediationForErrorClass("auth", clientId);
  }
  if (k === "rate_limited") {
    return remediationForErrorClass("rate_limited", clientId);
  }
  if (k === "high_failure_rate") {
    return {
      label: "Open guided tests",
      href: `${base}?tab=tests`,
      hint: "Replay failing scenarios via guided tests.",
    };
  }
  return {
    label: "Open readiness",
    href: `${base}?tab=readiness`,
    hint: "Inspect tenant readiness panel.",
  };
}

/**
 * For a recurring issue row coming out of useLegalConnectReports, infer a
 * remediation. The key encodes the type prefix ("fail:" or "alert:").
 */
export function remediationForRecurring(
  key: string,
  issueType: string,
): RemediationTarget {
  if (key.startsWith("alert:")) {
    // alert:<clientId>::<kind>
    const rest = key.slice("alert:".length);
    const [clientId, kind] = rest.split("::");
    return remediationForAlertKind(kind, clientId);
  }
  if (key.startsWith("fail:")) {
    // fail:<clientId>::<errClass>
    const rest = key.slice("fail:".length);
    const [clientId, errClass] = rest.split("::");
    return remediationForErrorClass(errClass, clientId);
  }
  // Fallback: try to read class from the issue_type string.
  return remediationForErrorClass(issueType);
}
