import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface VersionRow {
  id: string;
  version: number;
  is_current: boolean;
  notes: string | null;
  created_at: string;
}

interface VersionHistoryProps {
  versions: VersionRow[];
  isLoading?: boolean;
}

/**
 * Read-only version history for the Versions tab. Restoration is intentionally
 * deferred to a follow-up — the data shape is stable and visible here.
 */
export function VersionHistory({ versions, isLoading }: VersionHistoryProps) {
  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (versions.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          No versions yet. Publish to create the first immutable version.
        </CardContent>
      </Card>
    );
  }
  return (
    <ul className="space-y-2">
      {versions.map((v) => (
        <li key={v.id}>
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <Badge variant="outline" className="font-mono">v{v.version}</Badge>
              {v.is_current && <Badge>Current</Badge>}
              <p className="text-sm flex-1 truncate">{v.notes ?? "—"}</p>
              <p className="text-xs text-muted-foreground tabular-nums">
                {new Date(v.created_at).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}

export default VersionHistory;
