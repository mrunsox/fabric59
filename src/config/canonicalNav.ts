import {
  Plug,
  Users, Megaphone, BookOpen, FormInput, FileStack,
  ClipboardCheck, BarChart3, Brain, Sparkles, Settings,
  PlayCircle, Headphones, Eye,
  Sparkle, UserSquare2, Tag, Boxes, Heart, Shield,
  ListChecks, Bell, Radio, BookMarked,
} from "lucide-react";

import type { ComponentType } from "react";

/**
 * Canonical nav registry.
 *
 * Single source of truth for the canonical Workspace shell at
 * /w/:workspaceId/*. Phase B (nav convergence) introduces grouped + pinned
 * + demoted views over the same flat WORKSPACE_NAV union — existing
 * consumers/tests that iterate WORKSPACE_NAV keep working unchanged.
 */

export type NavItem = {
  key: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** Path relative to the shell's prefix (no leading slash). */
  to: string;
};

/**
 * Flat union of every canonical workspace surface, including demoted ones.
 * Order is preserved for compatibility with existing iteration sites
 * (command palette, regression tests, breadcrumbs).
 *
 * Dashboard consolidation: the legacy `home` entry has been fully retired.
 * /w/:workspaceId/home remains mounted as a redirect-only compat route
 * (collapses to /w/:workspaceId/campaigns) so external bookmarks survive,
 * but no product chrome, command palette, breadcrumb, or sidebar exposes it.
 */
export const WORKSPACE_NAV: NavItem[] = [
  { key: "campaigns",    label: "Campaigns",    icon: Megaphone,       to: "campaigns" },
  { key: "guide",        label: "Workspace guide", icon: BookMarked,   to: "guide" },
  { key: "guides",       label: "Guides",       icon: BookOpen,        to: "guides" },
  { key: "forms",        label: "Forms",        icon: FormInput,       to: "forms" },
  { key: "templates",    label: "Templates",    icon: FileStack,       to: "templates" },
  { key: "clients",      label: "Clients",      icon: Users,           to: "clients" },
  { key: "dispositions", label: "Dispositions", icon: ListChecks,      to: "dispositions" },
  { key: "notifications",label: "Notifications",icon: Bell,            to: "notifications" },
  { key: "knowledge",    label: "Knowledge",    icon: Brain,           to: "knowledge" },
  { key: "assistant",    label: "Assistant",    icon: Sparkles,        to: "assistant" },
  { key: "qa",           label: "QA",           icon: ClipboardCheck,  to: "qa" },
  { key: "analytics",    label: "Analytics",    icon: BarChart3,       to: "analytics" },
  { key: "integrations", label: "Integrations", icon: Plug,            to: "integrations" },
  { key: "settings",     label: "Settings",     icon: Settings,        to: "settings" },
  // Demoted: still mounted + reachable, hidden from primary sidebar.
  { key: "runs",         label: "Runs",         icon: PlayCircle,      to: "runs" },
  { key: "agents",       label: "Agents",       icon: Headphones,      to: "agents" },
  { key: "supervisor",   label: "Supervisor",   icon: Eye,             to: "supervisor" },
  { key: "agent",        label: "Agent cockpit",icon: Radio,           to: "agent" },
];


const byKey = (k: string) => WORKSPACE_NAV.find((n) => n.key === k)!;

/** Phase B grouped sidebar surface. */
export type NavGroup = { label: string; items: NavItem[] };

export const WORKSPACE_NAV_GROUPS: NavGroup[] = [
  {
    label: "Build",
    // `home` was fully retired from WORKSPACE_NAV. /w/:id/home now lives as
    // a Navigate-only compat route in App.tsx and is invisible to product
    // chrome (sidebar, command palette, breadcrumbs, keyboard nav).
    items: ["campaigns", "guide", "guides", "forms", "templates", "clients"].map(byKey),
  },

  {
    label: "Operate",
    items: ["agent", "dispositions", "notifications", "knowledge", "assistant"].map(byKey),
  },
  {
    label: "Insight",
    items: ["qa", "analytics", "integrations"].map(byKey),
  },
];

/** Pinned at the bottom of the sidebar. */
export const WORKSPACE_NAV_PINNED: NavItem[] = [byKey("settings")];

/**
 * Items intentionally hidden from the primary sidebar in this phase but kept
 * mounted in routes and discoverable via ⌘K.
 */
export const WORKSPACE_NAV_DEMOTED: NavItem[] = [
  byKey("runs"),
  byKey("agents"),
  byKey("supervisor"),
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
