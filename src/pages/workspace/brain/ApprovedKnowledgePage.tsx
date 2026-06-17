import { useParams } from "react-router-dom";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Link as LinkIcon } from "lucide-react";
import {
  useBbFacts,
  type BbFactRow,
} from "@/hooks/useBusinessBrain";
import {
  BB_ENTITY_TYPES,
  ENTITY_LABEL,
} from "@/lib/business-brain/entitySchemas";
import type { BbEntityType } from "@/lib/business-brain/types";

function VerificationBadge({ state }: { state: BbFactRow["verification_state"] }) {
  const map = {
    approved: { label: "Approved", cls: "bg-emerald-100 text-emerald-900" },
    needs_review: { label: "Needs review", cls: "bg-amber-100 text-amber-900" },
    stale: { label: "Stale", cls: "bg-slate-100 text-slate-700" },
  } as const;
  const e = map[state];
  return <Badge variant="secondary" className={e.cls}>{e.label}</Badge>;
}

export default function ApprovedKnowledgePage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { data: facts = [], isLoading } = useBbFacts(workspaceId ?? null);
  const [filter, setFilter] = useState<"all" | BbEntityType>("all");

  const grouped = useMemo(() => {
    const out: Record<string, BbFactRow[]> = {};
    for (const f of facts) {
      if (f.verification_state === "stale") continue;
      (out[f.entity_type] ||= []).push(f);
    }
    return out;
  }, [facts]);

  const visibleTypes = useMemo<BbEntityType[]>(() => {
    return BB_ENTITY_TYPES.filter((t) => (filter === "all" ? true : t === filter));
  }, [filter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Approved knowledge</h2>
          <p className="text-sm text-muted-foreground">
            Governed business memory. Every fact is reviewer-approved and source-backed.
          </p>
        </div>
        <Select value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types ({facts.length})</SelectItem>
            {BB_ENTITY_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {ENTITY_LABEL[t]} ({(grouped[t] ?? []).length})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading approved knowledge…
        </div>
      ) : facts.length === 0 ? (
        <Card className="px-6 py-12 text-center text-sm text-muted-foreground">
          No approved facts yet. Review the Suggested Facts queue to start building the Brain.
        </Card>
      ) : (
        <div className="space-y-6">
          {visibleTypes.map((t) => {
            const rows = grouped[t] ?? [];
            if (rows.length === 0) return null;
            return (
              <section key={t} className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground">
                  {ENTITY_LABEL[t]}
                  <span className="ml-2 text-xs font-normal">({rows.length})</span>
                </h3>
                <Card className="overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="border-b bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2 font-medium">Name</th>
                        <th className="px-4 py-2 font-medium">Details</th>
                        <th className="px-4 py-2 font-medium">Sources</th>
                        <th className="px-4 py-2 font-medium">Verification</th>
                        <th className="px-4 py-2 font-medium">Last reviewed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((f) => (
                        <tr key={f.id} className="border-b last:border-0 align-top">
                          <td className="px-4 py-3 font-medium">{f.display_name}</td>
                          <td className="px-4 py-3">
                            <pre className="max-w-[28rem] overflow-x-auto text-xs text-muted-foreground">
                              {JSON.stringify(f.payload, null, 0)}
                            </pre>
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <LinkIcon className="h-3 w-3" />
                              {f.source_refs.length}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <VerificationBadge state={f.verification_state} />
                          </td>
                          <td className="px-4 py-3 text-xs text-muted-foreground">
                            {new Date(f.last_reviewed_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
