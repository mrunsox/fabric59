import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Archive, Download, FileText, Package } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function SuperadminOverviewPage() {
  const [stats, setStats] = useState({ total: 0, archived: 0, core: 0, extracted: 0, exports: 0 });
  const [latest, setLatest] = useState<{ created_at: string; feature_id: string } | null>(null);

  useEffect(() => {
    (async () => {
      const { data: features } = await supabase.from("vault_features").select("status");
      const { data: exports } = await supabase
        .from("vault_exports")
        .select("created_at, feature_id")
        .order("created_at", { ascending: false })
        .limit(1);

      if (features) {
        setStats({
          total: features.length,
          archived: features.filter((f) => f.status === "archived").length,
          core: features.filter((f) => f.status === "core").length,
          extracted: features.filter((f) => f.status === "extracted").length,
          exports: exports?.length ?? 0,
        });
      }
      if (exports?.[0]) setLatest(exports[0] as any);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Superadmin Overview</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Internal preservation and extraction system for non-core modules.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total features", value: stats.total, icon: Package },
          { label: "Archived", value: stats.archived, icon: Archive },
          { label: "Extracted", value: stats.extracted, icon: FileText },
          { label: "Exports generated", value: stats.exports, icon: Download },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</p>
                    <p className="text-2xl font-bold text-foreground mt-1">{s.value}</p>
                  </div>
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/superadmin/vault">Open Feature Vault</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/superadmin/exports">View source exports</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to="/superadmin/routes">Browse advanced routes</Link>
          </Button>
        </CardContent>
      </Card>

      {latest && (
        <p className="text-xs text-muted-foreground">
          Latest export: {new Date(latest.created_at).toLocaleString()}
        </p>
      )}
    </div>
  );
}
