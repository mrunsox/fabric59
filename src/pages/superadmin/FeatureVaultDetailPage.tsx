import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { ManifestViewer } from "@/components/vault/ManifestViewer";
import { ExportHistoryTable } from "@/components/vault/ExportHistoryTable";
import { TestingPlaybook } from "@/components/vault/TestingPlaybook";

const statusColor: Record<string, string> = {
  core: "bg-primary/10 text-primary border-primary/30",
  archived: "bg-muted text-muted-foreground border-border",
  experimental: "bg-warning/10 text-warning border-warning/30",
  deprecated: "bg-destructive/10 text-destructive border-destructive/30",
  extracted: "bg-success/10 text-success border-success/30",
};

/**
 * For experimental / active features, a deep link to the live product page so
 * the dev team can jump from the vault detail straight into the live feature.
 * Keys are vault_features.slug values.
 */
const LIVE_LINKS: Record<string, { label: string; href: string }> = {
  "legal-connect": { label: "Open Legal Connect", href: "/admin/legal-connect" },
  "five9-domain-management": { label: "Open Five9 Domains", href: "/admin/domains" },
};

export default function FeatureVaultDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [feature, setFeature] = useState<any>(null);
  const [exports, setExports] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!id) return;
    const { data: f } = await supabase.from("vault_features").select("*").eq("id", id).maybeSingle();
    const { data: ex } = await supabase
      .from("vault_exports")
      .select("*")
      .eq("feature_id", id)
      .order("created_at", { ascending: false });
    setFeature(f);
    setExports(ex ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleGenerate = async () => {
    if (!id) return;
    setGenerating(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/vault-export`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.session?.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ feature_id: id }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Export failed");
      toast.success("Export bundle generated. Use the Download link in Export history below.");
      await load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!feature) return <p className="text-sm text-muted-foreground">Feature not found.</p>;

  const liveLink = feature.slug ? LIVE_LINKS[feature.slug] : undefined;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link to="/superadmin/vault">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to vault
        </Link>
      </Button>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground">{feature.name}</h1>
            <Badge variant="outline" className={statusColor[feature.status] ?? ""}>
              {feature.status}
            </Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">{feature.summary}</p>
          <p className="text-xs font-mono text-muted-foreground/70 mt-1">{feature.slug}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {liveLink && (
            <Button asChild variant="outline">
              <Link to={liveLink.href}>
                <ExternalLink className="h-4 w-4 mr-2" />
                {liveLink.label}
              </Link>
            </Button>
          )}
          <Button onClick={handleGenerate} disabled={generating}>
            {generating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Generate export
          </Button>
        </div>
      </div>

      <TestingPlaybook slug={feature.slug} />

      <ManifestViewer feature={feature} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Export history</CardTitle>
        </CardHeader>
        <CardContent>
          <ExportHistoryTable exports={exports} />
        </CardContent>
      </Card>
    </div>
  );
}
