import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useIntegrationProviders } from "@/hooks/useWorkspaceIntegrations";
import { OrgPageHeader } from "@/components/org/OrgPageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Plug, ArrowLeft, ArrowRight } from "lucide-react";
import { format } from "date-fns";

/**
 * Phase 5 — Canonical /org/connectors/:slug.
 *
 * Org-level connector detail. Shows provider identity + every connection across
 * the org's workspaces. Open opens the workspace-scoped configurator (where the
 * actual provider config lives). No provider-specific controls are fabricated
 * here — those stay inside their own configurators.
 */

type ConnRow = {
  id: string;
  workspace_id: string;
  provider_id: string;
  display_name: string | null;
  status: string;
  client_id: string | null;
  last_sync_at: string | null;
  last_error: string | null;
  updated_at: string;
};

export default function OrgConnectorDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { organization } = useAuth();
  const { data: providers = [] } = useIntegrationProviders();
  const provider = providers.find((p) => p.id === slug);

  const { data: connections = [], isLoading } = useQuery({
    queryKey: ["org-connector-detail", organization?.id, slug],
    enabled: !!organization?.id && !!slug,
    queryFn: async (): Promise<ConnRow[]> => {
      const { data, error } = await supabase
        .from("integration_connections" as never)
        .select("id, workspace_id, provider_id, display_name, status, client_id, last_sync_at, last_error, updated_at")
        .eq("organization_id", organization!.id)
        .eq("provider_id", slug!)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ConnRow[];
    },
  });

  const { data: workspaces = [] } = useQuery({
    queryKey: ["org-workspaces-lite", organization?.id],
    enabled: !!organization?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspaces")
        .select("id, name")
        .eq("organization_id", organization!.id);
      if (error) throw error;
      return data ?? [];
    },
  });
  const wsName = (id: string) => workspaces.find((w) => w.id === id)?.name ?? id.slice(0, 8);

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-6 animate-fade-in">
      <Button asChild variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
        <Link to="/org/connectors">
          <ArrowLeft className="h-4 w-4 mr-1" /> All connectors
        </Link>
      </Button>

      <OrgPageHeader
        eyebrow="Org connector"
        title={provider?.display_name ?? (slug ?? "Connector")}
        lede={
          provider
            ? `Org-level view for the ${provider.display_name} connector. Provider configuration lives inside each workspace; this page shows status across the organization.`
            : "Connector identity could not be resolved against the provider registry."
        }
      />

      {provider && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Provider</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3 text-sm">
            <Field label="Category" value={<span className="capitalize">{provider.category}</span>} />
            <Field label="Auth type" value={<span className="capitalize">{provider.auth_type.replace(/_/g, " ")}</span>} />
            <Field label="Active" value={<Badge variant="outline">{provider.is_active ? "yes" : "no"}</Badge>} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Connections in this organization</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
          ) : connections.length === 0 ? (
            <EmptyState
              icon={Plug}
              title="No connections yet"
              description="No workspace in this organization has configured this connector. Open a workspace to add one."
            />
          ) : (
            <div className="divide-y divide-border/60">
              {connections.map((c) => (
                <div key={c.id} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{c.display_name || "Untitled connection"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Workspace: {wsName(c.workspace_id)}
                      {c.last_sync_at && (
                        <>
                          {" · Last sync "}
                          {format(new Date(c.last_sync_at), "MMM d, HH:mm")}
                        </>
                      )}
                    </p>
                    {c.last_error && (
                      <p className="text-xs text-destructive mt-1 truncate max-w-xl">{c.last_error}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={c.status || "not_connected"} />
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/w/${c.workspace_id}/integrations/${c.id}`}>
                        Open <ArrowRight className="h-3.5 w-3.5 ml-1" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm">{value}</div>
    </div>
  );
}
