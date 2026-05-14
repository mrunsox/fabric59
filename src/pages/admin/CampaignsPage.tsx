import { Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCampaignSetups } from "@/hooks/useCampaignSetup";
import { useActiveWorkspaceId } from "@/hooks/useActiveWorkspaceId";
import { Plus, Megaphone, Play, Square, Loader2 } from "lucide-react";
import { DEFAULT_CHECKLIST } from "@/types/campaign";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const STATUS_TABS: Array<{ value: string; label: string }> = [
  { value: "all", label: "All" },
  { value: "draft", label: "Drafts" },
  { value: "submitted", label: "Submitted" },
  { value: "provisioning", label: "Provisioning" },
  { value: "live", label: "Live" },
  { value: "archived", label: "Archived" },
];

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-primary/10 text-primary",
  provisioning: "bg-warning/10 text-warning",
  live: "bg-success/10 text-success",
  archived: "bg-muted text-muted-foreground",
};

export default function CampaignsPage() {
  const { data: campaigns = [], isLoading } = useCampaignSetups();
  const [actionLoading, setActionLoading] = useState<Record<string, string>>({});
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get("status") ?? "all";
  const { workspaceId: activeWorkspaceId } = useActiveWorkspaceId();
  // Canonical campaign create lives at /w/:workspaceId/campaigns/new. Fall back to
  // the workspaces index when no workspace is resolvable yet.
  const newCampaignHref = activeWorkspaceId
    ? `/w/${activeWorkspaceId}/campaigns/new`
    : "/admin/workspaces";

  const filtered = useMemo(() => {
    if (status === "all") return campaigns;
    return campaigns.filter((c) => c.status === status);
  }, [campaigns, status]);

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: campaigns.length };
    for (const c of campaigns) map[c.status] = (map[c.status] ?? 0) + 1;
    return map;
  }, [campaigns]);

  const setStatus = (next: string) => {
    const params = new URLSearchParams(searchParams);
    if (next === "all") params.delete("status");
    else params.set("status", next);
    setSearchParams(params, { replace: true });
  };

  const getProgress = (checklist: Record<string, { done: boolean }>) => {
    const total = DEFAULT_CHECKLIST.length;
    const done = Object.values(checklist).filter((v) => v.done).length;
    return `${done}/${total}`;
  };

  const handleCampaignAction = async (campaignName: string, action: 'startCampaign' | 'stopCampaign' | 'forceStopCampaign', e: React.MouseEvent) => {
    e.stopPropagation();
    setActionLoading(prev => ({ ...prev, [campaignName]: action }));
    try {
      const { data, error } = await supabase.functions.invoke('five9-provisioning', {
        body: { action, campaignName },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Action failed');
      toast.success(`${action === 'startCampaign' ? 'Started' : 'Stopped'} campaign: ${campaignName}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Campaign action failed');
    } finally {
      setActionLoading(prev => { const n = { ...prev }; delete n[campaignName]; return n; });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="h-6 w-6" /> Campaigns
          </h1>
          <p className="text-sm text-muted-foreground">One canonical campaign list — filter by status below.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild className="gap-2">
            <Link to={newCampaignHref}><Plus className="h-4 w-4" /> New Campaign</Link>
          </Button>
        </div>
      </div>

      <Tabs value={status} onValueChange={setStatus}>
        <TabsList>
          {STATUS_TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="gap-1.5">
              {t.label}
              <span className="text-[10px] text-muted-foreground">{counts[t.value] ?? 0}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading campaigns...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No campaigns {status !== "all" ? `with status "${status}"` : "yet"}</p>
          <p className="text-sm mb-4">{status === "all" ? "Create your first campaign setup to get started." : "Try a different filter or create a new campaign."}</p>
          <Button asChild><Link to="/admin/campaigns/new">Create Campaign</Link></Button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Go-Live</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => {
                const name = c.campaign_name;
                const loading = actionLoading[name];
                return (
                  <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => window.location.href = `/admin/campaigns/${c.id}`}>
                    <TableCell className="font-medium">{name}</TableCell>
                    <TableCell>{c.client_name}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[c.status] || ""} variant="secondary">{c.status}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{getProgress(c.checklist_state as any || {})}</TableCell>
                    <TableCell className="text-sm">{c.target_go_live ? format(new Date(c.target_go_live), "MMM d, yyyy") : "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{format(new Date(c.created_at), "MMM d, yyyy")}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Start Campaign"
                          disabled={!!loading}
                          onClick={(e) => handleCampaignAction(name, 'startCampaign', e)}
                        >
                          {loading === 'startCampaign' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 text-success" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Stop Campaign"
                          disabled={!!loading}
                          onClick={(e) => handleCampaignAction(name, 'stopCampaign', e)}
                        >
                          {loading === 'stopCampaign' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4 text-destructive" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}