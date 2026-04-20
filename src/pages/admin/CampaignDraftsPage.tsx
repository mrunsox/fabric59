import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileEdit, Plus, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";

const STEP_LABELS = ["Basics", "Variables", "Profile", "Dispositions", "Routing", "Readiness"];

export default function CampaignDraftsPage() {
  const { organization } = useAuth();
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organization) return;
    (supabase as any)
      .from("campaign_builder_drafts")
      .select("*")
      .eq("organization_id", organization.id)
      .neq("status", "configured")
      .order("updated_at", { ascending: false })
      .then(({ data }: any) => {
        setDrafts(data || []);
        setLoading(false);
      });
  }, [organization]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Campaign drafts"
        subtitle="In-progress campaigns saved from the builder"
        icon={<FileEdit className="h-6 w-6 text-primary" />}
      >
        <Button asChild>
          <Link to="/admin/five9/campaign-builder"><Plus className="h-4 w-4 mr-1.5" />New draft</Link>
        </Button>
      </PageHeader>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : drafts.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <FileEdit className="h-10 w-10 mx-auto text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No drafts in progress.</p>
            <Button asChild>
              <Link to="/admin/five9/campaign-builder">Start a campaign</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {drafts.map((d) => {
            const stepIdx = Math.max(0, (d.current_step || 1) - 1);
            const name = d.payload?.campaign_name || "Untitled draft";
            return (
              <Card key={d.id} className="hover:border-primary/40 transition-colors">
                <CardContent className="p-5 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium truncate">{name}</p>
                      <Badge variant="outline" className="text-[10px]">Step {stepIdx + 1} · {STEP_LABELS[stepIdx]}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Last updated {new Date(d.updated_at).toLocaleString()}
                    </p>
                  </div>
                  <Button asChild size="sm">
                    <Link to={`/admin/five9/campaign-builder/${d.id}`}>Resume</Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
