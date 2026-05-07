// Pilot go/no-go checklist + reusable pilot templates.
// Pure data + types — no DB calls.

export type PilotItemStatus = "pending" | "complete" | "na";

export interface PilotChecklistItemDef {
  id: string;
  label: string;
  description: string;
  required: boolean;
}

export const PILOT_CHECKLIST: PilotChecklistItemDef[] = [
  { id: "provider_connected", label: "Provider connection valid", description: "At least one legal provider is connected and shows healthy.", required: true },
  { id: "auth_test_passed", label: "Auth test passed", description: "The guided auth test succeeded for the active provider.", required: true },
  { id: "writeback_test_passed", label: "Write-back test passed", description: "A guided write-back test reached succeeded on the Delivery dashboard.", required: true },
  { id: "email_only_test_passed", label: "Email-only test passed (if used)", description: "Skip with N/A if this client doesn't use post-call email.", required: false },
  { id: "classification_confirmed", label: "Caller classification fields confirmed", description: "Caller-type and call-reason fields produce expected values on test calls.", required: true },
  { id: "mappings_reviewed", label: "Mappings & outcomes reviewed", description: "Field mappings and outcome routing reviewed with the client.", required: true },
  { id: "safe_mode_reviewed", label: "Safe mode reviewed", description: "Safe-mode level chosen and acknowledged for the pilot window.", required: true },
  { id: "client_contact_identified", label: "Internal client contact identified", description: "Primary contact + escalation path captured in design partner notes.", required: true },
  { id: "rollback_plan_known", label: "Rollback / pause plan known", description: "Team knows how to pause this client and which lever to pull first.", required: true },
  { id: "dashboard_checked", label: "Delivery dashboard checked after test", description: "No unexpected failures on the dashboard after guided tests.", required: true },
  { id: "no_blocking_errors", label: "No critical blocking errors outstanding", description: "Health panel and recent jobs are clean.", required: true },
];

export interface PilotTemplate {
  id: string;
  name: string;
  summary: string;
  allows: string[];
  restricts: string[];
  recommendedSafeMode: "none" | "review_all" | "email_only";
}

export const PILOT_TEMPLATES: PilotTemplate[] = [
  {
    id: "new_leads_only",
    name: "New leads only",
    summary: "Only create intake / lead records for new callers. Current-client updates are limited or email-only.",
    allows: ["lead.create for new callers", "post-call email for current clients"],
    restricts: ["No note/task write-back for current clients", "No contact updates"],
    recommendedSafeMode: "review_all",
  },
  {
    id: "new_leads_plus_notes",
    name: "New leads + client notes",
    summary: "Allow lead creation plus note/task updates for current clients.",
    allows: ["lead.create", "note.create", "task.create"],
    restricts: ["No contact field overwrites"],
    recommendedSafeMode: "review_all",
  },
  {
    id: "email_first",
    name: "Email-first cautious rollout",
    summary: "Prefer email-only outcomes everywhere possible. Minimal direct write-back.",
    allows: ["post-call email for all outcomes", "lead.create only when explicitly enabled"],
    restricts: ["Direct CRM write-back disabled by default"],
    recommendedSafeMode: "email_only",
  },
  {
    id: "full_pilot",
    name: "Full pilot",
    summary: "All supported actions enabled for the provider mix after successful testing.",
    allows: ["All adapter job types: lead, note, task, contact updates, email"],
    restricts: ["Standard safe-mode reviews still apply"],
    recommendedSafeMode: "none",
  },
];

export type PilotStatus = "not_ready" | "blocked" | "ready_for_pilot" | "approved";

export const PILOT_STATUS_LABEL: Record<PilotStatus, string> = {
  not_ready: "Not ready",
  blocked: "Blocked",
  ready_for_pilot: "Ready for pilot",
  approved: "Approved",
};

export interface PilotChecklistState {
  [itemId: string]: { status: PilotItemStatus; note?: string; updated_at?: string; updated_by?: string };
}

export interface PilotApproval {
  approved_at?: string;
  approved_by?: string;
  notes?: string;
  template_id?: string;
}

export function computePilotReadiness(state: PilotChecklistState): {
  missingRequired: string[];
  totalRequired: number;
  completeRequired: number;
} {
  const required = PILOT_CHECKLIST.filter((i) => i.required);
  const missing = required
    .filter((i) => {
      const s = state[i.id]?.status;
      return s !== "complete" && s !== "na";
    })
    .map((i) => i.id);
  return {
    missingRequired: missing,
    totalRequired: required.length,
    completeRequired: required.length - missing.length,
  };
}
