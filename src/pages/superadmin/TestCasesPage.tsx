import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClipboardCheck, Copy, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type Risk = "High" | "Medium" | "Low";
type CaseType =
  | "Functional"
  | "Integration"
  | "Regression"
  | "Security"
  | "Ops";

type TestCase = {
  id: string;
  area: string;
  risk: Risk;
  type: CaseType;
  title: string;
  preconditions?: string[];
  steps: string[];
  expected_results: string[];
  main_page: string;
};

const AREAS = [
  "Core ingestion & execution",
  "Outcome logic",
  "Admin setup & readiness",
  "Rollout controls",
  "Health & operations",
  "GA & launch hardening",
  "Security / boundary",
  "Regression",
] as const;

const RISKS: Risk[] = ["High", "Medium", "Low"];
const TYPES: CaseType[] = ["Functional", "Integration", "Regression", "Security", "Ops"];

const TEST_CASES: TestCase[] = [
  // Core ingestion & execution
  {
    id: "LC-ING-001",
    area: "Core ingestion & execution",
    risk: "High",
    type: "Integration",
    title: "Inbound Five9 event normalization renders in event log",
    main_page: "Admin → Client → Legal Connect → Event Log",
    preconditions: ["Tenant has at least one mapped CRM provider", "Five9 webhook configured"],
    steps: [
      "Trigger a synthetic Five9 event for the tenant",
      "Open the Legal Connect Event Log for that client",
      "Locate the new event row",
    ],
    expected_results: [
      "Event appears with normalized fields (callId, disposition, ANI, etc.)",
      "Tenant scope matches the originating client",
    ],
  },
  {
    id: "LC-ING-002",
    area: "Core ingestion & execution",
    risk: "High",
    type: "Functional",
    title: "Mappings + constants resolve in payload preview",
    main_page: "Admin → Client → Legal Connect → Mappings",
    steps: [
      "Open mappings for a configured CRM",
      "Open payload preview for a sample event",
    ],
    expected_results: [
      "Mapped fields, constants and worksheet values appear in preview",
      "Preview matches what the worker would dispatch",
    ],
  },
  {
    id: "LC-ING-003",
    area: "Core ingestion & execution",
    risk: "Medium",
    type: "Functional",
    title: "Sync jobs queue, run and surface result state",
    main_page: "Admin → Client → Legal Connect → Sync jobs",
    steps: [
      "Trigger an event that produces a provider job",
      "Open the sync jobs panel",
    ],
    expected_results: [
      "Job appears as queued, transitions to running, then succeeded/failed",
      "Failed jobs show error class and retry context",
    ],
  },
  {
    id: "LC-ING-004",
    area: "Core ingestion & execution",
    risk: "Medium",
    type: "Functional",
    title: "Email-only outcome delivers without provider writeback",
    main_page: "Admin → Client → Legal Connect → Outcomes",
    steps: [
      "Configure a disposition mapped to email-only",
      "Fire a matching event",
    ],
    expected_results: [
      "Email is dispatched",
      "No provider writeback job is created",
    ],
  },

  // Outcome logic
  {
    id: "LC-OUT-001",
    area: "Outcome logic",
    risk: "High",
    type: "Functional",
    title: "caller_type + call_reason routes to expected provider",
    main_page: "Admin → Client → Legal Connect → Outcome engine",
    steps: [
      "Pick a (caller_type, call_reason) pair mapped to provider writeback",
      "Trigger event with those values",
    ],
    expected_results: [
      "Outcome engine selects the configured provider branch",
      "Job appears in sync jobs for that provider",
    ],
  },
  {
    id: "LC-OUT-002",
    area: "Outcome logic",
    risk: "High",
    type: "Functional",
    title: "Email-only branch chosen when matrix specifies email",
    main_page: "Admin → Client → Legal Connect → Outcome engine",
    steps: ["Trigger event for an email-only matrix entry"],
    expected_results: ["Email dispatched, no provider job", "Audit shows email branch"],
  },
  {
    id: "LC-OUT-003",
    area: "Outcome logic",
    risk: "Medium",
    type: "Functional",
    title: "Skip branch yields no writeback and no email",
    main_page: "Admin → Client → Legal Connect → Outcome engine",
    steps: ["Trigger event matching a no-action matrix entry"],
    expected_results: ["No provider job", "No email", "Skip recorded in audit"],
  },
  {
    id: "LC-OUT-004",
    area: "Outcome logic",
    risk: "Medium",
    type: "Regression",
    title: "Legacy inline dispatch flag still bypasses outcome engine",
    main_page: "Admin → Client → Legal Connect → Settings",
    steps: [
      "Enable execution-mode legacy flag",
      "Trigger event normally routed by outcome engine",
    ],
    expected_results: ["Inline Manage/MyCase path executes", "Outcome engine not invoked"],
  },

  // Admin setup & readiness
  {
    id: "LC-RDY-001",
    area: "Admin setup & readiness",
    risk: "High",
    type: "Functional",
    title: "Readiness checklist reflects tenant state",
    main_page: "Admin → Client → Legal Connect → Readiness tab",
    steps: ["Open readiness for a partially configured client"],
    expected_results: [
      "Each item shows accurate pass/fail",
      "Go-live gate disabled when items are missing",
    ],
  },
  {
    id: "LC-RDY-002",
    area: "Admin setup & readiness",
    risk: "High",
    type: "Functional",
    title: "Safe mode pauses provider writeback",
    main_page: "Admin → Client → Legal Connect → Readiness tab",
    steps: ["Toggle safe mode on", "Trigger an event that would normally create a writeback job"],
    expected_results: ["No writeback job dispatched", "Banner indicates safe mode is active"],
  },
  {
    id: "LC-RDY-003",
    area: "Admin setup & readiness",
    risk: "Medium",
    type: "Functional",
    title: "Guided test runs without affecting production state",
    main_page: "Admin → Client → Legal Connect → Guided tests",
    steps: ["Run a guided test scenario"],
    expected_results: ["Result captured", "No real provider writeback to live CRM"],
  },
  {
    id: "LC-RDY-004",
    area: "Admin setup & readiness",
    risk: "Low",
    type: "Functional",
    title: "Quick-start guide and onboarding template render",
    main_page: "Admin → Client → Legal Connect → Onboarding",
    steps: ["Open onboarding for a new client"],
    expected_results: ["Templates render", "Steps reflect concierge checklist model"],
  },

  // Rollout controls
  {
    id: "LC-ROL-001",
    area: "Rollout controls",
    risk: "High",
    type: "Functional",
    title: "Design-partner flag gates pilot-only features",
    main_page: "Superadmin → Design Partners",
    steps: ["Disable design-partner flag for a tenant", "Open client Legal Connect surfaces"],
    expected_results: ["Pilot-only UI hidden", "Standard surfaces unaffected"],
  },
  {
    id: "LC-ROL-002",
    area: "Rollout controls",
    risk: "High",
    type: "Functional",
    title: "Rollout status enum gates production traffic",
    main_page: "Superadmin → Design Partners",
    steps: ["Move tenant from pilot → GA"],
    expected_results: ["Status transitions persist", "GA surfaces unlocked"],
  },
  {
    id: "LC-ROL-003",
    area: "Rollout controls",
    risk: "High",
    type: "Functional",
    title: "Pilot approval transition requires checklist completion",
    main_page: "Superadmin → Design Partners → Pilot approval",
    steps: ["Attempt to approve with incomplete checklist", "Then complete and re-attempt"],
    expected_results: ["Block on incomplete", "Approval succeeds when complete"],
  },
  {
    id: "LC-ROL-004",
    area: "Rollout controls",
    risk: "Medium",
    type: "Functional",
    title: "Pilot templates render and apply to tenant",
    main_page: "Superadmin → Design Partners → Pilot templates",
    steps: ["Apply a pilot template to a new tenant"],
    expected_results: ["Tenant inherits template config", "Audit logs show source template"],
  },

  // Health & operations
  {
    id: "LC-HLT-001",
    area: "Health & operations",
    risk: "High",
    type: "Ops",
    title: "Per-tenant rate limit blocks excess events",
    main_page: "Admin → Client → Legal Connect → Health",
    steps: ["Drive events above the configured rate limit"],
    expected_results: ["Excess events rejected with rate-limit error class", "Tenant health reflects pressure"],
  },
  {
    id: "LC-HLT-002",
    area: "Health & operations",
    risk: "High",
    type: "Ops",
    title: "Tenant health surface reports current state",
    main_page: "Admin → Client → Legal Connect → Health",
    steps: ["Open health for a tenant with recent failures"],
    expected_results: ["Failure rate, recent issues and alerts visible", "Counts match underlying data"],
  },
  {
    id: "LC-HLT-003",
    area: "Health & operations",
    risk: "Medium",
    type: "Ops",
    title: "Recurring issues digest groups duplicates",
    main_page: "Superadmin → Legal Connect Reports → Digests",
    steps: ["Generate digest for a tenant with repeated failures"],
    expected_results: ["Issues grouped by signature", "Counts and last-seen accurate"],
  },
  {
    id: "LC-HLT-004",
    area: "Health & operations",
    risk: "Medium",
    type: "Integration",
    title: "External ack endpoint is replay-protected",
    main_page: "External (legal-connect-ack edge fn)",
    steps: ["Submit valid ack", "Resubmit identical ack within window"],
    expected_results: ["First ack accepted", "Replay rejected with deduplication error"],
  },

  // GA & launch hardening
  {
    id: "LC-GA-001",
    area: "GA & launch hardening",
    risk: "High",
    type: "Functional",
    title: "Shared GA checklist is per-tenant and gates go-live",
    main_page: "Superadmin → Design Partners → GA checklist",
    steps: ["Open GA checklist for two tenants"],
    expected_results: ["State persists per tenant", "Go-live blocked until complete"],
  },
  {
    id: "LC-GA-002",
    area: "GA & launch hardening",
    risk: "Medium",
    type: "Ops",
    title: "Runbook panel renders current operational steps",
    main_page: "Superadmin → Design Partners → Runbook",
    steps: ["Open runbook panel"],
    expected_results: ["All sections render", "Links resolve to live surfaces"],
  },
  {
    id: "LC-GA-003",
    area: "GA & launch hardening",
    risk: "Low",
    type: "Functional",
    title: "Feedback capture stores entry and surfaces in What's new drawer",
    main_page: "Admin → Feedback / What's new drawer",
    steps: ["Submit feedback", "Open What's new drawer"],
    expected_results: ["Entry stored", "Visible in drawer for authorized roles"],
  },

  // Security / boundary
  {
    id: "LC-SEC-001",
    area: "Security / boundary",
    risk: "High",
    type: "Security",
    title: "Reports and digests respect tenant scope",
    main_page: "Superadmin → Legal Connect Reports",
    steps: [
      "Sign in as user scoped to Tenant A",
      "Open reports/digests with explicit Tenant A selection",
      "Attempt to query Tenant B via URL/state",
    ],
    expected_results: [
      "Only Tenant A data returned",
      "No cross-tenant leakage in any view",
    ],
  },
  {
    id: "LC-SEC-002",
    area: "Security / boundary",
    risk: "High",
    type: "Security",
    title: "Webhook validation rejects invalid signatures",
    main_page: "External (legal-connect webhooks)",
    steps: ["Send webhook without/invalid x-webhook-secret"],
    expected_results: ["Request rejected", "Audit log records rejection"],
  },
  {
    id: "LC-SEC-003",
    area: "Security / boundary",
    risk: "Medium",
    type: "Security",
    title: "Role/permission gates hide superadmin surfaces from regular users",
    main_page: "Superadmin → any page",
    steps: ["Sign in as non-master_admin user", "Navigate to /superadmin/*"],
    expected_results: ["Routes blocked / redirected", "No superadmin nav rendered"],
  },

  // Regression
  {
    id: "LC-REG-001",
    area: "Regression",
    risk: "High",
    type: "Regression",
    title: "DeliveryDashboard still renders after recent changes",
    main_page: "Admin → Client → Legal Connect → Delivery Dashboard",
    steps: ["Open delivery dashboard for a tenant with recent traffic"],
    expected_results: ["Loads without console errors", "All tiles populated"],
  },
  {
    id: "LC-REG-002",
    area: "Regression",
    risk: "Medium",
    type: "Regression",
    title: "Legacy error classes still surface in API logs",
    main_page: "Admin → API Logs",
    steps: ["Trigger a known legacy error path", "Open API logs"],
    expected_results: ["Legacy error class shown", "Filterable by class"],
  },
  {
    id: "LC-REG-003",
    area: "Regression",
    risk: "Medium",
    type: "Regression",
    title: "Ack-source filter on reports/issues narrows results without leakage",
    main_page: "Superadmin → Legal Connect Reports",
    steps: ["Apply ack-source filter to a known set", "Verify against unfiltered list"],
    expected_results: ["Filtered set is a strict subset", "No cross-tenant rows"],
  },
  {
    id: "LC-REG-004",
    area: "Regression",
    risk: "Low",
    type: "Regression",
    title: "Dev Guide QA sections and Call Flow overlay still render",
    main_page: "Superadmin → Dev Guide / Call Flow",
    steps: [
      "Open /superadmin/dev-guide#qa-handoff-summary",
      "Open /superadmin/call-flow Legal Connect overlay",
    ],
    expected_results: ["Both render without console errors", "Anchors scroll correctly"],
  },
];

type RunStatus = "Not run" | "Passed" | "Failed";

const riskVariant = (r: Risk): "error" | "warning" | "default" =>
  r === "High" ? "error" : r === "Medium" ? "warning" : "default";

export default function TestCasesPage() {
  const [areaFilter, setAreaFilter] = useState<string>("all");
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [runState, setRunState] = useState<
    Record<string, { status: RunStatus; note: string }>
  >({});

  const filtered = useMemo(
    () =>
      TEST_CASES.filter(
        (tc) =>
          (areaFilter === "all" || tc.area === areaFilter) &&
          (riskFilter === "all" || tc.risk === riskFilter) &&
          (typeFilter === "all" || tc.type === typeFilter),
      ),
    [areaFilter, riskFilter, typeFilter],
  );

  const setStatus = (id: string, status: RunStatus) =>
    setRunState((s) => ({ ...s, [id]: { status, note: s[id]?.note ?? "" } }));
  const setNote = (id: string, note: string) =>
    setRunState((s) => ({
      ...s,
      [id]: { status: s[id]?.status ?? "Not run", note: note.slice(0, 500) },
    }));

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast({ title: "Copied", description: id });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Legal Connect — QA test cases"
        subtitle="Concrete, named test cases (IDs, steps, expected results) for the Legal Connect QA pass."
        icon={<ClipboardCheck className="h-6 w-6 text-primary" />}
      >
        <Badge variant="secondary">Internal QA only</Badge>
      </PageHeader>

      <Card className="p-4 space-y-2 text-sm">
        <p className="text-foreground/90">
          This page turns the QA handoff content from the Dev Guide and the Legal
          Connect overlay on the Call Flow page into explicit, runnable test cases.
          Run tracking is in-memory only and resets on reload.
        </p>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            to="/superadmin/dev-guide#qa-handoff-summary"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Open Dev Guide
          </Link>
          <Link
            to="/superadmin/call-flow"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Open Call Flow
          </Link>
        </div>
      </Card>

      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Area</label>
            <Select value={areaFilter} onValueChange={setAreaFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All areas</SelectItem>
                {AREAS.map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Risk</label>
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All risks</SelectItem>
                {RISKS.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Type</label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end justify-end text-sm text-muted-foreground">
            {filtered.length} of {TEST_CASES.length} cases
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        {filtered.map((tc) => {
          const run = runState[tc.id];
          return (
            <Card key={tc.id} className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm text-muted-foreground">{tc.id}</span>
                    <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => copyId(tc.id)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                  <h3 className="text-base font-semibold text-foreground mt-1">{tc.title}</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline">{tc.area}</Badge>
                  <StatusBadge variant={riskVariant(tc.risk)}>{tc.risk}</StatusBadge>
                  <Badge variant="secondary">{tc.type}</Badge>
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground/80">Main page:</span> {tc.main_page}
              </div>

              {tc.preconditions && tc.preconditions.length > 0 && (
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Preconditions</div>
                  <ul className="text-sm list-disc pl-5 space-y-0.5 text-foreground/90">
                    {tc.preconditions.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Steps</div>
                  <ol className="text-sm list-decimal pl-5 space-y-0.5 text-foreground/90">
                    {tc.steps.map((s, i) => <li key={i}>{s}</li>)}
                  </ol>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Expected results</div>
                  <ul className="text-sm list-disc pl-5 space-y-0.5 text-foreground/90">
                    {tc.expected_results.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              </div>

              <div className="border-t pt-3 space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">Run status:</span>
                  {(["Not run", "Passed", "Failed"] as RunStatus[]).map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={(run?.status ?? "Not run") === s ? "default" : "outline"}
                      onClick={() => setStatus(tc.id, s)}
                    >
                      {s}
                    </Button>
                  ))}
                </div>
                <Textarea
                  placeholder="Optional note (session-only, not persisted)"
                  value={run?.note ?? ""}
                  onChange={(e) => setNote(tc.id, e.target.value)}
                  className="min-h-[60px]"
                  maxLength={500}
                />
              </div>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            No test cases match the current filters.
          </Card>
        )}
      </div>
    </div>
  );
}
