import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Users, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/common/StatusBadge";
import { WorkspacePageHeader } from "@/components/workspace/WorkspacePageHeader";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceCampaigns } from "@/hooks/useWorkspaceCampaigns";
import { useSetWorkspaceScope } from "@/contexts/WorkspaceScopeContext";

/**
 * Workspace client detail (read-only).
 *
 * Clients are owned at the organization level; this surface verifies the
 * record belongs to the workspace's parent organization, displays the
 * canonical profile, and links any workspace campaigns that reference it.
 * Editing happens in the org admin Clients surface.
 */
export default function WorkspaceClientDetailPage() {
  const { workspaceId, clientId } = useParams<{ workspaceId: string; clientId: string }>();
  const { workspace, organizationId } = useWorkspace();
  const { data: campaigns = [] } = useWorkspaceCampaigns();

  const { data: client, isLoading, error } = useQuery({
    queryKey: ["workspace-client", clientId, organizationId],
    enabled: !!clientId && !!organizationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id, name, status, crm_type, organization_id, partner_id, created_at, updated_at")
        .eq("id", clientId!)
        .eq("organization_id", organizationId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const linkedCampaigns = campaigns.filter((c) => (c as { client_id?: string }).client_id === clientId);

  // Surface scope chips globally while this page is mounted.
  useSetWorkspaceScope(
    client ? { client: client.name, ownership: "inherited-from-org" } : {},
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <Button variant="ghost" size="sm" asChild>
        <Link to={`/w/${workspaceId}/clients`}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to clients
        </Link>
      </Button>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading client…</p>
      ) : error || !client ? (
        <p className="text-sm text-muted-foreground">Client not found in this workspace's organization.</p>
      ) : (
        <>
          <WorkspacePageHeader
            eyebrow="Client"
            title={client.name}
            secondary={<StatusBadge status={client.status ?? "active"} />}
          />

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Ownership &amp; scope</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <dl className="grid gap-y-2 gap-x-4 text-sm sm:grid-cols-[200px,1fr]">
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Visible in this workspace</dt>
                <dd>{workspace?.name ?? "This workspace"}</dd>

                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Owned at</dt>
                <dd>Organization level</dd>

                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Editable in</dt>
                <dd>Org admin → Clients</dd>

                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Inherited into this workspace</dt>
                <dd>Profile, CRM type, status, integration credentials, notification routing</dd>
              </dl>
              <div className="pt-1">
                <Button asChild size="sm" variant="outline">
                  <Link to={`/admin/clients/${client.id}`}>
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                    Go to org-level client settings
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">Profile</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-2">
                <Row label="Name" value={client.name} />
                <Row label="CRM" value={client.crm_type ?? "—"} />
                <Row label="Status" value={client.status ?? "active"} />
                <Row label="Created" value={new Date(client.created_at).toLocaleDateString()} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3 flex-row items-center gap-2 space-y-0">
                <Users className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Workspace campaigns</CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                {linkedCampaigns.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No campaigns in this workspace are linked to this client yet.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {linkedCampaigns.map((c) => (
                      <li key={c.id}>
                        <Link
                          to={`/w/${workspaceId}/campaigns/${c.id}`}
                          className="text-sm text-primary hover:underline"
                        >
                          {c.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm">{value}</span>
    </div>
  );
}
