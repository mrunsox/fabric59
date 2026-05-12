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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Plug, Plus } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import {
  useIntegrationProviders,
  useWorkspaceIntegrationConnections,
  useCreateIntegrationConnection,
} from "@/hooks/useWorkspaceIntegrations";

const CONNECTION_STATUS_TONE: Record<string, "success" | "warning" | "danger" | "neutral"> = {
  connected: "success",
  error: "danger",
  disabled: "warning",
};

export default function WorkspaceIntegrationsPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { data: providers = [] } = useIntegrationProviders();
  const { data: connections = [], isLoading } = useWorkspaceIntegrationConnections();
  const create = useCreateIntegrationConnection();

  const [open, setOpen] = useState(false);
  const [providerId, setProviderId] = useState<string>("");
  const [displayName, setDisplayName] = useState("");

  const providerById = useMemo(
    () => Object.fromEntries(providers.map((p) => [p.id, p])),
    [providers],
  );

  const handleCreate = async () => {
    if (!providerId) return;
    await create.mutateAsync({
      provider_id: providerId,
      display_name: displayName || providerById[providerId]?.display_name,
    });
    setOpen(false);
    setProviderId("");
    setDisplayName("");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Workspace-scoped, provider-agnostic connections. Phase 7 canonical layer.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-1.5" /> New connection
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New connection</DialogTitle>
              <DialogDescription>
                Pick a provider from the canonical registry. Credentials are configured after creation.
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
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Available providers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {providers.map((p) => (
              <Badge key={p.id} variant="outline" className="text-xs">
                {p.display_name} · {p.category}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-sm font-semibold mb-3">Connections</h2>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : connections.length === 0 ? (
          <EmptyState
            icon={Plug}
            title="No connections yet"
            description="Create your first connection from a provider above to begin syncing data."
          />
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {connections.map((c) => {
              const prov = providerById[c.provider_id];
              return (
                <Link
                  key={c.id}
                  to={`/app/workspaces/${workspaceId}/integrations/${c.id}`}
                  className="block"
                >
                  <Card className="hover:border-primary/40 transition-colors">
                    <CardContent className="pt-5 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-medium text-sm">
                            {c.display_name ?? prov?.display_name ?? c.provider_id}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {prov?.display_name ?? c.provider_id} · {prov?.category}
                          </div>
                        </div>
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
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
