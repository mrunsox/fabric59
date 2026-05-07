import { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Rocket, StickyNote, Users } from "lucide-react";
import { GA_READINESS_CHECKLIST } from "@/data/legal-connect-feedback";
import { useGAChecklistState, useUpsertGAChecklistItem } from "@/hooks/useGAChecklistState";
import { useTenant } from "@/hooks/useTenants";

interface Props {
  tenantId: string;
}

export default function TenantGAReadinessPanel({ tenantId }: Props) {
  const { data: tenant } = useTenant(tenantId);
  const orgId = tenant?.organization_id;
  const { data: state = {} } = useGAChecklistState(tenantId);
  const upsert = useUpsertGAChecklistItem(tenantId, orgId);
  const [openNote, setOpenNote] = useState<string | null>(null);
  const [draftNote, setDraftNote] = useState("");

  const { total, done } = useMemo(() => {
    const all = GA_READINESS_CHECKLIST.flatMap((s) => s.items);
    return { total: all.length, done: all.filter((i) => state[i.id]?.status === "done").length };
  }, [state]);
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  const toggle = (itemId: string, on: boolean) =>
    upsert.mutate({ item_id: itemId, status: on ? "done" : "todo", note: state[itemId]?.note ?? null });

  const saveNote = (itemId: string) => {
    upsert.mutate({ item_id: itemId, status: state[itemId]?.status ?? "todo", note: draftNote || null });
    setOpenNote(null);
    setDraftNote("");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Rocket className="h-4 w-4 text-primary" /> GA readiness checklist
            </CardTitle>
            <CardDescription className="text-xs flex items-center gap-1.5">
              <Users className="h-3 w-3" /> Shared state for this client. Visible to all operators on the
              tenant — the source of truth for go-live sign-off.
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs">{done} / {total} · {pct}%</Badge>
        </div>
        <Progress value={pct} className="mt-3 h-1.5" />
      </CardHeader>
      <CardContent className="space-y-5">
        {GA_READINESS_CHECKLIST.map((section) => (
          <div key={section.section} className="space-y-2">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {section.section}
            </div>
            <div className="space-y-1.5">
              {section.items.map((item) => {
                const row = state[item.id];
                const isDone = row?.status === "done";
                return (
                  <div key={item.id} className="rounded-md border border-border p-2.5 hover:bg-muted/40">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <Checkbox
                        checked={isDone}
                        onCheckedChange={(v) => toggle(item.id, !!v)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm leading-snug">{item.label}</div>
                        {row?.updated_at && (
                          <div className="text-[11px] text-muted-foreground mt-0.5">
                            {row.status === "done" ? "Done" : "Updated"} ·{" "}
                            {new Date(row.updated_at).toLocaleDateString()}
                            {row.updated_by_name ? ` · ${row.updated_by_name}` : ""}
                          </div>
                        )}
                        {row?.note && openNote !== item.id && (
                          <div className="mt-1 text-xs text-muted-foreground italic">"{row.note}"</div>
                        )}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2"
                        onClick={(e) => {
                          e.preventDefault();
                          setOpenNote(openNote === item.id ? null : item.id);
                          setDraftNote(row?.note ?? "");
                        }}
                      >
                        <StickyNote className="h-3.5 w-3.5" />
                      </Button>
                    </label>
                    {openNote === item.id && (
                      <div className="mt-2 space-y-1.5">
                        <Textarea
                          value={draftNote}
                          onChange={(e) => setDraftNote(e.target.value)}
                          rows={2}
                          placeholder="Evidence, blocker, or context…"
                          className="text-xs"
                        />
                        <div className="flex justify-end gap-1.5">
                          <Button size="sm" variant="ghost" onClick={() => setOpenNote(null)}>
                            Cancel
                          </Button>
                          <Button size="sm" onClick={() => saveNote(item.id)}>Save note</Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
