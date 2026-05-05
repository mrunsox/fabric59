import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Props {
  feature: any;
}

function ListSection({ title, items }: { title: string; items: string[] | null | undefined }) {
  if (!items || items.length === 0) return null;
  return (
    <div>
      <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{title}</h4>
      <ul className="space-y-1">
        {items.map((i) => (
          <li key={i} className="text-xs font-mono text-foreground/80">
            {i}
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Renders the "left card" header dynamically based on feature.status.
 * - archived  → "Why archived" (intent: explain why preserved)
 * - experimental → "Status & risks" (intent: surface live-development context)
 * - extracted → "Extraction summary"
 * - core/deprecated/anything else → "Status & risks"
 *
 * This avoids the misleading "Why archived" label on non-archived features
 * (which was previously rendering a "—" placeholder for experimental items).
 */
function statusCardTitle(status: string | undefined): string {
  switch (status) {
    case "archived":
      return "Why archived";
    case "experimental":
      return "Status & risks";
    case "extracted":
      return "Extraction summary";
    case "deprecated":
      return "Deprecation notes";
    default:
      return "Status & risks";
  }
}

export function ManifestViewer({ feature }: Props) {
  const isArchived = feature.status === "archived";
  const reasonText = feature.reason_archived?.trim();
  const hasAnyLeftCardContent =
    !!reasonText || !!feature.risks || (feature.required_secrets?.length ?? 0) > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {hasAnyLeftCardContent && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{statusCardTitle(feature.status)}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {reasonText && (
              <p className="text-muted-foreground whitespace-pre-wrap">{reasonText}</p>
            )}
            {!reasonText && !isArchived && (
              <p className="text-muted-foreground">
                {feature.status === "experimental"
                  ? "Active initiative. See risks and required secrets below before relying on this feature in production."
                  : "—"}
              </p>
            )}
            {feature.risks && (
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Risks</div>
                <p className="text-foreground/80">{feature.risks}</p>
              </div>
            )}
            {feature.required_secrets?.length > 0 && (
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
                  Required secrets
                </div>
                <div className="flex flex-wrap gap-1">
                  {feature.required_secrets.map((s: string) => (
                    <Badge key={s} variant="secondary" className="font-mono text-[10px]">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className={hasAnyLeftCardContent ? "" : "lg:col-span-2"}>
        <CardHeader>
          <CardTitle className="text-base">Source manifest</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ListSection title="Routes" items={feature.original_routes} />
          <ListSection title="Frontend files" items={feature.frontend_files} />
          <ListSection title="Backend / edge functions" items={feature.backend_files} />
          <ListSection title="Edge functions" items={feature.edge_functions} />
          <ListSection title="Database objects" items={feature.db_objects} />
          {!feature.original_routes?.length &&
            !feature.frontend_files?.length &&
            !feature.backend_files?.length &&
            !feature.edge_functions?.length &&
            !feature.db_objects?.length && (
              <p className="text-sm text-muted-foreground">
                No source manifest entries seeded yet for this feature.
              </p>
            )}
        </CardContent>
      </Card>

      {feature.extraction_notes && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Extraction notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap text-foreground/80">
              {feature.extraction_notes}
            </p>
          </CardContent>
        </Card>
      )}

      {feature.restore_notes && (
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              {isArchived ? "Restore notes" : "Operational notes"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap text-foreground/80">
              {feature.restore_notes}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
