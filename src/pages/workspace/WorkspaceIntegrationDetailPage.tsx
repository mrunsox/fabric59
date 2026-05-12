import { useParams, Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2 } from "lucide-react";
import {
  useIntegrationConnection,
  useUpdateIntegrationConnection,
  useDeleteIntegrationConnection,
  useWorkspaceIntegrationMappings,
  useIntegrationProviders,
} from "@/hooks/useWorkspaceIntegrations";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function WorkspaceIntegrationDetailPage() {
  const { workspaceId, connectionId } = useParams<{
    workspaceId: string;
    connectionId: string;
  }>();
  const navigate = useNavigate();
  const { data: connection, isLoading } = useIntegrationConnection(connectionId);
  const { data: providers = [] } = useIntegrationProviders();
  const update = useUpdateIntegrationConnection();
  const remove = useDeleteIntegrationConnection();

  const { data: mappings = [] } = useWorkspaceIntegrationMappings({
    providerId: connection?.provider_id,
    limit: 50,
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!connection)
    return <p className="text-sm text-muted-foreground">Connection not found.</p>;

  const provider = providers.find((p) => p.id === connection.provider_id);

  const handleStatus = (status: string) =>
    update.mutate({ id: connection.id, patch: { status } });

  const handleDelete = async () => {
    if (!confirm("Delete this connection?")) return;
    await remove.mutateAsync(connection.id);
    navigate(`/app/workspaces/${workspaceId}/integrations`);
  };

  return (
    <div className="space-y-6">
      <div>
        <Link
          to={`/app/workspaces/${workspaceId}/integrations`}
          className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
        >
          <ArrowLeft className="h-3 w-3" /> Integrations
        </Link>
        <div className="flex items-start justify-between gap-4 mt-2">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {connection.display_name ?? provider?.display_name ?? connection.provider_id}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {provider?.display_name ?? connection.provider_id} · {provider?.category}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-1.5" /> Remove
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Badge variant="outline">{connection.status}</Badge>
            <Select value={connection.status} onValueChange={handleStatus}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="not_connected">Not connected</SelectItem>
                <SelectItem value="connected">Connected</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="disabled">Disabled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {connection.credentials_ref ? (
            <p className="text-xs text-muted-foreground">
              Credentials reference: <code>{connection.credentials_ref}</code>
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              No credentials reference set. Provider-specific OAuth/API key wiring lands in
              follow-up slices.
            </p>
          )}
          {connection.last_sync_at && (
            <p className="text-xs text-muted-foreground">
              Last sync {new Date(connection.last_sync_at).toLocaleString()}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Capabilities</CardTitle>
        </CardHeader>
        <CardContent>
          {provider ? (
            <pre className="text-xs bg-muted/40 p-3 rounded overflow-auto">
              {JSON.stringify(provider.capabilities, null, 2)}
            </pre>
          ) : (
            <p className="text-xs text-muted-foreground">Provider not in registry.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            Recent identity mappings ({mappings.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {mappings.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No mappings yet for this provider.
            </p>
          ) : (
            <div className="space-y-1.5">
              {mappings.slice(0, 25).map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between text-xs border rounded px-2.5 py-1.5"
                >
                  <div className="font-mono">
                    {m.lookup_kind}:{m.lookup_key}
                  </div>
                  <div className="text-muted-foreground truncate ml-3 max-w-[60%] text-right">
                    {Object.entries(m.external_ids)
                      .map(([k, v]) => `${k}=${String(v)}`)
                      .join(" · ")}
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="text-[11px] text-muted-foreground mt-3">
            Sources include canonical writes and mirrored legacy
            <code className="mx-1">clio_mappings</code>/
            <code>mycase_mappings</code> rows.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-muted/40 p-3 rounded overflow-auto">
            {JSON.stringify(connection.config, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
