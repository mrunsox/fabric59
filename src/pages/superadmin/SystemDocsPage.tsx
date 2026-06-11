import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * System Docs — canonical pointer page for internal/staff references.
 *
 * Legacy admin docs/KB links were removed (those surfaces are
 * workspace-owned or deprecated). All destinations listed here are
 * intentionally de-surfaced from the superadmin nav and reachable only
 * via direct URL or this page.
 */
const DOC_LINKS: { label: string; href: string; description: string }[] = [
  {
    label: "Build Outline",
    href: "/outline",
    description: "Living spec and platform roadmap (gated, staff only)",
  },
  {
    label: "Dev Guide",
    href: "/superadmin/dev-guide",
    description: "Internal architecture and developer reference",
  },
  {
    label: "Test Cases",
    href: "/superadmin/test-cases",
    description: "Internal QA matrix and handoff notes",
  },
  {
    label: "Advanced Routes",
    href: "/superadmin/routes",
    description: "Internal route inventory for debugging",
  },
  // Feature Vault + Source Exports retired in Phase 1 Fabric59 reposition.
  // Routes still resolve as tombstones to /superadmin/docs.


export default function SystemDocsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">System Docs</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Internal and staff-only references. These surfaces are intentionally not
          promoted in the superadmin nav and are reached from here or by direct URL.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4" /> Internal references
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {DOC_LINKS.map((d) => (
            <Link
              key={d.href}
              to={d.href}
              className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted/40 transition-colors"
            >
              <div>
                <div className="text-sm font-medium text-foreground">{d.label}</div>
                <div className="text-xs text-muted-foreground">{d.description}</div>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
