export const FEEDBACK_SOURCES = [
  { id: "design_partner_interview", label: "Design partner interview" },
  { id: "in_product", label: "In-product" },
  { id: "support_call", label: "Support call" },
  { id: "internal_note", label: "Internal note" },
  { id: "other", label: "Other" },
] as const;

export const FEEDBACK_TOPICS = [
  { id: "onboarding", label: "Onboarding" },
  { id: "tests", label: "Tests" },
  { id: "dashboard", label: "Dashboard" },
  { id: "accuracy", label: "Accuracy" },
  { id: "speed", label: "Speed" },
  { id: "trust", label: "Trust" },
  { id: "billing_future", label: "Billing (future)" },
  { id: "general", label: "General" },
  { id: "other", label: "Other" },
] as const;

export const FEEDBACK_TYPES = [
  { id: "bug", label: "Bug" },
  { id: "feature_request", label: "Feature request" },
  { id: "confusion", label: "Confusion" },
  { id: "praise", label: "Praise" },
  { id: "idea", label: "Idea" },
] as const;

export const FEEDBACK_STATUSES = [
  { id: "new", label: "New" },
  { id: "triaged", label: "Triaged" },
  { id: "in_progress", label: "In progress" },
  { id: "shipped", label: "Shipped" },
  { id: "wont_fix", label: "Won't fix" },
] as const;

export type FeedbackEntry = {
  id: string;
  organization_id: string;
  client_id: string | null;
  source: string;
  topic: string;
  entry_type: string;
  severity: string | null;
  message: string;
  status: string;
  logged_by: string | null;
  logged_by_name: string | null;
  shipped_release_note_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type ReleaseNote = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  highlights: string[];
  details: string[];
  audience: "all" | "design_partners" | "internal";
  dev_guide_link: string | null;
  published_at: string;
};

export const GA_READINESS_CHECKLIST = [
  {
    section: "Product & integration",
    items: [
      { id: "five9-flows-tested", label: "Five9 → Legal Connect → CRM tested per provider for ≥1 real tenant" },
      { id: "outcome-engine-coverage", label: "Outcome engine covers all supported call reasons; no dead paths" },
      { id: "worksheets-validated", label: "Worksheets, caller_type/call_reason capture, mappings validated live" },
    ],
  },
  {
    section: "Operations & safety",
    items: [
      { id: "pilots-completed-stages", label: "Design-partner pilots have run through all rollout stages" },
      { id: "rate-limits-tuned", label: "Rate limits tuned for early tenants; no unexplained floods" },
      { id: "alerts-tested", label: "Alerts tested: high_failure_rate, auth_failure, rate_limited, zero_jobs" },
      { id: "health-cards-accurate", label: "Health cards reflect accurate stats for real traffic" },
    ],
  },
  {
    section: "Onboarding & docs",
    items: [
      { id: "guides-verified", label: "In-product guides verified by a non-engineer tester" },
      { id: "playbooks-exercised", label: "Internal playbooks exercised in ≥1 live onboarding" },
      { id: "guided-tests-used", label: "Guided tests used in real setups" },
    ],
  },
  {
    section: "Feedback & communication",
    items: [
      { id: "feedback-logged", label: "Feedback entries logged for ≥1 pilot" },
      { id: "release-note-published", label: "≥1 release note published and visible in-product" },
      { id: "weekly-review", label: "Weekly feedback review + release note process exists" },
    ],
  },
  {
    section: "Security & compliance",
    items: [
      { id: "logs-redacted", label: "Sensitive fields redacted in logs where required" },
      { id: "test-vs-live", label: "Test vs live flows clearly separated" },
      { id: "retention-documented", label: "Data retention and access basics documented" },
    ],
  },
] as const;
