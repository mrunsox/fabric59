import { useEffect, useMemo, useState } from "react";
import { ListChecks, Plus, ArrowLeft, ChevronRight, Folder, Inbox, Pencil, Trash2 } from "lucide-react";
import { WorkspacePageHeader } from "@/components/workspace/WorkspacePageHeader";
import { EmptyState } from "@/components/common/EmptyState";
import {
  useDispositions,
  useCreateDisposition,
  useUpdateDisposition,
  useDeleteDisposition,
  type Disposition,
} from "@/hooks/useDispositions";
import { useCallOutcomeTypes } from "@/hooks/useCallOutcomes";
import { useWorkspaceCampaigns } from "@/hooks/useWorkspaceCampaigns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const WORKSPACE_KEY = "__workspace__";

type Selection = undefined | null | string;

export default function WorkspaceDispositionsPage() {
  const { data: dispositions = [], isLoading } = useDispositions();
  const { data: outcomes = [] } = useCallOutcomeTypes();
  const { data: campaigns = [] } = useWorkspaceCampaigns();

  const [selection, setSelection] = useState<Selection>(undefined);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Disposition | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Disposition | null>(null);

  const deleteMut = useDeleteDisposition();

  const grouped = useMemo(() => {
    const map = new Map<string, Disposition[]>();
    map.set(WORKSPACE_KEY, []);
    for (const c of campaigns) map.set(c.id, []);
    for (const d of dispositions) {
      const key = d.campaign_id ?? WORKSPACE_KEY;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(d);
    }
    return map;
  }, [dispositions, campaigns]);

  const campaignNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of campaigns) m.set(c.id, c.name);
    return m;
  }, [campaigns]);

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }
  function openEdit(d: Disposition) {
    setEditing(d);
    setFormOpen(true);
  }

  // Drilled-in view
  if (selection !== undefined) {
    const key = selection ?? WORKSPACE_KEY;
    const list = (grouped.get(key) ?? []).slice().sort(
      (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name),
    );
    const heading = selection ? campaignNameById.get(selection) ?? "Campaign" : "Workspace-wide";

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setSelection(undefined)}>
              <ArrowLeft className="mr-1.5 h-4 w-4" /> All campaigns
            </Button>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">{heading} · Dispositions</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {selection
                  ? "Isolated to this campaign's agents, routing, and post-call automations."
                  : "Shared across every campaign in this workspace."}
              </p>
            </div>
          </div>
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1.5 h-4 w-4" /> New disposition
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="py-6 text-sm text-muted-foreground">Loading…</div>
            ) : list.length === 0 ? (
              <EmptyState
                icon={ListChecks}
                title="No dispositions here yet"
                description={
                  selection
                    ? "Add the outcomes agents should pick from for this campaign."
                    : "Add dispositions that should apply across every campaign."
                }
                action={
                  <Button size="sm" onClick={openCreate}>
                    <Plus className="mr-1.5 h-4 w-4" /> New disposition
                  </Button>
                }
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="w-24">Order</TableHead>
                    <TableHead className="w-24">Status</TableHead>
                    <TableHead className="w-40">Updated</TableHead>
                    <TableHead className="w-24 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">{d.sort_order}</TableCell>
                      <TableCell>
                        <Badge variant={d.is_active ? "default" : "secondary"}>
                          {d.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {new Date(d.updated_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(d)} aria-label="Edit">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget(d)}
                            aria-label="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <DispositionFormDialog
          open={formOpen}
          onOpenChange={setFormOpen}
          editing={editing}
          defaultCampaignId={selection ?? null}
          campaignName={selection ? campaignNameById.get(selection) ?? null : null}
          lockCampaign
        />

        <DeleteDialog
          target={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={async () => {
            if (!deleteTarget) return;
            await deleteMut.mutateAsync(deleteTarget.id);
            setDeleteTarget(null);
          }}
        />
      </div>
    );
  }

  // Index grid view
  return (
    <div className="space-y-6">
      <WorkspacePageHeader
        eyebrow="Operate"
        title="Dispositions"
        lede="Disposition labels surfaced to agents and routed to outcomes & post-call automations."
      />

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Open a campaign to manage its isolated dispositions, or use the Workspace-wide card for
          shared labels.
        </p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1.5 h-4 w-4" /> New disposition
        </Button>
      </div>

      {isLoading ? (
        <div className="py-6 text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <DispositionCard
            icon={<Inbox className="h-4 w-4" />}
            title="Workspace-wide"
            subtitle="Shared across every campaign"
            items={grouped.get(WORKSPACE_KEY) ?? []}
            onClick={() => setSelection(null)}
          />
          {campaigns.map((c) => (
            <DispositionCard
              key={c.id}
              icon={<Folder className="h-4 w-4" />}
              title={c.name}
              subtitle="Campaign-scoped dispositions"
              items={grouped.get(c.id) ?? []}
              onClick={() => setSelection(c.id)}
            />
          ))}
          {campaigns.length === 0 ? (
            <Card className="flex items-center justify-center border-dashed p-6 text-center text-sm text-muted-foreground">
              Create a campaign to give it its own dispositions.
            </Card>
          ) : null}
        </div>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">
            Outcome types{" "}
            <span className="text-muted-foreground font-normal">({outcomes.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {outcomes.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">No outcome types defined.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {outcomes.map((o) => (
                <Badge key={o.id} variant="outline" className="font-normal">
                  {o.name}
                  {o.category ? (
                    <span className="ml-1.5 text-muted-foreground/70">· {o.category}</span>
                  ) : null}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <DispositionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
        defaultCampaignId={null}
        campaignName={null}
        lockCampaign={false}
        allCampaigns={campaigns}
      />
    </div>
  );
}

function DispositionCard({
  icon,
  title,
  subtitle,
  items,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  items: Disposition[];
  onClick: () => void;
}) {
  const active = items.filter((d) => d.is_active).length;
  const inactive = items.length - active;
  const lastUpdated = items.reduce<string | null>(
    (acc, d) => (!acc || d.updated_at > acc ? d.updated_at : acc),
    null,
  );

  return (
    <button
      type="button"
      onClick={onClick}
      className="group text-left transition-transform hover:-translate-y-0.5 focus:outline-none"
    >
      <Card className="h-full p-4 transition-shadow group-hover:shadow-md">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-muted p-1.5 text-muted-foreground">{icon}</span>
            <div>
              <div className="text-sm font-semibold text-foreground">{title}</div>
              <div className="text-xs text-muted-foreground">{subtitle}</div>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </div>
        <div className="mt-4 flex items-baseline gap-1">
          <span className="text-2xl font-semibold tabular-nums text-foreground">
            {items.length}
          </span>
          <span className="text-xs text-muted-foreground">
            disposition{items.length === 1 ? "" : "s"}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {active > 0 ? <Badge variant="default">{active} active</Badge> : null}
          {inactive > 0 ? <Badge variant="secondary">{inactive} inactive</Badge> : null}
          {items.length === 0 ? <Badge variant="outline">None yet</Badge> : null}
        </div>
        {lastUpdated ? (
          <div className="mt-3 text-xs text-muted-foreground">
            Last update {new Date(lastUpdated).toLocaleDateString()}
          </div>
        ) : null}
      </Card>
    </button>
  );
}

function DispositionFormDialog({
  open,
  onOpenChange,
  editing,
  defaultCampaignId,
  campaignName,
  lockCampaign,
  allCampaigns,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Disposition | null;
  defaultCampaignId: string | null;
  campaignName: string | null;
  lockCampaign: boolean;
  allCampaigns?: { id: string; name: string }[];
}) {
  const create = useCreateDisposition();
  const update = useUpdateDisposition();
  const submitting = create.isPending || update.isPending;

  const [name, setName] = useState("");
  const [sortOrder, setSortOrder] = useState<number>(0);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [campaignId, setCampaignId] = useState<string | null>(defaultCampaignId);

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setName(editing?.name ?? "");
      setSortOrder(editing?.sort_order ?? 0);
      setIsActive(editing?.is_active ?? true);
      setCampaignId(editing?.campaign_id ?? defaultCampaignId);
    }
  }, [open, editing, defaultCampaignId]);

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (editing) {
      await update.mutateAsync({
        id: editing.id,
        name: trimmed,
        sortOrder,
        isActive,
        campaignId: lockCampaign ? editing.campaign_id : campaignId,
      });
    } else {
      await create.mutateAsync({
        name: trimmed,
        sortOrder,
        isActive,
        campaignId: lockCampaign ? defaultCampaignId : campaignId,
      });
    }
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit disposition" : "New disposition"}</DialogTitle>
          <DialogDescription>
            Dispositions are the outcomes agents pick at the end of a call.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {lockCampaign ? (
            <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              Scope:{" "}
              <span className="font-medium text-foreground">
                {campaignName ?? "Workspace-wide"}
              </span>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="disp-campaign">Campaign</Label>
              <select
                id="disp-campaign"
                value={campaignId ?? ""}
                onChange={(e) => setCampaignId(e.target.value || null)}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="">Workspace-wide (no campaign)</option>
                {(allCampaigns ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="disp-name">Name</Label>
            <Input
              id="disp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Qualified — schedule callback"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="disp-order">Sort order</Label>
              <Input
                id="disp-order"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
              />
            </div>
            <div className="flex items-end gap-2">
              <Switch id="disp-active" checked={isActive} onCheckedChange={setIsActive} />
              <Label htmlFor="disp-active" className="mb-2">
                Active
              </Label>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting || !name.trim()}>
            {editing ? "Save changes" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeleteDialog({
  target,
  onCancel,
  onConfirm,
}: {
  target: Disposition | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog open={!!target} onOpenChange={(v) => !v && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete disposition?</AlertDialogTitle>
          <AlertDialogDescription>
            “{target?.name}” will be removed. Calls already tagged with it keep the label, but
            agents will no longer see it as an option.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Delete</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
