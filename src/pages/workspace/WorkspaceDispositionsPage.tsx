import { ListChecks } from "lucide-react";
import { WorkspacePageHeader } from "@/components/workspace/WorkspacePageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import { useDispositions } from "@/hooks/useDispositions";
import { useCallOutcomeTypes } from "@/hooks/useCallOutcomes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * Canonical workspace Dispositions surface.
 *
 * Reads the org-scoped disposition_access table via useDispositions and
 * surfaces call_outcome_types alongside as the canonical mapping target.
 * Read-only in this slice — authoring lives at /admin/dispositions.
 */
export default function WorkspaceDispositionsPage() {
  const { data: dispositions = [], isLoading } = useDispositions();
  const { data: outcomes = [] } = useCallOutcomeTypes();

  return (
    <div className="space-y-6">
      <WorkspacePageHeader
        eyebrow="Operate"
        title="Dispositions"
        lede="Disposition labels surfaced to agents and routed to outcomes & post-call automations."
      />

      <p className="text-xs text-muted-foreground">
        Effective source: dispositions are defined at the <span className="font-medium text-foreground">organization</span> level
        and surfaced into this workspace via <span className="font-mono">disposition_access</span>.
        Authoring lives in the organization disposition manager.
      </p>


      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            Dispositions{" "}
            <span className="text-muted-foreground font-normal">
              ({dispositions.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground py-6">Loading…</div>
          ) : dispositions.length === 0 ? (
            <EmptyState
              icon={ListChecks}
              title="No dispositions yet"
              description="Dispositions are required for a workspace to be ready. Add them from the organization disposition manager and they'll appear here."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="w-24">Order</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-40">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dispositions.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {d.sort_order}
                    </TableCell>
                    <TableCell>
                      <Badge variant={d.is_active ? "default" : "secondary"}>
                        {d.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {new Date(d.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            Outcome types{" "}
            <span className="text-muted-foreground font-normal">
              ({outcomes.length})
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {outcomes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">
              No outcome types defined.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {outcomes.map((o) => (
                <Badge key={o.id} variant="outline" className="font-normal">
                  {o.name}
                  {o.category ? (
                    <span className="ml-1.5 text-muted-foreground/70">
                      · {o.category}
                    </span>
                  ) : null}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
