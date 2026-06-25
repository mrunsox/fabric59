import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ChevronRight, Folder, Inbox, Plug, Plus } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { WorkspacePageHeader } from "@/components/workspace/WorkspacePageHeader";
import {
  useIntegrationProviders,
  useWorkspaceIntegrationConnections,
  useCreateIntegrationConnection,
  useUpdateIntegrationConnection,
  type IntegrationConnection,
  type IntegrationProvider,
} from "@/hooks/useWorkspaceIntegrations";
import { useWorkspaceCampaigns } from "@/hooks/useWorkspaceCampaigns";

const CONNECTION_STATUS_TONE: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  connected: "success",
  error: "danger",
  disabled: "warning",
  not_connected: "neutral",
};

const UNASSIGNED_KEY = "__unassigned__";
type Selection = undefined | typeof UNASSIGNED_KEY | string;

export default function WorkspaceIntegrationsPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { data: providers = [] } = useIntegrationProviders();
  const { data: connections = [], isLoading } = useWorkspaceIntegrationConnections();
  const { data: campaigns = [] } = useWorkspaceCampaigns();
  const create = useCreateIntegrationConnection();
  const update = useUpdateIntegrationConnection();

  const [selection, setSelection] = useState<Selection>(undefined);
  const [open, setOpen] = useState(false);
  const [providerId, setProviderId] = useState<string>("");
  const [displayName, setDisplayName] = useState("");

  const providerById = useMemo(
    () => Object.fromEntries(providers.map((p) => [p.id, p])),
    [providers],
  );

  const connectionsByScope = useMemo(() => {
    const m = new Map<string, IntegrationConnection[]>();
    m.set(UNASSIGNED_KEY, []);
    for (const c of campaigns) m.set(c.id, []);
    for (const c of connections) {
      const key = c.campaign_id ?? UNASSIGNED_KEY;
      const arr = m.get(key) ?? [];
      arr.push(c);
      m.set(key, arr);
    }
    return m;
  }, [connections, campaigns]);

  const unassignedConnections = connectionsByScope.get(UNASSIGNED_KEY) ?? [];

  const openCreate = (presetProviderId?: string) => {
    setProviderId(presetProviderId ?? "");
    setDisplayName("");
    setOpen(true);
  };

  const handleCreate = async () => {
    if (!providerId || !selection || selection === UNASSIGNED_KEY) return;
    await create.mutateAsync({
      provider_id: providerId,
      display_name: displayName || providerById[providerId]?.display_name,
      campaign_id: selection,
    });
    setOpen(false);
  };

  const selectedCampaign =
    selection && selection !== UNASSIGNED_KEY
      ? campaigns.find((c) => c.id === selection)
      : null;
  const scopeLabel =
    selection === UNASSIGNED_KEY
      ? "Unassigned"
      : selectedCampaign?.name ?? null;

  return (
    <div className="space-y-6">
      <Dialog open={open} onOpenChange={setOpen}>
        {selection === undefined ? (
          <WorkspacePageHeader
            eyebrow="Integrations"
            title="Integrations"
            lede="Each campaign owns its own integrations. Pick a campaign to add or manage its connections."
          />
        ) : (
          <WorkspacePageHeader
            eyebrow="Integrations"
            title={`${scopeLabel} integrations`}
            lede={
              selection === UNASSIGNED_KEY
                ? "Legacy connections not yet attached to a campaign. Move each one to a campaign."
                : "Connections scoped only to this campaign."
            }
            action={
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => setSelection(undefined)}>
                  <ArrowLeft className="h-3.5 w-3.5 mr-1.5" /> Back
                </Button>
                {selection !== UNASSIGNED_KEY && (
                  <Button size="sm" onClick={() => openCreate()}>
                    <Plus className="h-3.5 w-3.5 mr-1.5" /> New connection
                  </Button>
                )}
              </div>
            }
          />
        )}

        <DialogContent>
          <DialogHeader>
            <DialogTitle>New connection</DialogTitle>
            <DialogDescription>
              Attaching to: {selectedCampaign?.name ?? "Campaign"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Provider</label>
              <Select value={providerId} onValueChange={setProviderId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.display_name}{" "}
                      <span className="text-xs text-muted-foreground">· {p.category}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Display name (optional)
              </label>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Production Clio"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!providerId || create.isPending}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selection === undefined && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Available providers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <AvailableProvidersBlock providers={providers} />
          </CardContent>
        </Card>
      )}

      {selection === undefined ? (
        <div className="space-y-6">
          <div>
            <h2 className="text-sm font-semibold mb-3">Integrations by campaign</h2>
            {campaigns.length === 0 ? (
              <EmptyState
                icon={Folder}
                title="No campaigns yet"
                description="Create a campaign to start attaching integrations."
              />
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {campaigns.map((c) => (
                  <ScopeCard
                    key={c.id}
                    icon={<Folder className="h-4 w-4" />}
                    title={c.name}
                    subtitle={c.status}
                    connections={connectionsByScope.get(c.id) ?? []}
                    providerById={providerById}
                    onOpen={() => setSelection(c.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {unassignedConnections.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold mb-3">Unassigned</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <ScopeCard
                  icon={<Inbox className="h-4 w-4" />}
                  title="Unassigned connections"
                  subtitle="Move each one to a campaign"
                  connections={unassignedConnections}
                  providerById={providerById}
                  onOpen={() => setSelection(UNASSIGNED_KEY)}
                />
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {selection !== UNASSIGNED_KEY && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Add an integration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {providers.length === 0 ? (
                    <span className="text-xs text-muted-foreground">No providers available.</span>
                  ) : (
                    providers.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => openCreate(p.id)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs hover:border-primary/50 hover:bg-accent transition-colors"
                      >
                        <Plus className="h-3 w-3" />
                        {p.display_name}
                        <span className="text-muted-foreground">· {p.category}</span>
                      </button>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (connectionsByScope.get(selection) ?? []).length === 0 ? (
            <EmptyState
              icon={Plug}
              title="No integrations yet"
              description="Pick a provider above to add one to this campaign."
            />
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {(connectionsByScope.get(selection) ?? []).map((c) => {
                const prov = providerById[c.provider_id];
                return (
                  <Card key={c.id} className="hover:border-primary/40 transition-colors">
                    <CardContent className="pt-5 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          to={`/w/${workspaceId}/integrations/${c.id}`}
                          className="block flex-1 min-w-0"
                        >
                          <div className="font-medium text-sm truncate">
                            {c.display_name ?? prov?.display_name ?? c.provider_id}
                          </div>
                          <div className="text-xs text-muted-foreground truncate">
                            {prov?.display_name ?? c.provider_id} · {prov?.category}
                          </div>
                        </Link>
                        <StatusBadge status={c.status} tone={CONNECTION_STATUS_TONE[c.status]} />
                      </div>
                      {c.last_error && (
                        <div className="text-xs text-destructive truncate">{c.last_error}</div>
                      )}
                      {c.last_sync_at && (
                        <div className="text-xs text-muted-foreground">
                          Last sync {new Date(c.last_sync_at).toLocaleString()}
                        </div>
                      )}
                      {selection === UNASSIGNED_KEY && (
                        <div className="pt-2 border-t flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">Move to:</span>
                          <Select
                            value=""
                            onValueChange={(v) =>
                              update.mutate({ id: c.id, patch: { campaign_id: v } })
                            }
                          >
                            <SelectTrigger className="h-7 text-xs">
                              <SelectValue placeholder="Pick campaign" />
                            </SelectTrigger>
                            <SelectContent>
                              {campaigns.map((cm) => (
                                <SelectItem key={cm.id} value={cm.id}>
                                  {cm.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ScopeCard({
  icon,
  title,
  subtitle,
  connections,
  providerById,
  onOpen,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  connections: IntegrationConnection[];
  providerById: Record<string, IntegrationProvider>;
  onOpen: () => void;
}) {
  const lastUpdated = connections.reduce<string | null>(
    (acc, c) => (!acc || c.updated_at > acc ? c.updated_at : acc),
    null,
  );
  const providerNames = Array.from(
    new Set(
      connections
        .map((c) => providerById[c.provider_id]?.display_name ?? c.provider_id)
        .filter(Boolean),
    ),
  ).slice(0, 4);

  return (
    <button type="button" onClick={onOpen} className="text-left group">
      <Card className="hover:border-primary/40 transition-colors h-full">
        <CardContent className="pt-5 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="text-muted-foreground">{icon}</div>
              <div className="min-w-0">
                <div className="font-medium text-sm truncate">{title}</div>
                <div className="text-xs text-muted-foreground capitalize truncate">{subtitle}</div>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{connections.length}</span>
            <span>{connections.length === 1 ? "integration" : "integrations"}</span>
          </div>
          {providerNames.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {providerNames.map((n) => (
                <Badge key={n} variant="outline" className="text-xs">
                  {n}
                </Badge>
              ))}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">No integrations yet — click to add.</div>
          )}
          {lastUpdated && (
            <div className="text-xs text-muted-foreground">
              Updated {new Date(lastUpdated).toLocaleDateString()}
            </div>
          )}
        </CardContent>
      </Card>
    </button>
  );
}

function AvailableProvidersBlock({ providers }: { providers: IntegrationProvider[] }) {
  const LEGAL_PM_CATEGORIES = new Set([
    "legal_pm",
    "legal-pm",
    "legal",
    "legal_practice_management",
  ]);
  const isLegalPm = (cat?: string) => !!cat && LEGAL_PM_CATEGORIES.has(cat);
  const legalProviders = providers.filter((p) => isLegalPm(p.category));
  const otherByCat = new Map<string, IntegrationProvider[]>();
  for (const p of providers) {
    if (isLegalPm(p.category)) continue;
    const key = p.category || "other";
    const arr = otherByCat.get(key) ?? [];
    arr.push(p);
    otherByCat.set(key, arr);
  }
  const legalNames = legalProviders.length
    ? legalProviders
    : providers.filter((p) =>
        ["clio", "mycase", "smokeball"].some((n) =>
          (p.display_name ?? "").toLowerCase().includes(n),
        ),
      );
  return (
    <>
      <div>
        <div className="text-xs font-semibold text-foreground mb-2">Legal practice management</div>
        <div className="flex flex-wrap gap-2">
          {legalNames.length === 0 ? (
            <span className="text-xs text-muted-foreground">No legal providers registered yet.</span>
          ) : (
            legalNames.map((p) => (
              <Badge key={p.id} variant="outline" className="text-xs">
                {p.display_name}
              </Badge>
            ))
          )}
          <Badge variant="outline" className="text-xs border-dashed text-muted-foreground">
            More integration packs coming
          </Badge>
        </div>
      </div>
      {[...otherByCat.entries()].map(([cat, list]) => (
        <div key={cat}>
          <div className="text-xs font-semibold text-foreground mb-2 capitalize">
            {cat.replace(/[_-]/g, " ")}
          </div>
          <div className="flex flex-wrap gap-2">
            {list.map((p) => (
              <Badge key={p.id} variant="outline" className="text-xs">
                {p.display_name}
              </Badge>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
