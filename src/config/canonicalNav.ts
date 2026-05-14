import {
  Plug,
  Home, Users, Megaphone, BookOpen, FormInput, FileStack,
  ClipboardCheck, BarChart3, Brain, Sparkles, Settings,
  PlayCircle, Headphones, Eye,
} from "lucide-react";
import type { ComponentType } from "react";

/**
 * Canonical nav registry.
 *
 * Single source of truth for the canonical Workspace shell at
 * /w/:workspaceId/*. The previously scaffolded Org nav (/org/*) was retired
 * during shell convergence — AdminShell at /admin/* is now the single
 * canonical organization-level surface and owns its own nav config.
 */

export type NavItem = {
  key: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** Path relative to the shell's prefix (no leading slash). */
  to: string;
};

/**
 * Canonical Workspace nav — 15 items. Prefix: /w/:workspaceId
 * Order is locked to the May 13 Canonical Build Doc §4.
 */
export const WORKSPACE_NAV: NavItem[] = [
  { key: "home",         label: "Home",         icon: Home,            to: "home" },
  { key: "campaigns",    label: "Campaigns",    icon: Megaphone,       to: "campaigns" },
  { key: "guides",       label: "Guides",       icon: BookOpen,        to: "guides" },
  { key: "forms",        label: "Forms",        icon: FormInput,       to: "forms" },
  { key: "templates",    label: "Templates",    icon: FileStack,       to: "templates" },
  { key: "clients",      label: "Clients",      icon: Users,           to: "clients" },
  { key: "runs",         label: "Runs",         icon: PlayCircle,      to: "runs" },
  { key: "agents",       label: "Agents",       icon: Headphones,      to: "agents" },
  { key: "supervisor",   label: "Supervisor",   icon: Eye,             to: "supervisor" },
  { key: "qa",           label: "QA",           icon: ClipboardCheck,  to: "qa" },
  { key: "analytics",    label: "Analytics",    icon: BarChart3,       to: "analytics" },
  { key: "integrations", label: "Integrations", icon: Plug,            to: "integrations" },
  { key: "knowledge",    label: "Knowledge",    icon: Brain,           to: "knowledge" },
  { key: "assistant",    label: "Assistant",    icon: Sparkles,        to: "assistant" },
  { key: "settings",     label: "Settings",     icon: Settings,        to: "settings" },
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
