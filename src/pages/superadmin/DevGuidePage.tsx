import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  GitBranch,
  Layers,
  Workflow,
  Plug,
  Target,
  Activity,
  ShieldCheck,
  ChevronRight,
  ClipboardCheck,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { ArchitectureFlowchart } from "@/components/dev-guide/ArchitectureFlowchart";

interface Section {
  id: string;
  label: string;
  icon: typeof BookOpen;
}

const SECTIONS: Section[] = [
  { id: "overview", label: "Overview", icon: BookOpen },
  { id: "current-state", label: "Current implemented state", icon: CheckCircle2 },
  { id: "remaining-ga", label: "What remains before broader GA", icon: Circle },
  { id: "roadmap-alignment", label: "Roadmap alignment", icon: GitBranch },
  { id: "next-phase", label: "Recommended next phase", icon: Target },
  { id: "do-now", label: "What the team should do now", icon: ClipboardCheck },
  { id: "flowchart", label: "Architecture flowchart", icon: GitBranch },
  { id: "architecture", label: "Core architecture", icon: Layers },
  { id: "flow-types", label: "Flow types", icon: Workflow },
  { id: "connectors", label: "Connector model", icon: Plug },
  { id: "deployments", label: "Deployment model", icon: Target },
  { id: "runs", label: "Runs & reliability", icon: Activity },
  { id: "guardrails", label: "Guardrails", icon: ShieldCheck },
  { id: "clio-grow-mvp", label: "Clio Grow MVP (Phase 1)", icon: Plug },
  { id: "clio-grow-phase2", label: "Constants, Worksheets & Preview (Phase 2)", icon: Plug },
  { id: "phase3-outcomes", label: "Caller Outcomes & Jobs (Phase 3)", icon: Workflow },
  { id: "phase4-slice2", label: "Guided Test Runner (Phase 4 Slice 2)", icon: ShieldCheck },
  { id: "phase4-slice3", label: "Guides & Playbooks (Phase 4 Slice 3)", icon: BookOpen },
  { id: "phase5-slice2", label: "Pilot Approval & Templates (Phase 5 Slice 2)", icon: ClipboardCheck },
  { id: "phase5-slice3", label: "Guardrails & Health (Phase 5 Slice 3)", icon: ShieldCheck },
  { id: "phase5-slice4", label: "Feedback, Release Notes, GA Readiness (Phase 5 Slice 4)", icon: ShieldCheck },
  { id: "phase6", label: "Real Pilot Validation & GA Hardening (Phase 6)", icon: ShieldCheck },
  { id: "phase7", label: "Analytics, Audit Exports & Reporting (Phase 7)", icon: BarChart3 },
  { id: "qa-handoff", label: "QA & Handoff (May 2026)", icon: ClipboardCheck },
];

function SectionHeader({ id, title, kicker }: { id: string; title: string; kicker?: string }) {
  return (
    <div className="mb-4">
      {kicker && (
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{kicker}</div>
      )}
      <h2 id={id} className="text-2xl font-semibold text-foreground scroll-mt-24">{title}</h2>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] border border-border/60 bg-secondary/40 text-foreground">
      {children}
    </span>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-border/60 bg-card p-4 sm:p-5">{children}</div>;
}

export default function DevGuidePage() {
  const [active, setActive] = useState<string>("overview");
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current?.disconnect();
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible) setActive(visible.target.id);
      },
      { rootMargin: "-100px 0px -60% 0px", threshold: 0 }
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) obs.observe(el);
    });
    observerRef.current = obs;
    return () => obs.disconnect();
  }, []);

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Internal · Superadmin</div>
        <h1 className="text-3xl font-semibold text-foreground">Dev Guide</h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-3xl">
          Working reference for the team finishing the Five9-native legal integration platform inside Fabric59.
          Terminology mirrors what the FlowBuilder uses today: <Chip>Trigger</Chip> · <Chip>Filters</Chip> ·
          {" "}<Chip>Mapping</Chip> · <Chip>Action</Chip> · <Chip>Failure Policy</Chip> · <Chip>Test</Chip> ·
          {" "}<Chip>Review</Chip>.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[200px_1fr] gap-8">
        {/* Sticky section nav */}
        <nav className="hidden lg:block">
          <div className="sticky top-20 space-y-1">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground px-2 mb-2">
              On this page
            </div>
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const isActive = active === s.id;
              return (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors ${
                    isActive
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground"
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isActive ? "text-primary" : ""}`} />
                  {s.label}
                </a>
              );
            })}
          </div>
        </nav>

        {/* Content */}
        <div className="max-w-3xl space-y-12">
          {/* Overview */}
          <section>
            <SectionHeader id="overview" title="Overview" kicker="What we're building" />
            <div className="space-y-4 text-sm text-foreground/90 leading-relaxed">
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-1">
                <div className="text-xs uppercase tracking-wider text-primary mb-1 font-medium">
                  Current status
                </div>
                <p className="text-sm text-foreground"><strong>Current state:</strong> Pilot-ready, not yet broadly GA-validated.</p>
                <p className="text-sm text-foreground"><strong>Next phase:</strong> <a href="#phase6" className="text-primary hover:underline">Phase 6 — Real Pilot Validation and GA Launch Hardening</a>.</p>
                <p className="text-sm text-foreground"><strong>Primary risk now:</strong> real-tenant validation, threshold tuning, and final rollout discipline.</p>
                <p className="text-sm text-foreground"><strong>Primary recommendation:</strong> continue the current roadmap; do not restart from a generic phase plan.</p>
                <p className="text-xs text-muted-foreground pt-1">
                  Jump to: <a href="#current-state" className="text-primary hover:underline">Current implemented state</a> ·{" "}
                  <a href="#remaining-ga" className="text-primary hover:underline">What remains before broader GA</a> ·{" "}
                  <a href="#roadmap-alignment" className="text-primary hover:underline">Roadmap alignment</a> ·{" "}
                  <a href="#next-phase" className="text-primary hover:underline">Recommended next phase</a> ·{" "}
                  <a href="#do-now" className="text-primary hover:underline">What the team should do now</a>
                </p>
              </div>
              <p>
                Legal Connect is no longer in early architecture or discovery mode. The product has already moved
                through core foundation work, provider execution consolidation, onboarding/readiness tooling,
                design-partner rollout controls, health monitoring, feedback capture, release notes, and
                GA-readiness preparation. Treat it as <strong>pilot-ready and entering real-world validation</strong>,
                not as a project that still needs a new generic foundation phase.
              </p>
              <p>
                The work remaining is no longer "build the basic platform." It is real tenant validation,
                threshold tuning, access-control tightening, the final go-live procedure, and confirmation
                that the current system behaves correctly under real pilot usage.
              </p>
              <p className="text-muted-foreground">
                Fabric59 is built as a Five9-native integration configurator for legal operations. Five9 is the
                event spine and call engine. Legal systems such as Clio, MyCase, Lawmatics, Litify, CosmoLex,
                PracticePanther, and Smokeball are downstream or bi-directional systems of record. Detailed
                phase-by-phase implementation lives further down the page.
              </p>
            </div>
          </section>

          {/* Current implemented state */}
          <section>
            <SectionHeader
              id="current-state"
              title="Current implemented state"
              kicker="What is shipped today, by phase"
            />
            <div className="space-y-4 text-sm text-foreground/90 leading-relaxed">
              <Card>
                <div className="font-semibold text-foreground mb-1">Phase 1–2 — Core foundation</div>
                <p className="text-xs text-muted-foreground mb-2">Established the base Legal Connect architecture and data flow.</p>
                <ul className="space-y-1.5">
                  <li>· Five9 event ingestion and normalization path.</li>
                  <li>· Base event logging and sync-job architecture.</li>
                  <li>· Mapping system for provider payload construction.</li>
                  <li>· Constants support in call variable mappings.</li>
                  <li>· Worksheet schema and response storage.</li>
                  <li>· Worksheet-driven value resolution.</li>
                  <li>· Payload preview tooling.</li>
                  <li>· Delivery dashboard foundation.</li>
                  <li>· Single execution architecture preserved (no branching into parallel paths).</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-2">
                  Result: the system can already receive call outcomes, resolve values, and prepare downstream provider actions.
                </p>
              </Card>
              <Card>
                <div className="font-semibold text-foreground mb-1">Phase 3 — Outcome engine and provider execution consolidation</div>
                <p className="text-xs text-muted-foreground mb-2">Moved Legal Connect from a narrow provider path into a consistent, outcome-driven execution model.</p>
                <ul className="space-y-1.5">
                  <li>· Caller classification using <code className="text-xs">caller_type</code> and <code className="text-xs">call_reason</code>.</li>
                  <li>· Outcome engine that maps call context to actions.</li>
                  <li>· Provider-agnostic producer flow in <code className="text-xs">five9-main</code>.</li>
                  <li>· Jobs-based execution across providers.</li>
                  <li>· <Chip>execution_mode</Chip> support.</li>
                  <li>· Email-only outcomes for cases where CRM write-back is not appropriate.</li>
                  <li>· Shared adapter contract.</li>
                  <li>· Clio Manage / MyCase execution support aligned to the jobs model.</li>
                  <li>· Dashboard visibility for classification and outcome actions.</li>
                  <li>· Dev Guide documentation for the Phase 3 architecture.</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-2">
                  Result: behaves as a proper multi-provider routing and action system, not a hardcoded single-path integration.
                </p>
              </Card>
              <Card>
                <div className="font-semibold text-foreground mb-1">Phase 4 — Onboarding, readiness, testing, and guides</div>
                <p className="text-xs text-muted-foreground mb-2">Made the system understandable and operable.</p>
                <ul className="space-y-1.5">
                  <li>· Readiness state on tenants.</li>
                  <li>· Safe mode controls.</li>
                  <li>· Go-live checklist.</li>
                  <li>· Readiness tab and readiness panel.</li>
                  <li>· Guided test runner.</li>
                  <li>· Test badges and dashboard filtering for test runs.</li>
                  <li>· Auto-checklist updates from successful tests.</li>
                  <li>· In-product provider quick-start guides.</li>
                  <li>· Internal onboarding playbooks.</li>
                  <li>· Reusable onboarding template for future providers.</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-2">
                  Result: not just connected — the admin UX and internal guidance needed to set clients up and verify the setup.
                </p>
              </Card>
              <Card>
                <div className="font-semibold text-foreground mb-1">Phase 5 — Rollout controls, health, feedback, and GA prep</div>
                <p className="text-xs text-muted-foreground mb-2">Added rollout discipline, operational visibility, and product feedback loops.</p>
                <ul className="space-y-1.5">
                  <li>· Design-partner flags.</li>
                  <li>· Rollout status model.</li>
                  <li>· Design-partner ops view (<code className="text-xs">/superadmin/design-partners</code>).</li>
                  <li>· Formal pilot approval checklist.</li>
                  <li>· Pilot status model.</li>
                  <li>· Reusable pilot templates.</li>
                  <li>· Pilot approval controls.</li>
                  <li>· Per-tenant rate limits.</li>
                  <li>· Tenant health and observability surfaces.</li>
                  <li>· Alerting and alert acknowledgment.</li>
                  <li>· Canonical error taxonomy surfaced in UI.</li>
                  <li>· Structured feedback capture.</li>
                  <li>· In-product "What's new" / release notes.</li>
                  <li>· GA readiness checklist and panel (per-tenant shared state landed in Phase 6 Slice 1).</li>
                  <li>· Dev Guide documentation for rollout, health, feedback, and GA prep.</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-2">
                  Result: the internal controls expected of an early live product, not just a backend integration.
                </p>
              </Card>
            </div>
          </section>

          {/* What remains before broader GA */}
          <section>
            <SectionHeader
              id="remaining-ga"
              title="What remains before broader GA"
              kicker="Close to GA, but not broadly launch-ready until this is done"
            />
            <div className="space-y-4 text-sm text-foreground/90 leading-relaxed">
              <Card>
                <div className="font-semibold text-foreground mb-2">Real-tenant validation work</div>
                <ul className="space-y-1.5">
                  <li>· Run the full 16-item GA checklist against at least one real tenant.</li>
                  <li>· Validate real pilot traffic through the actual provider mix in use.</li>
                  <li>· Confirm dashboards, alerts, readiness state, and rollout state all reflect real-world behavior correctly.</li>
                  <li>· Validate final go-live and rollback flow from actual pilot usage, not only from wiring and controlled tests.</li>
                </ul>
              </Card>
              <Card>
                <div className="font-semibold text-foreground mb-2">Ops and tuning work</div>
                <ul className="space-y-1.5">
                  <li>· Tune alert thresholds based on real traffic patterns.</li>
                  <li>· Tune default per-tenant minute/hour rate limits based on real pilot behavior.</li>
                  <li>· Confirm whether checklist state should remain operator-local or move to shared persisted state for multi-operator use (per-tenant already shared; superadmin-level still localStorage).</li>
                  <li>· Keep writing release notes for real changes that affect operators or tenants.</li>
                </ul>
              </Card>
              <Card>
                <div className="font-semibold text-foreground mb-2">Access-control and policy work</div>
                <ul className="space-y-1.5">
                  <li>· Tighten visibility rules for <Chip>Share feedback</Chip> if needed (currently gated to design partners + admins).</li>
                  <li>· Confirm whether <Chip>What's new</Chip> is shown to all tenants, design partners only, or controlled by tenant state.</li>
                  <li>· Reconfirm that internal-only rollout/health panels stay restricted to the correct audience.</li>
                </ul>
              </Card>
              <Card>
                <div className="font-semibold text-foreground mb-2">Process work</div>
                <ul className="space-y-1.5">
                  <li>· Continue logging real design-partner feedback.</li>
                  <li>· Continue shipping updates tied back to real feedback items.</li>
                  <li>· Document the final go-live checklist and rollback procedure as the operational source of truth.</li>
                </ul>
              </Card>
              <p className="text-xs text-muted-foreground">
                The remaining work is mostly about proving and tightening the existing system, not replacing it.
              </p>
            </div>
          </section>

          {/* Roadmap alignment */}
          <section>
            <SectionHeader
              id="roadmap-alignment"
              title="Roadmap alignment"
              kicker="How a generic phase plan maps onto already-shipped work"
            />
            <div className="space-y-4 text-sm text-foreground/90 leading-relaxed">
              <Card>
                <p className="mb-2">A generic phase structure was recently suggested:</p>
                <ol className="space-y-1 list-decimal pl-5 mb-3 text-xs text-muted-foreground">
                  <li>Foundation and Core Infrastructure</li>
                  <li>Core Connector Development</li>
                  <li>Flow Engine Development</li>
                  <li>Templates and Automation Flows</li>
                  <li>Admin Dashboard and Flow Builder UI</li>
                  <li>Production Hardening</li>
                </ol>
                <p className="mb-3">
                  That structure is directionally reasonable at a high level, but it mostly describes work that
                  has already been completed in the current Legal Connect roadmap.
                </p>
                <table className="w-full text-xs border border-border/60 rounded-md overflow-hidden">
                  <thead className="bg-secondary/40 text-foreground">
                    <tr>
                      <th className="text-left p-2 border-b border-border/60">Suggested generic phase</th>
                      <th className="text-left p-2 border-b border-border/60">Already covered by</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border/40">
                      <td className="p-2">Foundation and Core Infrastructure</td>
                      <td className="p-2">Current Phases 1–2 (architecture, mappings, worksheets, event log, sync jobs, delivery dashboard).</td>
                    </tr>
                    <tr className="border-b border-border/40">
                      <td className="p-2">Core Connector Development</td>
                      <td className="p-2">Current Phase 3 jobs / adapters / provider execution work (Clio Grow, Clio Manage, MyCase, Smokeball, email-only).</td>
                    </tr>
                    <tr className="border-b border-border/40">
                      <td className="p-2">Flow Engine Development</td>
                      <td className="p-2">Current Phase 3 caller classification and outcome engine.</td>
                    </tr>
                    <tr className="border-b border-border/40">
                      <td className="p-2">Templates and Automation Flows</td>
                      <td className="p-2">Phase 4 guides + onboarding template, Phase 5 pilot templates, email-only automation behavior.</td>
                    </tr>
                    <tr className="border-b border-border/40">
                      <td className="p-2">Admin Dashboard and Flow Builder UI</td>
                      <td className="p-2">Substantially shipped: Delivery dashboard, Readiness, Tests, Guides, Pilot Approval, Health, Feedback, Release Notes, Design Partners ops view.</td>
                    </tr>
                    <tr>
                      <td className="p-2">Production Hardening</td>
                      <td className="p-2">Started in Phase 5 Slice 3 (rate limits, alerts, health) and Slice 4 (feedback, release notes, GA checklist). Continues in current Phase 6.</td>
                    </tr>
                  </tbody>
                </table>
              </Card>
              <Card>
                <div className="font-semibold text-foreground mb-2">Guidance</div>
                <p className="mb-2">
                  Legal Connect should not restart from a new generic Phase 1. The current roadmap, implementation
                  history, and Dev Guide sections are already aligned around the existing phase sequence.
                  Restarting under a new naming system would create confusion between what is already shipped and
                  what still remains.
                </p>
                <p>The correct move is to continue from the current roadmap and document the next phase clearly.</p>
              </Card>
            </div>
          </section>

          {/* Recommended next phase */}
          <section>
            <SectionHeader
              id="next-phase"
              title="Recommended next phase"
              kicker="Phase 6 — Real Pilot Validation and GA Launch Hardening"
            />
            <div className="space-y-4 text-sm text-foreground/90 leading-relaxed">
              <Card>
                <div className="font-semibold text-foreground mb-2">Focus</div>
                <ul className="space-y-1.5">
                  <li>· Executing the GA checklist against real tenants.</li>
                  <li>· Validating real provider behavior under pilot traffic.</li>
                  <li>· Tuning rate limits and alerts based on observed traffic.</li>
                  <li>· Tightening audience / role gating where needed.</li>
                  <li>· Documenting the final go-live and rollback procedure.</li>
                  <li>· Confirming what is still blocking broader GA, if anything.</li>
                </ul>
              </Card>
              <Card>
                <div className="font-semibold text-foreground mb-2">Why this is next</div>
                <p>
                  Legal Connect is already feature-complete enough for pilots. Every surface needed to onboard,
                  observe, approve, and roll back a tenant exists. The main remaining risk is real-world
                  validation, not missing product surfaces.
                </p>
              </Card>
              <p className="text-xs text-muted-foreground">
                Detailed Phase 6 implementation notes live in the{" "}
                <a href="#phase6" className="text-primary hover:underline">Phase 6 section</a> below.
              </p>
            </div>
          </section>

          {/* What the team should do now */}
          <section>
            <SectionHeader
              id="do-now"
              title="What the team should do now"
              kicker="Short, operational"
            />
            <div className="space-y-4 text-sm text-foreground/90 leading-relaxed">
              <Card>
                <ol className="space-y-1.5 list-decimal pl-5">
                  <li>Do not restart the roadmap under a new generic phase structure.</li>
                  <li>Keep the current Legal Connect phase history intact.</li>
                  <li>Treat the project as pilot-ready and in GA-hardening mode.</li>
                  <li>Use Phase 6 as the next implementation phase.</li>
                  <li>Validate the 16-item GA checklist against at least one real tenant.</li>
                  <li>Tune thresholds, limits, and gating based on actual pilot behavior.</li>
                  <li>Continue using feedback and release notes as part of the live rollout process.</li>
                </ol>
              </Card>
            </div>
          </section>



          {/* Architecture flowchart */}
          <section>
            <SectionHeader id="flowchart" title="Architecture flowchart" kicker="Visual reference" />
            <ArchitectureFlowchart />
            <div className="mt-4 space-y-3 text-sm text-foreground/90 leading-relaxed">
              <p>
                Fabric59 uses Five9 as the event source and orchestration entry point. Admins choose a flow
                template, configure logic and mappings, scope where the flow is deployed, and route actions
                through reusable connectors such as Clio, MyCase, Smokeball, or generic webhook/HTTP targets.
                Every execution is tracked as a run so the system can support monitoring, retry, replay, and
                safe connector behavior over time.
              </p>
              <p className="text-muted-foreground italic">
                Fabric59 is a reusable Five9-native integration hub, not a one-off Clio connector.
              </p>
            </div>
          </section>

          {/* Core architecture */}
          <section>
            <SectionHeader id="architecture" title="Core architecture" kicker="Hierarchy and entities" />
            <div className="space-y-3 text-sm text-foreground/90 leading-relaxed">
              <Card>
                <div className="font-semibold text-foreground mb-2">Tenant hierarchy</div>
                <p className="text-sm text-muted-foreground mb-3">
                  Fabric59 has four logical layers. <code className="text-xs bg-secondary/60 px-1 py-0.5 rounded">organizations</code> is the real tenant boundary; everything below it is scoped by <code className="text-xs">organization_id</code>.
                </p>
                <ul className="space-y-1.5 text-sm text-foreground/90">
                  <li><Chip>Platform</Chip> Superadmin, backed by <code className="text-xs">user_roles.role = 'master_admin'</code>. Cross-workspace tools live under <code className="text-xs">/superadmin</code>.</li>
                  <li><Chip>Workspace</Chip> backed by <code className="text-xs">organizations</code>. Tenant boundary for all flows, deployments, runs, templates, partners, and clients.</li>
                  <li><Chip>Partner</Chip> backed by <code className="text-xs">partners</code>. Middle layer inside a Workspace; groups Clients for branding, reporting, and config inheritance.</li>
                  <li><Chip>Client</Chip> backed by <code className="text-xs">tenants</code>. End customer under a Partner / Workspace; holds CRM credentials and integration configs.</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-3">
                  Config merge order: <strong>Client &gt; Partner &gt; Workspace</strong>.
                </p>
              </Card>

              <Card>
                <div className="font-semibold text-foreground mb-2">Roles</div>
                <ul className="space-y-1.5 text-sm text-foreground/90">
                  <li><Chip>Superadmin</Chip> <code className="text-xs">user_roles.role = 'master_admin'</code>. Platform-wide. Only role that can read across workspaces.</li>
                  <li><Chip>Workspace Admin</Chip> <code className="text-xs">organization_members.role IN ('owner','admin')</code>. Full control inside one workspace. <code className="text-xs">owner</code> is reserved for billing, deletion, and ownership transfer once those flows ship; today identical to <code className="text-xs">admin</code>.</li>
                  <li><Chip>Workspace Member</Chip> <code className="text-xs">organization_members.role = 'member'</code>. Standard workspace user; gated by <code className="text-xs">user_permissions</code>.</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-3">
                  Source of truth: <code className="text-xs bg-secondary/60 px-1 py-0.5 rounded">src/config/hierarchy.ts</code>.
                </p>
              </Card>

              <p>
                There are six first-class entities. Each one maps to a route in the admin and a table in the
                backend. Read this list top-down — every row depends on the rows above it.
              </p>
              <div className="grid gap-3">
                {[
                  {
                    name: "Flow Template",
                    route: "/admin/templates",
                    desc:
                      "Reusable blueprint with a default Trigger, suggested Filters, baseline Mappings, an Action shape, and a Failure Policy. Templates do not run on their own.",
                  },
                  {
                    name: "Flow",
                    route: "/admin/flows",
                    desc:
                      "A Flow Template instantiated and configured by an admin in the FlowBuilder (Trigger → Filters → Mapping → Action → Failure Policy → Test → Review). A flow is the unit of versioned, testable logic.",
                  },
                  {
                    name: "Connector",
                    route: "/admin/connectors",
                    desc:
                      "A reusable integration to an external system (Clio, MyCase, Smokeball, generic Webhook, Custom HTTP). Declares its capabilities and the actions it exposes.",
                  },
                  {
                    name: "Connector Action",
                    route: "—",
                    desc:
                      "A single capability the connector exposes (e.g. upsert_contact, create_matter, post_webhook). Each action declares its target schema, which drives the Mapping step.",
                  },
                  {
                    name: "Deployment",
                    route: "/admin/deployments",
                    desc:
                      "Binds a Flow to a scope (Workspace, Client, Five9 Domain, Campaign, Queue, and disposition conditions) using a specific Connector instance. A flow without an active deployment never fires.",
                  },
                  {
                    name: "Run",
                    route: "/admin/runs",
                    desc:
                      "One execution of a deployed flow against one Five9 event. Stores request/response payloads, status, idempotency_key, retry chain, and the resolved external record.",
                  },
                ].map((row) => (
                  <Card key={row.name}>
                    <div className="flex items-baseline justify-between gap-3 flex-wrap mb-1">
                      <div className="font-semibold text-foreground">{row.name}</div>
                      {row.route !== "—" ? (
                        <Link to={row.route} className="text-xs text-primary hover:underline inline-flex items-center gap-0.5">
                          {row.route} <ChevronRight className="h-3 w-3" />
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">{row.route}</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{row.desc}</p>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          {/* Flow types */}
          <section>
            <SectionHeader id="flow-types" title="Flow types" kicker="The five Flow Templates we ship" />
            <p className="text-sm text-muted-foreground mb-4">
              These are the seed templates in <code className="text-xs bg-secondary/60 px-1 py-0.5 rounded">src/data/flow-templates.ts</code>.
              Every flow in Fabric59 starts as one of these and is configured through the FlowBuilder steps.
            </p>
            <div className="grid gap-3">
              {[
                {
                  name: "Disposition Webhook Flow",
                  trigger: "On Call Dispositioned",
                  use: "Fire a webhook to any HTTPS endpoint when a call ends with a chosen disposition.",
                  connectors: ["Webhook", "Custom HTTP"],
                },
                {
                  name: "CRM Action Flow",
                  trigger: "On Call Ended",
                  use: "Run a connector action (create matter, upsert contact, log activity) when a call event matches.",
                  connectors: ["Clio", "MyCase", "Smokeball", "Custom HTTP"],
                },
                {
                  name: "Inbound Lookup Flow",
                  trigger: "Inbound ANI Lookup",
                  use: "On inbound call, look up the caller in a connected system and surface a screen pop.",
                  connectors: ["Clio", "MyCase", "Custom HTTP"],
                },
                {
                  name: "Callback / Task Flow",
                  trigger: "Callback Requested",
                  use: "Create a follow-up task or callback record in the CRM when an agent requests one.",
                  connectors: ["Clio", "MyCase"],
                },
                {
                  name: "Custom Relay Flow",
                  trigger: "Webhook / arbitrary event",
                  use: "Forward any Five9 event to an arbitrary HTTP endpoint with a custom payload.",
                  connectors: ["Webhook", "Custom HTTP"],
                },
              ].map((f) => (
                <Card key={f.name}>
                  <div className="font-semibold text-foreground mb-1">{f.name}</div>
                  <div className="text-xs text-muted-foreground mb-2">
                    Trigger: <Chip>{f.trigger}</Chip>
                  </div>
                  <p className="text-sm text-foreground/90 mb-2">{f.use}</p>
                  <div className="flex flex-wrap gap-1">
                    {f.connectors.map((c) => (
                      <Chip key={c}>{c}</Chip>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </section>

          {/* Connector model */}
          <section>
            <SectionHeader id="connectors" title="Connector model" kicker="Reusable integration surfaces" />
            <div className="space-y-4 text-sm text-foreground/90 leading-relaxed">
              <p>
                A Connector is a reusable adapter to an external system. Each connector declares two things
                that the rest of the platform consumes:
              </p>
              <Card>
                <div className="font-semibold mb-1">Capabilities</div>
                <p className="text-sm text-muted-foreground mb-2">
                  Boolean flags that tell the FlowBuilder which Flow Templates this connector can be used with,
                  and what auth / health-check pattern it follows.
                </p>
                <div className="flex flex-wrap gap-1">
                  {[
                    "supportsActionFlows",
                    "supportsLookupFlows",
                    "supportsWebhookRelay",
                    "supportsCallbackTaskFlows",
                    "supportsTwoWaySync",
                    "authType",
                    "healthCheckType",
                  ].map((c) => (
                    <Chip key={c}>{c}</Chip>
                  ))}
                </div>
              </Card>
              <Card>
                <div className="font-semibold mb-1">Actions</div>
                <p className="text-sm text-muted-foreground mb-2">
                  Each connector exposes a set of actions (e.g. <code className="text-xs">upsert_contact</code>,
                  {" "}<code className="text-xs">create_matter</code>, <code className="text-xs">create_task</code>,
                  {" "}<code className="text-xs">post_webhook</code>, <code className="text-xs">http_request</code>).
                  Each action declares <strong>which templates it applies to</strong> and a <strong>target
                  schema</strong>. The Mapping step in the FlowBuilder is generated from that target schema.
                </p>
              </Card>
              <p>
                Source of truth: <code className="text-xs bg-secondary/60 px-1 py-0.5 rounded">src/data/connector-actions.ts</code>.
                Use <code className="text-xs">connectorsForTemplate(templateKey)</code> to filter the connector
                picker; never hard-code lists in the UI.
              </p>
              <p className="text-muted-foreground">
                Adding a new system (e.g. Lawmatics, Litify, CosmoLex, PracticePanther) means: add a{" "}
                <Chip>ConnectorDef</Chip>, declare its capabilities, declare its actions and target schemas.
                No FlowBuilder changes are required.
              </p>
            </div>
          </section>

          {/* Deployment model */}
          <section>
            <SectionHeader id="deployments" title="Deployment model" kicker="Where and when a flow runs" />
            <div className="space-y-4 text-sm text-foreground/90 leading-relaxed">
              <p>
                A Flow is just a definition. A <strong>Deployment</strong> is what actually subscribes that flow
                to a real Five9 event in a real environment. Deployments are scoped to a <strong>Workspace</strong>{" "}
                (<code className="text-xs">organization_id</code>) and may optionally relate to a <strong>Client</strong>{" "}
                (<code className="text-xs">tenant_id</code> / <code className="text-xs">client_id</code>). A deployment binds:
              </p>
              <div className="grid gap-3">
                <Card>
                  <div className="font-semibold mb-1">Scope</div>
                  <div className="flex flex-wrap gap-1">
                    {["Workspace", "Client", "Five9 Domain", "Campaign", "Queue"].map((c) => (
                      <Chip key={c}>{c}</Chip>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Scope follows the SaaS hierarchy: Workspace &gt; Client. Configs merge Client &gt; Partner &gt; Org.
                  </p>
                </Card>
                <Card>
                  <div className="font-semibold mb-1">Conditions</div>
                  <p className="text-sm text-muted-foreground">
                    Disposition conditions, ANI patterns, time windows. Evaluated <em>after</em> the Flow's
                    own Filters step — deployment conditions are an outer guard, Filters are inner business rules.
                  </p>
                </Card>
                <Card>
                  <div className="font-semibold mb-1">Connector instance</div>
                  <p className="text-sm text-muted-foreground">
                    The specific configured connector (with credentials) the flow's Action will run against.
                    The same Flow can be deployed twice — once against client A's Clio, once against client B's MyCase.
                  </p>
                </Card>
                <Card>
                  <div className="font-semibold mb-1">State</div>
                  <div className="flex flex-wrap gap-1">
                    {["draft", "active", "paused", "archived"].map((c) => (
                      <Chip key={c}>{c}</Chip>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Only <Chip>active</Chip> deployments can produce Runs. Pausing a deployment is the safe kill switch.
                  </p>
                </Card>
              </div>
            </div>
          </section>

          {/* Runs & reliability */}
          <section>
            <SectionHeader id="runs" title="Runs & reliability" kicker="What happens per Five9 event" />
            <div className="space-y-4 text-sm text-foreground/90 leading-relaxed">
              <p>
                When a Five9 event arrives, the dispatcher resolves the matching active deployments, runs the
                configured Flow against the event, and writes one <strong>Run</strong> row per deployment per
                event. The Run row is the single source of truth for what happened.
              </p>
              <Card>
                <div className="font-semibold mb-2">Run row anatomy</div>
                <div className="flex flex-wrap gap-1">
                  {[
                    "id",
                    "flow_id",
                    "deployment_id",
                    "connector_id",
                    "trigger_event",
                    "request_payload",
                    "response_payload",
                    "status",
                    "idempotency_key",
                    "retry_chain",
                    "external_record_id",
                    "created_at",
                  ].map((c) => (
                    <Chip key={c}>{c}</Chip>
                  ))}
                </div>
              </Card>
              <Card>
                <div className="font-semibold mb-1">Failure Policy (per flow)</div>
                <p className="text-sm text-muted-foreground">
                  Defined in the FlowBuilder's Failure step. Controls retries, backoff, dead-letter behavior,
                  and whether the run is flagged for human review on failure. The runner is responsible for
                  honoring this — UI just configures it.
                </p>
              </Card>
              <Card>
                <div className="font-semibold mb-1">Idempotency</div>
                <p className="text-sm text-muted-foreground">
                  Every dispatch carries an <Chip>idempotency_key</Chip> derived from
                  {" "}<code className="text-xs">callId + tenantId + disposition</code>. Connectors must treat
                  it as a dedupe token. The TestStep, dispatch preview, and Run Report all surface this key
                  so engineers can verify how it's sent.
                </p>
              </Card>
              <Card>
                <div className="font-semibold mb-1">Retry & replay</div>
                <p className="text-sm text-muted-foreground">
                  The retry chain is appended to the same Run row, never written as a new Run. Manual replay
                  from the Run detail page reuses the original request payload and idempotency key so the
                  downstream system sees the same operation.
                </p>
              </Card>
            </div>
          </section>

          {/* Guardrails */}
          <section>
            <SectionHeader id="guardrails" title="Guardrails" kicker="Things to keep true as we finish the build" />
            <div className="space-y-3 text-sm text-foreground/90 leading-relaxed">
              {[
                {
                  t: "Reuse FlowBuilder terminology everywhere",
                  d: "Trigger, Filters, Mapping, Action, Failure Policy, Test, Review. Don't invent synonyms in docs, errors, or analytics events.",
                },
                {
                  t: "Connectors are reusable, not bespoke",
                  d: "Never branch logic per client inside a connector. Per-client behavior lives in the Flow's Mappings/Filters and in the Deployment's connector instance + conditions.",
                },
                {
                  t: "Templates drive the catalog, not the UI",
                  d: "Connector pickers and template choices come from the data layer (flow-templates.ts, connector-actions.ts via connectorsForTemplate). No hard-coded lists in pages.",
                },
                {
                  t: "Every dispatch produces a Run",
                  d: "If a Five9 event hit a matching active deployment, a Run row exists — even on validation failure. Silent drops are bugs.",
                },
                {
                  t: "Idempotency is non-negotiable",
                  d: "callId + tenantId + disposition. Same key + same payload = same downstream record. The platform must guarantee this regardless of connector.",
                },
                {
                  t: "Multi-tenant isolation",
                  d: "All reads filtered by org_id via RLS plus an explicit org_id filter in queries. Views use security_invoker=true. Use SECURITY DEFINER only for org membership checks.",
                },
                {
                  t: "Five9 stays the spine",
                  d: "Agents do not log into CRMs directly. All call-time context flows through the Five9 Desktop, fed by Inbound Lookup flows and post-call CRM Action flows.",
                },
              ].map((g) => (
                <Card key={g.t}>
                  <div className="font-semibold text-foreground mb-1">{g.t}</div>
                  <p className="text-sm text-muted-foreground">{g.d}</p>
                </Card>
              ))}
            </div>
          </section>

          {/* Clio Grow MVP — Phase 1.1 hardened */}
          <section>
            <SectionHeader
              id="clio-grow-mvp"
              title="Clio Grow MVP (Phase 1)"
              kicker="Native Five9 → Clio Grow Lead Inbox"
            />
            <div className="space-y-4 text-sm text-foreground/90 leading-relaxed">
              <Card>
                <div className="font-semibold text-foreground mb-2">Why these decisions</div>
                <ul className="space-y-1.5 text-sm">
                  <li>
                    <Chip>Auth</Chip> Phase 1 uses the Clio Grow <strong>Lead Inbox token</strong>
                    {" "}(per-inbox value pasted in the wizard) — Grow does not expose an OAuth
                    refresh flow for inbound lead creation.
                  </li>
                  <li>
                    <Chip>Mapping</Chip> The canonical mapping store is{" "}
                    <code className="text-xs">legal_connect_call_variable_mappings</code> + the{" "}
                    <code className="text-xs">legal_connect_disposition_mappings.metadata.create_lead</code>
                    {" "}flag. <code className="text-xs">field_mappings</code> + the visual builder
                    remain a parallel UI to be reconciled later.
                  </li>
                  <li>
                    <Chip>Inline dispatch</Chip> Existing inline Clio Manage / MyCase paths in{" "}
                    <code className="text-xs">five9-main</code> are intentionally untouched. Clio
                    Grow runs alongside them through the adapter + sync-job path only.
                  </li>
                  <li>
                    <Chip>Idempotency</Chip> Producer key is{" "}
                    <code className="text-xs">clio_grow:lead.create:&lt;correlation_id&gt;</code>. A
                    duplicate Five9 event for the same correlation id is rejected at insert time
                    and recorded as <code className="text-xs">producer_skip_reason = duplicate_event</code>.
                  </li>
                </ul>
              </Card>

              <Card>
                <div className="font-semibold text-foreground mb-2">Runtime path</div>
                <ol className="list-decimal pl-5 space-y-1.5 text-sm">
                  <li>Five9 ESS posts the disposition event to <Chip>five9-main</Chip>.</li>
                  <li><Chip>normalizer</Chip> shapes the payload, <Chip>router</Chip> resolves tenant + provider_target.</li>
                  <li><Chip>disposition engine</Chip> evaluates capability-driven actions (capability <code className="text-xs">create_lead</code>).</li>
                  <li>Producer enqueues a row in <Chip>legal_connect_sync_jobs</Chip> (provider <code className="text-xs">clio_grow</code>, type <code className="text-xs">lead.create</code>).</li>
                  <li><Chip>five9_event_log</Chip> row records correlation id, mapped actions, sync_jobs_created and any <code className="text-xs">producer_skip_reason</code>.</li>
                  <li><Chip>legal-connect-jobs</Chip> picks up the queued job, calls the <Chip>clio-grow</Chip> adapter.</li>
                  <li>Adapter POSTs to <code className="text-xs">https://grow.clio.com/inbox_leads</code> with the inbox_lead_token from the connection.</li>
                  <li>Result + connection health pointers are written back to <Chip>legal_connect_connections</Chip>.</li>
                </ol>
                <p className="text-xs text-muted-foreground mt-3">
                  Failures bypassing job creation (no connection / missing required field) open a
                  <code className="mx-1 px-1 rounded bg-secondary/60">legal_connect_review_queue</code>
                  item with <code className="text-xs">review_type = no_connection | validation_failure</code>.
                </p>
              </Card>

              <Card>
                <div className="font-semibold text-foreground mb-2">Failure classification</div>
                <ul className="space-y-1 text-sm">
                  <li><Chip>validation</Chip> 400/422 or local pre-flight failure — non-retryable.</li>
                  <li><Chip>auth</Chip> 401/403 from Grow — non-retryable, surface "bad token".</li>
                  <li><Chip>rate_limited</Chip> 429 — retryable with backoff.</li>
                  <li><Chip>upstream_5xx</Chip> 5xx from Grow — retryable.</li>
                  <li><Chip>timeout</Chip> 15s adapter cutoff — retryable.</li>
                  <li><Chip>network</Chip> fetch failure — retryable.</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-3">
                  The wizard maps these <code className="text-xs">failure_kind</code> values to
                  human copy. The token is never echoed in logs or errors.
                </p>
              </Card>

              <Card>
                <div className="font-semibold text-foreground mb-2">End-to-end test flow</div>
                <ol className="list-decimal pl-5 space-y-1 text-sm">
                  <li>Connect Grow token via the client-level wizard at{" "}
                    <code className="text-xs">/admin/clients/:id/legal-connect/setup/clio_grow</code>.
                  </li>
                  <li>Run the wizard's <strong>Send test lead</strong> step and confirm a
                    <code className="mx-1 px-1 rounded bg-secondary/60">fabric59:test</code> lead appears in Grow.
                  </li>
                  <li>Configure a route with <code className="text-xs">provider_target = clio_grow</code> in{" "}
                    <code className="text-xs">five9_campaign_routes</code> (or via the UI).</li>
                  <li>Add a disposition mapping with{" "}
                    <code className="text-xs">metadata.create_lead = true</code> in{" "}
                    <code className="text-xs">legal_connect_disposition_mappings</code>.</li>
                  <li>Trigger or replay an ESS-style <code className="text-xs">disposition</code>
                    event against <Chip>five9-main</Chip>.</li>
                  <li>Inspect the <strong>Clio Grow delivery</strong> panel on{" "}
                    <code className="text-xs">/admin/legal-connect/overview</code>: the job row,
                    matched event, review queue items and skip reasons all join by{" "}
                    <code className="text-xs">correlation_id</code>.</li>
                  <li>Verify the lead lands in the Grow inbox.</li>
                </ol>
              </Card>

              <Card>
                <div className="font-semibold text-foreground mb-2">Call lifecycle reminder</div>
                <p className="text-sm">
                  In the MVP, lead creation runs from the <strong>post-disposition</strong> phase
                  only — not pre-call, during-call, or ACW. This matches the Lead Inbox use case
                  (final outcome → lead) and keeps the producer idempotent against
                  <code className="mx-1 px-1 rounded bg-secondary/60">correlation_id</code>.
                </p>
                <ul className="text-xs text-muted-foreground space-y-1 mt-2">
                  <li><Chip>Pre-call</Chip> ANI lookup / screen-pop (untouched in this phase).</li>
                  <li><Chip>During call</Chip> agent script + call variables.</li>
                  <li><Chip>ACW</Chip> agent finalises disposition + notes.</li>
                  <li><Chip>Post disposition</Chip> Five9 emits ESS event → producer fires.</li>
                </ul>
              </Card>
            </div>
          </section>


          <section>
            <SectionHeader
              id="qa-handoff"
              title="QA & Implementation Handoff – Fabric59 (May 2026)"
              kicker="Baseline · PR #1 · Remaining work"
            />
            <div className="space-y-4 text-sm text-foreground/90 leading-relaxed">
              <Card>
                <div className="font-semibold text-foreground mb-2">Baseline status</div>
                <p className="text-sm text-muted-foreground">
                  As of <strong>May 5, 2026</strong>, Fabric59 is wired end-to-end for: the 8 Feature
                  Vault entries and their playbooks, the export pipeline, the Five9 Test Connection
                  edge function, the superadmin route directory, and the multi-step onboarding
                  wizard. <strong>PR #1 — "QA handoff fixes"</strong> (merged into <code className="text-xs bg-secondary/60 px-1 py-0.5 rounded">main</code>) is the
                  baseline this Dev Guide assumes. Build on top of that commit; do not reintroduce
                  the dead-ends listed below.
                </p>
              </Card>

              <Card>
                <div className="font-semibold text-foreground mb-2">What was fixed in the QA pass</div>
                <ul className="space-y-2 text-sm text-foreground/90">
                  {[
                    <>Top-level routes (<code className="text-xs">/vault</code>, <code className="text-xs">/five9</code>, <code className="text-xs">/legal-connect</code>, <code className="text-xs">/settings</code>, <code className="text-xs">/master/vault/:id</code>) now redirect to their canonical destinations instead of 404.</>,
                    <>Legal Connect: <Chip>Connect</Chip> <Chip>Refresh</Chip> <Chip>View</Chip> buttons are wired to real navigation and react-query invalidation (no longer inert).</>,
                    <>Five9 Overview &amp; Legal Connect Overview: webhook/health badges reflect real 24h health from <code className="text-xs">five9_event_log</code> and <code className="text-xs">legal_sync_jobs</code>, not hardcoded "OK".</>,
                    <>Vault Export <Chip>Download</Chip> now forces a real file download instead of opening a crashing tab.</>,
                    <>Settings → <Chip>Export Compliance Report</Chip> returns an honest client-side JSON snapshot (no secrets), instead of a toast-only stub.</>,
                    <><code className="text-xs">/admin/domains/:id</code> surfaces <Chip>Test Connection</Chip> on the locked state for already-connected domains.</>,
                    <>Feature Vault experimental items (Legal Connect, Five9 Domain Management) show status-aware cards and deep links to live pages instead of misleading "Why archived —".</>,
                  ].map((item, i) => (
                    <li key={i} className="flex gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              <Card>
                <div className="font-semibold text-foreground mb-1">Still to do</div>
                <p className="text-xs text-muted-foreground mb-3">
                  Future product/engineering work — not gaps in core routing or wiring.
                </p>
                <ul className="space-y-2 text-sm text-foreground/90">
                  {[
                    "Implement real Clio / MyCase OAuth and Five9 credential save on the Legal Connect Connections tab (replace fake \"connected\" rows).",
                    "Implement real Test behavior for the Mapping Builder instead of a toast-only stub.",
                    "Author reason_archived / Status & risks content for Legal Connect and Five9 Domain Management vault entries.",
                    "Build an audit-grade server-side compliance export (logs, RLS snapshot, etc.) to replace the client-only JSON snapshot.",
                    "Reduce bundle size via code-splitting (current bundle ~4.3 MB / 1.0 MB gz).",
                    "Polish Legal Connect empty states across tabs.",
                    "Move .env Supabase URL/anon-key configuration into the secret store while keeping public client exposure behavior intact.",
                  ].map((item, i) => (
                    <li key={i} className="flex gap-2">
                      <Circle className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              <Card>
                <div className="font-semibold text-foreground mb-2">Quick QA playbook summary</div>
                <p className="text-sm text-muted-foreground">
                  The QA pass validated the full navigation surface — admin, superadmin, Feature
                  Vault, Legal Connect's 11 tabs, Five9 domain detail, Settings tabs, onboarding,
                  and more. All dead-ends and toast-only actions identified at that time are either
                  fixed in PR #1 or explicitly listed in the "Still to do" checklist above.
                </p>
              </Card>

              <Card>
                <div className="font-semibold text-foreground mb-2">References</div>
                <ul className="space-y-1.5 text-sm text-foreground/90">
                  <li>· Merged PR: <strong>PR #1 — "QA handoff fixes"</strong> (baseline on <code className="text-xs">main</code>).</li>
                  <li>· Merge commit SHA on <code className="text-xs">main</code> is the canonical baseline for this guide.</li>
                  <li>· Detailed QA report and Lovable prompts file live in the repo/workspace for deep dives — this Dev Guide section is the canonical day-to-day summary.</li>
                </ul>
              </Card>
            </div>
          </section>

          {/* Phase 2 — Constants, Worksheets, Preview, Delivery */}
          <section>
            <SectionHeader
              id="clio-grow-phase2"
              title="Phase 2 — Constants, Worksheets, Preview & Delivery"
              kicker="Operational extensions on top of the Phase 1 MVP"
            />
            <div className="space-y-4 text-sm text-foreground/90 leading-relaxed">
              <Card>
                <div className="font-semibold text-foreground mb-2">Mapping source model</div>
                <ul className="space-y-1.5 text-sm">
                  <li><Chip>five9_call_variable</Chip> Native call variables flattened by the normalizer.</li>
                  <li><Chip>five9_disposition_field</Chip> Disposition + agent notes.</li>
                  <li><Chip>five9_connector_param</Chip> Connector inputs.</li>
                  <li><Chip>derived</Chip> Runtime values (e.g. <code className="text-xs">ani</code>).</li>
                  <li><Chip>constant</Chip> Static admin-defined values stored on <code className="text-xs">default_value</code> with <code className="text-xs">source_location='constant'</code>.</li>
                  <li><Chip>worksheet</Chip> Structured intake responses captured during ACW.</li>
                </ul>
                <p className="mt-2 text-muted-foreground text-xs">
                  <code className="text-xs">legal_connect_call_variable_mappings</code> remains the
                  execution source of truth.
                </p>
              </Card>

              <Card>
                <div className="font-semibold text-foreground mb-2">Worksheet lifecycle</div>
                <ol className="list-decimal pl-5 space-y-1 text-sm">
                  <li>Admin defines fields in <code className="text-xs">worksheet_field_definitions</code> (per client/campaign).</li>
                  <li>During the call or (typically) ACW, an agent fills the <Chip>WorksheetCapturePanel</Chip>; the responses are saved to <code className="text-xs">worksheet_responses</code> keyed by <code className="text-xs">correlation_id</code>.</li>
                  <li>When Five9 fires the post-call event, <code className="text-xs">five9-main</code> looks up the latest worksheet response for the correlation id and passes it to <Chip>resolveGrowLead</Chip> alongside the mapping rows.</li>
                  <li>The resolved snapshot is stored on <code className="text-xs">five9_event_log.worksheet_payload</code> for replay/inspection.</li>
                </ol>
              </Card>

              <Card>
                <div className="font-semibold text-foreground mb-2">Payload preview &amp; delivery dashboard</div>
                <ul className="space-y-1.5 text-sm">
                  <li><Chip>PayloadPreviewPanel</Chip> dry-runs the resolver client-side: editable sample event + worksheet, per-field provenance, validation errors, and the redacted final payload that would POST to <code className="text-xs">grow.clio.com/inbox_leads</code>.</li>
                  <li><Chip>DeliveryDashboard</Chip> joins <code className="text-xs">legal_connect_sync_jobs</code>, <code className="text-xs">five9_event_log</code>, and <code className="text-xs">legal_connect_review_queue</code>. Filter by provider/status, search by correlation id, click-through opens an inspector with normalized event, worksheet snapshot, review items, and redacted payload.</li>
                  <li>Skip reasons (no_connection, validation, duplicate_event, etc.) are aggregated from <code className="text-xs">mapped_actions.producer_skip_reason</code>.</li>
                </ul>
              </Card>
            </div>
          </section>

          {/* Phase 3 — Caller Outcomes & Jobs Consolidation */}
          <section>
            <SectionHeader
              id="phase3-outcomes"
              title="Phase 3 — Caller Outcomes & Jobs Consolidation"
              kicker="Classification, outcome routing, and provider-agnostic execution"
            />
            <div className="space-y-4 text-sm text-foreground/90 leading-relaxed">
              <Card>
                <div className="font-semibold text-foreground mb-2">Why classification matters</div>
                <p>
                  Every Five9 call now carries two classification fields the agent (or admin)
                  sets in the worksheet at wrap-up: <Chip>caller_type</Chip> and{" "}
                  <Chip>call_reason</Chip>. These are the only inputs the outcome engine needs to
                  decide what should happen downstream — create an intake, log a note, fire a
                  follow-up task, send an email, or do nothing at all. They live inside{" "}
                  <code className="text-xs">worksheet_responses.responses</code> under the exact
                  keys the engine expects.
                </p>
              </Card>

              <Card>
                <div className="font-semibold text-foreground mb-2">How the outcome engine decides</div>
                <ul className="space-y-1.5 text-sm">
                  <li>· <strong>New leads</strong> with a real reason (new_case, appointment_request) → <Chip>create_intake</Chip> + email.</li>
                  <li>· <strong>Current clients</strong> are <strong>never</strong> turned into intakes. They get notes, follow-up tasks, or email-only outcomes (status_check, billing_question).</li>
                  <li>· <strong>Third parties</strong> (adjusters, providers) → notes only.</li>
                  <li>· <strong>Wrong number / spam</strong> → <Chip>no_writeback</Chip> regardless of caller type.</li>
                  <li>· Per-client overrides live in <code className="text-xs">legal_connect_disposition_mappings.metadata.outcome_overrides</code> keyed by <code className="text-xs">caller_type:call_reason</code>.</li>
                </ul>
              </Card>

              <Card>
                <div className="font-semibold text-foreground mb-2">Adapters &amp; jobs path</div>
                <p>
                  The producer (<code className="text-xs">five9-main</code>) no longer dispatches
                  to Clio Manage / MyCase inline by default. It enqueues one row per outcome
                  action into <code className="text-xs">legal_connect_sync_jobs</code> with a
                  normalized job type (<Chip>lead.create</Chip>, <Chip>note.create</Chip>,{" "}
                  <Chip>task.create</Chip>, <Chip>contact.update</Chip>, <Chip>email.send</Chip>).
                  The worker resolves a connection, picks the matching adapter, and runs it
                  through <Chip>runAdapter()</Chip> from{" "}
                  <code className="text-xs">_shared/legal-job-adapters.ts</code>. Failures are
                  classified into <Chip>auth</Chip>, <Chip>rate_limited</Chip>,{" "}
                  <Chip>validation</Chip>, <Chip>upstream_4xx/5xx</Chip>, <Chip>network</Chip>,{" "}
                  <Chip>timeout</Chip>, <Chip>unsupported</Chip> — the dashboard surfaces the
                  same vocabulary.
                </p>
              </Card>

              <Card>
                <div className="font-semibold text-foreground mb-2">execution_mode flag</div>
                <ul className="space-y-1.5 text-sm">
                  <li>· <Chip>jobs</Chip> (default for all tenants) — outcome producer enqueues jobs; legacy inline Manage/MyCase dispatch is skipped.</li>
                  <li>· <Chip>inline</Chip> — escape hatch, runs the legacy inline Manage/MyCase path. Used only for rollback scenarios.</li>
                  <li>· Stored on <code className="text-xs">tenants.integration_configs.execution_mode</code>; visible per-row in the Delivery dashboard "Mode" column.</li>
                </ul>
              </Card>

              <Card>
                <div className="font-semibold text-foreground mb-2">Email-only outcomes</div>
                <p>
                  Outcomes resolving to <Chip>send_post_call_email</Chip> enqueue a job with{" "}
                  <code className="text-xs">provider="post_call_email"</code> and{" "}
                  <code className="text-xs">job_type="email.send"</code>. The worker delegates to
                  the existing post-call automations engine (matched on client +
                  disposition) and records the matched automation ids on the job output. No CRM
                  write happens for these calls.
                </p>
              </Card>

              <Card>
                <div className="font-semibold text-foreground mb-2">Reading the dashboard</div>
                <ul className="space-y-1.5 text-sm">
                  <li>· Filter by provider (clio_grow, clio_manage, mycase, post_call_email), status, caller_type, and outcome action.</li>
                  <li>· Each row shows the resolved caller_type, call_reason, outcome action, and execution_mode for the call.</li>
                  <li>· Click any row to inspect the classification, normalized event, worksheet snapshot, redacted payload, provider response, and any review-queue items.</li>
                  <li>· Failure classes prefixed with <code className="text-xs">adapter:</code> (e.g. <code className="text-xs">adapter:rate_limited</code>) come from the new adapter contract.</li>
                </ul>
              </Card>

              <Card>
                <div className="font-semibold text-foreground mb-2">End-to-end flow</div>
                <pre className="text-[11px] font-mono p-3 rounded bg-muted/40 border border-border/60 overflow-auto leading-relaxed">{`Five9 ESS event
  → five9-main
       ├── normalize + worksheet snapshot
       ├── extractClassification (caller_type, call_reason)
       ├── resolveOutcomeActions(...)
       └── enqueue 1 job per action
             ├── provider job (clio_grow / clio_manage / mycase)
             └── post_call_email job
  → legal-connect-jobs worker
       ├── runAdapter(executor) per provider
       └── classifyAdapterError → failure_classification
  → Delivery dashboard + review queue`}</pre>
              </Card>
            </div>
          </section>

          {/* Phase 4 Slice 2 — Guided test runner & live credential validation */}
          <section>
            <SectionHeader
              id="phase4-slice2"
              title="Phase 4 Slice 2 — Guided test runner"
              kicker="Live credential validation, write-back probes, and email-only verification"
            />
            <div className="space-y-4 text-sm text-foreground/90 leading-relaxed">
              <Card>
                <div className="font-semibold text-foreground mb-2">What it does</div>
                <p>
                  The Tests tab inside <code className="text-xs">/admin/clients/:id/legal-connect</code> exposes a
                  guided runner for each provider connection. The team can run four
                  test types: <Chip>runAuthTest</Chip>, <Chip>runLookupTest</Chip>, <Chip>runWriteBackTest</Chip>,{" "}
                  <Chip>runEmailOnlyTest</Chip>. All four are routed through the existing{" "}
                  <code className="text-xs">legal-connect-test</code> edge function.
                </p>
              </Card>
              <Card>
                <div className="font-semibold text-foreground mb-2">How test runs are recorded</div>
                <ul className="space-y-1.5 text-sm">
                  <li>· Every guided run inserts into <code className="text-xs">legal_connect_test_runs</code> with <code className="text-xs">test_category="guided"</code>.</li>
                  <li>· Write-back and email-only tests enqueue real <code className="text-xs">legal_connect_sync_jobs</code> with <code className="text-xs">input_payload.__test__ = true</code> and a <code className="text-xs">correlation_id</code> prefixed <code className="text-xs">test_</code>.</li>
                  <li>· The Delivery dashboard shows a <Chip>Test</Chip> badge on those rows and defaults to hiding them via the new "Hide test runs" filter.</li>
                </ul>
              </Card>
              <Card>
                <div className="font-semibold text-foreground mb-2">Readiness impact</div>
                <p>
                  Passing tests automatically tick the matching go-live checklist item:
                  auth → <Chip>auth_valid</Chip>, write-back → <Chip>test_call_verified</Chip>, email →{" "}
                  <Chip>email_templates</Chip>. The rest stay manual.
                </p>
              </Card>
              <Card>
                <div className="font-semibold text-foreground mb-2">Reading failures</div>
                <p>
                  Errors are translated into plain English (<em>"Provider rejected our credentials"</em>) plus
                  a next-step hint (<em>"Reconnect the provider in the Connections tab."</em>). Raw error text is
                  preserved on the test run row for engineers but hidden from the main UX.
                </p>
              </Card>
              <Card>
                <div className="font-semibold text-foreground mb-2">Internal client validation flow</div>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Connect the provider in the Connections tab.</li>
                  <li>Open the Tests tab → run <Chip>Test connection</Chip>.</li>
                  <li>For Clio Manage / MyCase, run <Chip>Test caller lookup</Chip>.</li>
                  <li>Run <Chip>Test note or task write-back</Chip> — verify the row appears on the Delivery dashboard with a Test badge and reaches <Chip>succeeded</Chip>.</li>
                  <li>Run <Chip>Test email-only outcome</Chip> if the client has email templates.</li>
                  <li>Confirm the readiness checklist auto-ticked the relevant items, then promote the client to <Chip>ready_for_live</Chip>.</li>
                </ol>
              </Card>
            </div>
          </section>

          {/* Phase 4 Slice 3 — In-product guides, internal playbooks, reusable templates */}
          <section>
            <SectionHeader
              id="phase4-slice3"
              title="Phase 4 Slice 3 — Guides &amp; playbooks"
              kicker="Built-in quick-starts for clients, procedural playbooks for operators"
            />
            <div className="space-y-4 text-sm text-foreground/90 leading-relaxed">
              <Card>
                <div className="font-semibold text-foreground mb-2">Where guides live</div>
                <p>
                  A new <Chip>Guides</Chip> tab on{" "}
                  <code className="text-xs">/admin/clients/:id/legal-connect</code> hosts both client quick-starts
                  and internal playbooks. A reusable <code className="text-xs">GuideDrawer</code> can be popped from
                  anywhere via <code className="text-xs">openGuideDrawer(provider, sectionId?)</code>.
                </p>
              </Card>
              <Card>
                <div className="font-semibold text-foreground mb-2">Client vs internal</div>
                <ul className="space-y-1.5 text-sm">
                  <li>· <strong>Client guides</strong> live in <code className="text-xs">CLIENT_GUIDES</code> in <code className="text-xs">src/data/legal-connect-guides.ts</code>. Plain English, scannable, six fixed sections (what, prereq, connect, test, success, issues).</li>
                  <li>· <strong>Internal playbooks</strong> live in <code className="text-xs">INTERNAL_PLAYBOOKS</code>. Step-by-step procedures for ops — onboarding, safe-mode, outcome routing, pause/recover.</li>
                  <li>· The two never mix in the UI: separate tabs inside <Chip>GuidesPanel</Chip>, separate badges (Client vs Internal).</li>
                </ul>
              </Card>
              <Card>
                <div className="font-semibold text-foreground mb-2">Contextual links</div>
                <ul className="space-y-1.5 text-sm">
                  <li>· Connected provider capability cards in Readiness expose a <Chip>Guide</Chip> link → opens the matching client guide.</li>
                  <li>· Each provider card in the guided test runner exposes a <Chip>Guide</Chip> link.</li>
                  <li>· On a failed test, the result card links straight to the <Chip>Common issues</Chip> section of that provider's guide.</li>
                </ul>
              </Card>
              <Card>
                <div className="font-semibold text-foreground mb-2">Reusable template structure</div>
                <p>
                  Both <code className="text-xs">ProviderGuide</code> and <code className="text-xs">InternalPlaybook</code>
                  are typed structures. Adding a new legal software provider means appending one entry to{" "}
                  <code className="text-xs">CLIENT_GUIDES</code> using the same six-section shape — no new screens or
                  routes are required. Section IDs are exported as <code className="text-xs">SECTION</code> so
                  contextual deep-links stay consistent across providers.
                </p>
              </Card>
              <Card>
                <div className="font-semibold text-foreground mb-2">How we onboard a new legal software provider in the future</div>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Add a connection wizard under <code className="text-xs">components/legal-connect/wizards/</code>.</li>
                  <li>Add provider capabilities to <Chip>PROVIDER_CAPS</Chip> in the Readiness panel.</li>
                  <li>Add a job adapter in <code className="text-xs">supabase/functions/_shared/legal-job-adapters.ts</code>.</li>
                  <li>Append an entry to <Chip>CLIENT_GUIDES</Chip> with the six standard sections.</li>
                  <li>Optionally add an internal playbook describing provider-specific quirks.</li>
                  <li>The Guides tab, drawer, contextual links, and tests pick it up automatically.</li>
                </ol>
              </Card>
            </div>
          </section>

          {/* Phase 5 Slice 2 — Pilot approval & templates */}
          <section>
            <SectionHeader
              id="phase5-slice2"
              title="Phase 5 Slice 2 — Pilot approval &amp; templates"
              kicker="Go / no-go checklist + reusable pilot plans for design partners"
            />
            <div className="space-y-4 text-sm text-foreground/90 leading-relaxed">
              <Card>
                <div className="font-semibold text-foreground mb-2">Where it lives</div>
                <p>
                  A new <Chip>PilotApprovalPanel</Chip> sits on the Readiness tab between the
                  Design Partner card and the existing Client Readiness panel. It is internal-only —
                  clients do not see it.
                </p>
              </Card>
              <Card>
                <div className="font-semibold text-foreground mb-2">Go / no-go checklist</div>
                <ul className="space-y-1.5 text-sm">
                  <li>· Defined in <code className="text-xs">src/data/legal-connect-pilot.ts</code> as <Chip>PILOT_CHECKLIST</Chip>.</li>
                  <li>· Each item has <Chip>required</Chip>, an ops description, a status (<Chip>pending</Chip>, <Chip>complete</Chip>, <Chip>na</Chip>), and an optional note.</li>
                  <li>· State stored on <code className="text-xs">tenants.legal_connect_pilot_checklist</code> JSONB. Each entry records who updated it and when.</li>
                </ul>
              </Card>
              <Card>
                <div className="font-semibold text-foreground mb-2">Approval flow</div>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>Operator works the checklist, marking items complete or N/A.</li>
                  <li>Once all required items are complete, <Chip>Mark ready for pilot</Chip> moves <code className="text-xs">pilot_status → ready_for_pilot</code>.</li>
                  <li><Chip>Approve for pilot</Chip> sets <code className="text-xs">pilot_status → approved</code>, records who approved (and when) on <code className="text-xs">pilot_approval</code>, and auto-advances <code className="text-xs">rollout_status → ready_for_live</code> when behind.</li>
                  <li>If required items are missing the approver must explicitly confirm an override.</li>
                  <li><Chip>Block</Chip> requires a reason and sets <code className="text-xs">pilot_status → blocked</code> with the stored block reason visible in the ops view.</li>
                </ol>
              </Card>
              <Card>
                <div className="font-semibold text-foreground mb-2">Pilot templates</div>
                <ul className="space-y-1.5 text-sm">
                  <li>· Defined as <Chip>PILOT_TEMPLATES</Chip>: <em>New leads only</em>, <em>New leads + client notes</em>, <em>Email-first cautious rollout</em>, <em>Full pilot</em>.</li>
                  <li>· Each template lists what it allows, what it restricts, and a recommended safe-mode level.</li>
                  <li>· Assignment stored as <code className="text-xs">tenants.legal_connect_pilot_template</code>; surfaced on the panel and on <code className="text-xs">/superadmin/design-partners</code>.</li>
                  <li>· Adding a new template = appending one entry to <Chip>PILOT_TEMPLATES</Chip>.</li>
                </ul>
              </Card>
              <Card>
                <div className="font-semibold text-foreground mb-2">Ops view</div>
                <p>
                  <code className="text-xs">/superadmin/design-partners</code> now includes Pilot status, missing required items,
                  active template, and any block reason — alongside the existing rollout stage and readiness.
                </p>
              </Card>
              <Card>
                <div className="font-semibold text-foreground mb-2">Example flow</div>
                <pre className="text-[11px] font-mono p-3 rounded bg-muted/40 border border-border/60 overflow-auto leading-relaxed">{`Design partner connected
  → guided tests pass (auto-tick checklist + readiness items)
  → operator finishes pilot checklist
  → assign pilot template (e.g. "New leads only")
  → Mark ready for pilot   (pilot_status: ready_for_pilot)
  → Approve for pilot      (pilot_status: approved, rollout_status: ready_for_live)
  → operator promotes rollout_status → live_pilot when traffic actually starts`}</pre>
              </Card>
              <Card>
                <div className="font-semibold text-foreground mb-2">Auditability (lightweight)</div>
                <ul className="space-y-1.5 text-sm">
                  <li>· Per-item <code className="text-xs">updated_at</code> + <code className="text-xs">updated_by</code> on the checklist JSONB.</li>
                  <li>· Approval record on <code className="text-xs">pilot_approval</code>: <code className="text-xs">approved_at</code>, <code className="text-xs">approved_by</code>, notes, template id.</li>
                  <li>· Last touch time on <code className="text-xs">legal_connect_pilot_updated_at</code>.</li>
                  <li>· Block reason on <code className="text-xs">legal_connect_pilot_block_reason</code>.</li>
                </ul>
              </Card>
            </div>
          </section>

          {/* Phase 5 Slice 3 — Guardrails & Health */}
          <section>
            <SectionHeader
              id="phase5-slice3"
              title="Phase 5 Slice 3 — Guardrails &amp; health"
              kicker="Per-tenant rate limits, observability, error taxonomy, and lightweight alerts"
            />
            <div className="space-y-4 text-sm text-foreground/90 leading-relaxed">
              <Card>
                <div className="font-semibold text-foreground mb-2">Per-tenant rate limits</div>
                <ul className="space-y-1.5">
                  <li>· Stored on <code className="text-xs">tenants.max_jobs_per_minute</code> and <code className="text-xs">tenants.max_jobs_per_hour</code>. Defaults: 60/min, 1000/hr.</li>
                  <li>· Edited from the Readiness tab → <Chip>Rate limits</Chip> panel.</li>
                  <li>· Enforced inside <code className="text-xs">supabase/functions/legal-connect-jobs</code> in the <Chip>processQueue</Chip> path. Before executing a job, the worker counts that tenant's recent jobs (1m / 1h windows) and reschedules anything over the cap with <code className="text-xs">failure_classification = adapter:rate_limited</code>.</li>
                  <li>· Re-queued jobs back off (1m for minute-cap, 5m for hour-cap) and retry naturally — no work is dropped.</li>
                  <li>· An open <Chip>rate_limited</Chip> alert is created in <code className="text-xs">legal_connect_alerts</code> the first time a tenant hits a cap.</li>
                </ul>
              </Card>
              <Card>
                <div className="font-semibold text-foreground mb-2">Observability</div>
                <ul className="space-y-1.5">
                  <li>· New edge function <code className="text-xs">legal-connect-health</code> returns per-tenant 24h/7d rollups (jobs, success rate, rate-limited count, top error class, open alerts).</li>
                  <li>· UI: <Chip>TenantHealthPanel</Chip> on <code className="text-xs">/superadmin/design-partners</code> — one row per design partner with rollout, success%, rate-limit hits, top error class, and open alerts.</li>
                  <li>· Auto-refreshes every 60s; an explicit <Chip>Evaluate alerts</Chip> button reruns alert rules on demand.</li>
                </ul>
              </Card>
              <Card>
                <div className="font-semibold text-foreground mb-2">Error taxonomy</div>
                <p className="mb-2">All legal-CRM adapters classify failures via <code className="text-xs">classifyAdapterError</code> in <code className="text-xs">_shared/legal-job-adapters.ts</code>:</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {["auth","validation","rate_limited","upstream_4xx","upstream_5xx","network","timeout","unsupported","unknown"].map((k) => (<Chip key={k}>{k}</Chip>))}
                </div>
                <p>Stored as <code className="text-xs">failure_classification = adapter:&lt;kind&gt;</code> on each sync job. The Delivery Dashboard now exposes a class filter; the Tenant Health panel surfaces the dominant failure class.</p>
              </Card>
              <Card>
                <div className="font-semibold text-foreground mb-2">Alert rules</div>
                <ul className="space-y-1.5">
                  <li>· <strong>high_failure_rate</strong> (critical): tenant in <Chip>ready_for_live</Chip>/<Chip>live_pilot</Chip>/<Chip>live_steady</Chip> with &lt;70% success and ≥3 failures in 24h.</li>
                  <li>· <strong>auth_failure</strong> (critical): any auth-class failure once tenant is live.</li>
                  <li>· <strong>rate_limited</strong> (warning): one or more rate-limited jobs in 24h.</li>
                  <li>· <strong>zero_jobs</strong> (warning): live tenant with 0 jobs in 24h (possible misrouting).</li>
                </ul>
                <p className="mt-2">Alerts dedupe by <code className="text-xs">(client_id, alert_kind, status=open)</code>. Ack or resolve from the Open alerts list.</p>
              </Card>
              <Card>
                <div className="font-semibold text-foreground mb-2">Tuning</div>
                <ul className="space-y-1.5">
                  <li>· Default limits live in the migration and the worker fallback (60/m, 1000/h).</li>
                  <li>· Per-tenant overrides via the Readiness → Rate limits panel.</li>
                  <li>· Adjust thresholds in <code className="text-xs">legal-connect-health/index.ts → evaluateAlerts()</code> if the team wants different sensitivity.</li>
                </ul>
              </Card>
            </div>
          </section>

          {/* Phase 5 Slice 4 — Feedback, Release Notes, GA Readiness */}
          <section>
            <SectionHeader
              id="phase5-slice4"
              title="Phase 5 Slice 4 — Feedback, release notes, GA readiness"
              kicker="Capture design-partner feedback, communicate what shipped, and track GA prep"
            />
            <div className="space-y-4 text-sm text-foreground/90 leading-relaxed">
              <Card>
                <div className="font-semibold text-foreground mb-2">Feedback entries</div>
                <ul className="space-y-1.5">
                  <li>· Stored in <code className="text-xs">legal_connect_feedback_entries</code> with source, topic, type, severity, message, status, and optional <code className="text-xs">shipped_release_note_id</code>.</li>
                  <li>· Logged from two places: superadmin <Chip>FeedbackCapturePanel</Chip> on <code className="text-xs">/superadmin/design-partners</code> (for calls/interviews), and the in-product <Chip>Share feedback</Chip> button in the Legal Connect header for any client.</li>
                  <li>· Status flow: <Chip>new</Chip> → <Chip>triaged</Chip> → <Chip>in_progress</Chip> → <Chip>shipped</Chip> (or <Chip>wont_fix</Chip>). Edit inline from the table.</li>
                </ul>
              </Card>
              <Card>
                <div className="font-semibold text-foreground mb-2">Release notes / What's new</div>
                <ul className="space-y-1.5">
                  <li>· Stored in <code className="text-xs">legal_connect_release_notes</code> (slug, title, summary, highlights[], details[], audience, dev_guide_link).</li>
                  <li>· Audience values: <Chip>all</Chip>, <Chip>design_partners</Chip>, <Chip>internal</Chip>. The drawer filters automatically.</li>
                  <li>· Surface: <Chip>WhatsNewDrawer</Chip> button in the Legal Connect header opens a side sheet, newest first.</li>
                  <li>· Add a new entry with a SQL <code className="text-xs">INSERT</code> into <code className="text-xs">legal_connect_release_notes</code>. Keep highlights to 1–3 bullets; details for the changelog body.</li>
                </ul>
              </Card>
              <Card>
                <div className="font-semibold text-foreground mb-2">Closing the loop</div>
                <p>When you ship work that came from feedback, set the entry's status to <Chip>shipped</Chip> and (optionally) populate <code className="text-xs">shipped_release_note_id</code>. This lets you trace any release note back to the conversations that drove it without building public roadmap UI.</p>
              </Card>
              <Card>
                <div className="font-semibold text-foreground mb-2">GA readiness checklist</div>
                <p className="mb-2">Lives in <code className="text-xs">src/data/legal-connect-feedback.ts → GA_READINESS_CHECKLIST</code> and renders via <Chip>GAReadinessPanel</Chip> on <code className="text-xs">/superadmin/design-partners</code>. Sections cover Product &amp; integration, Operations &amp; safety, Onboarding &amp; docs, Feedback &amp; communication, Security &amp; compliance.</p>
                <p className="text-xs text-muted-foreground">State is currently per-operator (localStorage). Promote to a shared row when more than one person is driving GA.</p>
              </Card>
              <Card>
                <div className="font-semibold text-foreground mb-2">Process</div>
                <ul className="space-y-1.5">
                  <li>· Weekly: review new feedback entries, mark triaged, group by topic.</li>
                  <li>· When you ship a meaningful change: add a release note, mark the source feedback shipped.</li>
                  <li>· Before broad rollout: walk the GA readiness checklist; nothing left in red.</li>
                </ul>
              </Card>
            </div>
          </section>

          {/* Phase 6 — Real Pilot Validation & GA Hardening */}
          <section>
            <SectionHeader
              id="phase6"
              title="Phase 6 — Real pilot validation &amp; GA hardening"
              kicker="Move from feature-complete to proven-ready: real-tenant checklist, shared state, tuned thresholds, gating, and the go-live runbook"
            />
            <div className="space-y-4 text-sm text-foreground/90 leading-relaxed">
              <Card>
                <div className="font-semibold text-foreground mb-2">Shared GA checklist (per tenant)</div>
                <ul className="space-y-1.5">
                  <li>· Stored in <code className="text-xs">legal_connect_ga_checklist_state</code> keyed by <code className="text-xs">(tenant_id, item_id)</code>. Each row carries status, note, updated_by, updated_by_name, updated_at.</li>
                  <li>· Rendered by <Chip>TenantGAReadinessPanel</Chip> on the client's Legal Connect → Readiness tab. Multiple operators see the same source of truth.</li>
                  <li>· The superadmin <Chip>GAReadinessPanel</Chip> on <code className="text-xs">/superadmin/design-partners</code> remains for cross-cutting org-level prep (still localStorage-scoped).</li>
                  <li>· RLS: org members can read; org owners/admins, ops, and master admins can write.</li>
                </ul>
              </Card>
              <Card>
                <div className="font-semibold text-foreground mb-2">Real pilot validation</div>
                <ul className="space-y-1.5">
                  <li>· For each design-partner tenant, walk the 16-item checklist against live traffic. Tick items with notes that reference call IDs / job IDs as evidence.</li>
                  <li>· Validate the live provider scenarios: Clio Grow lead intake, Clio Manage note/task/contact write-back, MyCase note/task/contact, email-only path, wrong-number path, burst rate-limit behavior, transient-failure retry.</li>
                  <li>· Confirm UI surfaces match reality: Delivery dashboard, Readiness, Pilot approval, Design partners ops view, Tenant health, Alerts.</li>
                </ul>
              </Card>
              <Card>
                <div className="font-semibold text-foreground mb-2">Threshold tuning</div>
                <ul className="space-y-1.5">
                  <li>· Defaults: <code className="text-xs">max_jobs_per_minute = 60</code>, <code className="text-xs">max_jobs_per_hour = 1000</code>. Guidance:</li>
                  <li>· Low-volume design partners: 30/min · 500/hr is plenty and surfaces accidental loops faster.</li>
                  <li>· Moderate pilots: keep defaults.</li>
                  <li>· Test-heavy onboarding: temporarily 120/min · 2000/hr; reset before going live_steady.</li>
                  <li>· Alerts (in <code className="text-xs">legal-connect-health</code>): <Chip>high_failure_rate</Chip> &lt; 70% over 24h with ≥ 3 failures (live tenants only). <Chip>auth_failure</Chip> on first occurrence. <Chip>rate_limited</Chip> if ≥ 5 in 1h. <Chip>zero_jobs</Chip> if a live tenant logs 0 jobs in 24h.</li>
                </ul>
              </Card>
              <Card>
                <div className="font-semibold text-foreground mb-2">Access-control tightening</div>
                <ul className="space-y-1.5">
                  <li>· <Chip>FeedbackDialog</Chip> now hides for non-design-partner non-admin users (<code className="text-xs">requireDesignPartnerOrAdmin</code>). Admins, master admins, and design-partner tenants still see it everywhere.</li>
                  <li>· <Chip>WhatsNewDrawer</Chip> picks audience per tenant: <Chip>design_partners</Chip> for flagged tenants, <Chip>all</Chip> for general rollout. Future cohorts only need a new audience value + INSERTs into <code className="text-xs">legal_connect_release_notes</code>.</li>
                  <li>· Superadmin pages (Design partners, Dev guide) remain wrapped by master/superadmin route guards — confirmed unchanged.</li>
                </ul>
              </Card>
              <Card>
                <div className="font-semibold text-foreground mb-2">Go-live &amp; rollback runbook</div>
                <p className="mb-2">Rendered as <Chip>GoLiveRunbookPanel</Chip> on the Readiness tab. Covers: approved → live pilot → steady, pause, safe-mode downgrade, email-only fallback, provider outage / auth break, full rollback. Use this exact ordering during incidents — it matches what the UI controls do.</p>
              </Card>
              <Card>
                <div className="font-semibold text-foreground mb-2">Remaining before broad GA</div>
                <ul className="space-y-1.5">
                  <li>· At least 2 tenants with the shared checklist 100% green and a published release note from each pilot loop.</li>
                  <li>· Two consecutive weeks of <Chip>live_steady</Chip> with no critical alerts on a real tenant.</li>
                  <li>· Operator dry-run of every step in the rollback runbook on a test tenant.</li>
                  <li>· Promote the superadmin GA checklist (currently localStorage) to a shared org-level row if more than one person is co-driving GA.</li>
                </ul>
              </Card>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
