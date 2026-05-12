import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

/**
 * WorkspaceSectionPlaceholder
 *
 * Canonical workspace section that has no real implementation yet.
 * Used for Guides / Forms / etc. surfaces that consolidate in later phases.
 */
export default function WorkspaceSectionPlaceholder({
  label,
  rationale,
}: { label: string; rationale?: string }) {
  return (
    <div className="space-y-4">
      <Badge variant="outline" className="border-accent/40 text-accent">
        Canonical planned surface
      </Badge>
      <h1 className="text-2xl font-semibold tracking-tight">{label}</h1>
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          {rationale ??
            `The canonical "${label}" surface is reserved here in the workspace shell. ` +
              `Real implementation arrives in a later phase (Phase 2B/3/4 depending on the entity).`}
        </CardContent>
      </Card>
    </div>
  );
}
