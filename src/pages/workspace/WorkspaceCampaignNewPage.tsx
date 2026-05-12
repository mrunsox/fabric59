import { Navigate } from "react-router-dom";

/**
 * Canonical campaign creation entry point (Phase 3).
 *
 * Phase 3 chose the existing CampaignIntakePage (/admin/campaigns/new) as the canonical
 * surviving creation flow. The DB trigger automatically mirrors the resulting
 * campaign_setups row into the canonical `campaigns` table, so this redirect is the
 * stable canonical URL: future replacements swap only the redirect target.
 *
 * Other legacy creation surfaces (CampaignBuilderPage, CampaignDraftsPage, intake from
 * blueprints) remain reachable but are no longer canonical entry points.
 */
export default function WorkspaceCampaignNewPage() {
  return <Navigate to="/admin/campaigns/new" replace />;
}
