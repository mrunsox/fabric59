import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GitCompare, History, RotateCcw, Eye } from "lucide-react";
import type { FormVersion } from "@/hooks/useFormBuilder";
import { useRollbackFormVersion } from "@/hooks/useFormBuilder";
import type { FormField, FormSchema } from "@/types/form-builder";

type Props = {
  formId: string;
  versions: FormVersion[];
  onLoadIntoBuilder: (schema: FormSchema, version: number) => void;
};

type FieldChange =
  | { kind: "added"; key: string; field: FormField }
  | { kind: "removed"; key: string; field: FormField }
  | { kind: "modified"; key: string; before: FormField; after: FormField; props: string[] };

function diffSchemas(a: FormSchema, b: FormSchema): {
  changes: FieldChange[];
  confirmation: { changed: boolean; before?: string; after?: string };
} {
  const aFields = a?.fields ?? [];
  const bFields = b?.fields ?? [];
  const aMap = new Map(aFields.map((f) => [f.key, f]));
  const bMap = new Map(bFields.map((f) => [f.key, f]));
  const changes: FieldChange[] = [];

  for (const f of bFields) {
    if (!aMap.has(f.key)) changes.push({ kind: "added", key: f.key, field: f });
  }
  for (const f of aFields) {
    if (!bMap.has(f.key)) changes.push({ kind: "removed", key: f.key, field: f });
  }
  for (const f of aFields) {
    const other = bMap.get(f.key);
    if (!other) continue;
    const props: string[] = [];
    const compare: (keyof FormField)[] = ["label", "type", "required", "helpText", "placeholder", "mapping"];
    for (const k of compare) {
      if (JSON.stringify(f[k] ?? null) !== JSON.stringify(other[k] ?? null)) props.push(String(k));
    }
    if (JSON.stringify(f.options ?? null) !== JSON.stringify(other.options ?? null)) props.push("options");
    if (JSON.stringify(f.visibleIf ?? null) !== JSON.stringify(other.visibleIf ?? null)) props.push("visibleIf");
    if (props.length) changes.push({ kind: "modified", key: f.key, before: f, after: other, props });
  }

  const confirmation = {
    changed: (a?.confirmation ?? "") !== (b?.confirmation ?? ""),
    before: a?.confirmation,
    after: b?.confirmation,
  };
  return { changes, confirmation };
}

function ChangeBadge({ kind }: { kind: FieldChange["kind"] }) {
  const map: Record<FieldChange["kind"], string> = {
    added: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
    removed: "bg-destructive/10 text-destructive border-destructive/30",
    modified: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  };
  return <Badge variant="outline" className={`text-[10px] uppercase ${map[kind]}`}>{kind}</Badge>;
}

export function FormVersionHistory({ formId, versions, onLoadIntoBuilder }: Props) {
  const rollback = useRollbackFormVersion();
  const [compareWith, setCompareWith] = useState<string>("");
  const [previewVersion, setPreviewVersion] = useState<FormVersion | null>(null);
  const [rollbackTarget, setRollbackTarget] = useState<FormVersion | null>(null);

  const sorted = useMemo(() => [...versions].sort((a, b) => b.version - a.version), [versions]);
  const current = sorted.find((v) => v.is_current) ?? sorted[0];
  const compareTarget = sorted.find((v) => v.id === compareWith);

  const diff = useMemo(() => {
    if (!current || !compareTarget) return null;
    return diffSchemas(compareTarget.schema, current.schema);
  }, [current, compareTarget]);

  if (sorted.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          No published versions yet. Publish a version to snapshot the schema.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <GitCompare className="h-4 w-4" /> Compare against current (v{current?.version})
            </CardTitle>
            <Select value={compareWith} onValueChange={setCompareWith}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Pick a version to compare…" />
              </SelectTrigger>
              <SelectContent>
                {sorted
                  .filter((v) => v.id !== current?.id)
                  .map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      v{v.version} · {new Date(v.created_at).toLocaleDateString()}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {!compareTarget ? (
            <p className="text-sm text-muted-foreground">Select an older version to see what changed.</p>
          ) : diff && diff.changes.length === 0 && !diff.confirmation.changed ? (
            <p className="text-sm text-muted-foreground">No differences between v{compareTarget.version} and v{current?.version}.</p>
          ) : (
            <ul className="space-y-2">
              {diff?.changes.map((c) => (
                <li key={`${c.kind}-${c.key}`} className="border rounded px-3 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <ChangeBadge kind={c.kind} />
                    <code className="text-xs">{c.key}</code>
                    {c.kind === "modified" && (
                      <span className="text-xs text-muted-foreground">changed: {c.props.join(", ")}</span>
                    )}
                  </div>
                  {c.kind === "added" && (
                    <p className="text-xs text-muted-foreground mt-1">+ {c.field.label} ({c.field.type})</p>
                  )}
                  {c.kind === "removed" && (
                    <p className="text-xs text-muted-foreground mt-1">− {c.field.label} ({c.field.type})</p>
                  )}
                  {c.kind === "modified" && (
                    <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                      <pre className="bg-muted/40 rounded p-2 overflow-x-auto">{JSON.stringify(c.before, null, 2)}</pre>
                      <pre className="bg-muted/40 rounded p-2 overflow-x-auto">{JSON.stringify(c.after, null, 2)}</pre>
                    </div>
                  )}
                </li>
              ))}
              {diff?.confirmation.changed && (
                <li className="border rounded px-3 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <ChangeBadge kind="modified" />
                    <span className="text-xs">confirmation message</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                    <pre className="bg-muted/40 rounded p-2">{diff.confirmation.before || "(empty)"}</pre>
                    <pre className="bg-muted/40 rounded p-2">{diff.confirmation.after || "(empty)"}</pre>
                  </div>
                </li>
              )}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" /> Version history
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {sorted.map((v) => (
              <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 border rounded px-3 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">v{v.version}</Badge>
                  {v.is_current && <Badge className="text-xs">Current</Badge>}
                  <span className="text-muted-foreground text-xs">{new Date(v.created_at).toLocaleString()}</span>
                  {v.notes && <span className="text-xs text-muted-foreground italic">— {v.notes}</span>}
                  <span className="text-xs text-muted-foreground">
                    · {v.schema?.fields?.length ?? 0} fields
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setPreviewVersion(v)}>
                    <Eye className="h-3.5 w-3.5 mr-1" /> View
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onLoadIntoBuilder(v.schema, v.version)}
                  >
                    Load into builder
                  </Button>
                  {!v.is_current && (
                    <Button size="sm" variant="outline" onClick={() => setRollbackTarget(v)}>
                      <RotateCcw className="h-3.5 w-3.5 mr-1" /> Rollback
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Dialog open={!!previewVersion} onOpenChange={(o) => !o && setPreviewVersion(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Snapshot · v{previewVersion?.version}</DialogTitle>
            <DialogDescription>
              {previewVersion && new Date(previewVersion.created_at).toLocaleString()}
            </DialogDescription>
          </DialogHeader>
          <pre className="bg-muted/40 rounded p-3 text-xs overflow-x-auto max-h-[60vh]">
{JSON.stringify(previewVersion?.schema ?? {}, null, 2)}
          </pre>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rollbackTarget} onOpenChange={(o) => !o && setRollbackTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore v{rollbackTarget?.version}?</DialogTitle>
            <DialogDescription>
              This publishes a new version that copies the schema from v{rollbackTarget?.version}.
              The current version stays in history for audit.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRollbackTarget(null)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!rollbackTarget) return;
                rollback.mutate(
                  { formId, sourceVersion: rollbackTarget.version, schema: rollbackTarget.schema },
                  { onSuccess: () => setRollbackTarget(null) }
                );
              }}
              disabled={rollback.isPending}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              {rollback.isPending ? "Restoring…" : "Restore version"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
