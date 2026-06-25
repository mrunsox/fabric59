import {
  Plug,
  Users, Megaphone, BookOpen, FormInput, FileStack,
  ClipboardCheck, BarChart3, Brain, Sparkles, Settings,
  PlayCircle, Headphones, Eye,
  Sparkle, UserSquare2, Tag, Boxes, Heart, Shield,
  ListChecks, Bell, Radio, BookMarked, Library,
} from "lucide-react";

import type { ComponentType } from "react";

/**
 * Canonical nav registry.
 *
 * Single source of truth for the canonical Workspace shell at
 * /w/:workspaceId/*.
 *
 * Dashboard Consolidation — Phase 1 (IA & navigation cleanup):
 *   - Groups reshaped to Build / Operate / Insight / Connect / Settings.
 *   - `cockpit` is a virtual nav label that points at the existing
 *     `/w/:id/agent` route. The tabbed Cockpit shell (Live / Supervisor /
 *     Runs) lands in Phase 4 — for now Operate just gets a single,
 *     clearly-named entry instead of three competing items.
 *   - `library` is a virtual nav label that points at the existing
 *     `/w/:id/guides` route. The merged Library shell (Guides + Templates
 *     + Blueprints) lands in Phase 3 — this label only signals the IA
 *     umbrella, it does NOT imply merged listings or new behavior.
 *   - `runs`, `agents`, `supervisor`, `templates` are demoted from the
 *     primary sidebar and the operator-facing ⌘K, but remain mounted and
 *     reachable. Admins can still jump to them via the ⌘K "Hidden /
 *     Legacy" group.
 *   - Legacy `home` redirect remains invisible to product chrome.
 */

export type NavItem = {
  key: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** Path relative to the shell's prefix (no leading slash). */
  to: string;
};

/**
 * Flat union of every canonical workspace surface, including demoted ones
 * and the Phase 1 virtual relabels. Order is preserved for compatibility
 * with existing iteration sites (command palette, regression tests,
 * breadcrumbs).
 */
export const WORKSPACE_NAV: NavItem[] = [
  { key: "campaigns",    label: "Campaigns",    icon: Megaphone,       to: "campaigns" },
  { key: "guide",        label: "Campaign guide", icon: BookMarked,   to: "guide" },
  // Phase 3 — Library shell mounted at /w/:id/library; merges Guides +
  // Templates + Blueprints under one umbrella. Standalone /guides and
  // /templates routes remain mounted for deep links and back-compat.
  { key: "library",      label: "Library",      icon: Library,         to: "library" },
  { key: "guides",       label: "Guides",       icon: BookOpen,        to: "guides" },
  { key: "forms",        label: "Forms",        icon: FormInput,       to: "forms" },
  { key: "templates",    label: "Templates",    icon: FileStack,       to: "templates" },
  { key: "clients",      label: "Clients",      icon: Users,           to: "clients" },
  { key: "dispositions", label: "Dispositions", icon: ListChecks,      to: "dispositions" },
  { key: "notifications",label: "Notifications",icon: Bell,            to: "notifications" },
  // Activation fix preserved: was `to: "knowledge"` (404). Points at the
  // Business Brain shell actually mounted at /w/:wid/brain.
  { key: "knowledge",    label: "Business Brain", icon: Brain,         to: "brain" },
  { key: "assistant",    label: "Assistant",    icon: Sparkles,        to: "assistant" },
  { key: "qa",           label: "QA",           icon: ClipboardCheck,  to: "qa" },
  { key: "analytics",    label: "Analytics",    icon: BarChart3,       to: "analytics" },
  { key: "integrations", label: "Integrations", icon: Plug,            to: "integrations" },
  { key: "settings",     label: "Settings",     icon: Settings,        to: "settings" },
  // Phase 4 — Cockpit shell mounted at /w/:id/cockpit with Live / Supervisor
  // / Runs tabs. Standalone /agent, /runs and /supervisor remain mounted for
  // back-compat and deep links.
  { key: "cockpit",      label: "Cockpit",      icon: Radio,           to: "cockpit" },
  // Demoted: still mounted + reachable, hidden from primary sidebar and
  // from operator ⌘K. Admins still see them in ⌘K "Hidden / Legacy".
  { key: "runs",         label: "Runs",         icon: PlayCircle,      to: "runs" },
  { key: "agents",       label: "Agents",       icon: Headphones,      to: "agents" },
  { key: "supervisor",   label: "Supervisor",   icon: Eye,             to: "supervisor" },
  { key: "agent",        label: "Agent cockpit",icon: Radio,           to: "agent" },
];


const byKey = (k: string) => WORKSPACE_NAV.find((n) => n.key === k)!;

/** Phase B grouped sidebar surface. */
export type NavGroup = { label: string; items: NavItem[] };

/**
 * Phase 1 canonical groups: Build / Operate / Insight / Connect / Settings.
 * Settings is pinned separately at the sidebar footer.
 */
export const WORKSPACE_NAV_GROUPS: NavGroup[] = [
  {
    label: "Build",
    // Phase 11 — IA reorder: Clients first (parent), Campaigns second
    // (children), then Workspace guide (default script) and Library
    // (reusable templates/blueprints, demoted visually). Forms moves
    // out of the sidebar and lives inside a Campaign detail tab; the
    // top-level /forms route stays mounted for back-compat.
    items: ["clients", "campaigns", "guide", "library"].map(byKey),
  },
  {
    label: "Operate",
    items: ["cockpit", "knowledge", "assistant", "dispositions", "notifications"].map(byKey),
  },
  {
    label: "Insight",
    items: ["qa", "analytics"].map(byKey),
  },
  {
    label: "Connect",
    items: ["integrations"].map(byKey),
  },
];

/** Pinned at the bottom of the sidebar. */
export const WORKSPACE_NAV_PINNED: NavItem[] = [byKey("settings")];

/**
 * Items intentionally hidden from the primary sidebar and from operator
 * ⌘K. Admins can still reach these via the ⌘K "Hidden / Legacy" group.
 * Routes remain mounted; nothing here removes a destination.
 */
export const WORKSPACE_NAV_DEMOTED: NavItem[] = [
  byKey("runs"),
  byKey("agents"),
  byKey("supervisor"),
  byKey("templates"),
  byKey("guides"),
  // Phase 11 — Forms demoted from top-level. It now lives inside each
  // Campaign detail page; top-level /forms route still works via ⌘K.
  byKey("forms"),
];


/** Canonical Marketing nav — 6 items. Public, no auth. */
export const MARKETING_NAV: NavItem[] = [
  { key: "solutions",    label: "Solutions",    icon: Sparkle,        to: "/solutions" },
  { key: "personas",     label: "Personas",     icon: UserSquare2,    to: "/personas" },
  { key: "pricing",      label: "Pricing",      icon: Tag,            to: "/pricing" },
  { key: "integrations", label: "Integrations", icon: Boxes,          to: "/integrations" },
  { key: "customers",    label: "Customers",    icon: Heart,          to: "/customers" },
  { key: "trust",        label: "Trust",        icon: Shield,         to: "/trust" },
];
