/**
 * Fabric59 — Canonical hierarchy and role model.
 *
 * This file is the single source of truth for how the platform layers and
 * roles are described in code, UI, and documentation. Refer to it before
 * inventing new wording for "org", "workspace", or "tenant".
 *
 * Table mapping (no DB renames in this pass):
 *   - `organizations`         → Workspace (the real tenant boundary)
 *   - `partners`              → middle layer under a Workspace
 *   - `tenants`               → Client (under a Partner / Workspace)
 *   - `organization_members`  → Workspace membership (workspace-scoped roles)
 *   - `user_roles`            → Platform-wide roles (only `master_admin` is meaningful today)
 */

import type { LucideIcon } from "lucide-react";
import { ShieldCheck, Building2, Users, Briefcase } from "lucide-react";

/** Workspace-scoped role, sourced from `organization_members.role`. */
export type WorkspaceRole = "owner" | "admin" | "member";

/**
 * Platform-wide role, sourced from `user_roles.role`.
 *
 * Only `master_admin` is currently enforced anywhere in the app.
 * `admin`, `ops_team`, and `viewer` are reserved for future platform-only
 * semantics and behave as no-ops today.
 */
export type PlatformRole = "master_admin" | "admin" | "ops_team" | "viewer";

/** Convenience predicate for "can administer this workspace". */
export function isWorkspaceAdmin(role: WorkspaceRole | null | undefined): boolean {
  return role === "owner" || role === "admin";
}

/**
 * Power model for workspace roles.
 *
 * Today `owner` and `admin` are functionally identical — both gate the same
 * Workspace Admin UI. `owner` is reserved for future exclusive powers:
 *   - billing ownership
 *   - workspace deletion
 *   - workspace ownership transfer
 *
 * New code that gates one of those specific actions MUST check
 * `role === "owner"` directly rather than `isWorkspaceAdmin()`.
 */
export const WORKSPACE_ROLE_POWERS = {
  owner: {
    label: "Workspace Owner",
    description:
      "Full workspace control. Reserved for billing, deletion, and ownership transfer once those flows ship.",
    isAdmin: true,
  },
  admin: {
    label: "Workspace Admin",
    description: "Full workspace control today. Treated identically to owner outside of reserved owner-only actions.",
    isAdmin: true,
  },
  member: {
    label: "Workspace Member",
    description: "Standard workspace user. Capabilities gated by user_permissions.",
    isAdmin: false,
  },
} satisfies Record<WorkspaceRole, { label: string; description: string; isAdmin: boolean }>;

export interface HierarchyLayer {
  key: "platform" | "workspace" | "partner" | "client";
  label: string;
  description: string;
  tableBackedBy: string | null;
  roleSource: string | null;
  icon: LucideIcon;
}

/** Canonical four-layer hierarchy. Use this in docs, dev guide, and copy. */
export const AppHierarchy: readonly HierarchyLayer[] = [
  {
    key: "platform",
    label: "Platform",
    description: "Cross-workspace platform administration. Only Superadmins operate at this layer.",
    tableBackedBy: null,
    roleSource: "user_roles.role = 'master_admin'",
    icon: ShieldCheck,
  },
  {
    key: "workspace",
    label: "Workspace",
    description:
      "Tenant boundary. All core entities (flows, deployments, runs, templates, tenants, partners) are scoped here via organization_id.",
    tableBackedBy: "organizations",
    roleSource: "organization_members.role IN ('owner','admin','member')",
    icon: Building2,
  },
  {
    key: "partner",
    label: "Partner",
    description: "Middle layer inside a Workspace. Groups Clients for branding, reporting, and config inheritance.",
    tableBackedBy: "partners",
    roleSource: null,
    icon: Briefcase,
  },
  {
    key: "client",
    label: "Client",
    description: "End customer under a Partner / Workspace. Holds CRM credentials and integration configs.",
    tableBackedBy: "tenants",
    roleSource: null,
    icon: Users,
  },
] as const;
