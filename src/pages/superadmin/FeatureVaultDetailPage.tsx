import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ManifestViewer } from "@/components/vault/ManifestViewer";
import { ExportHistoryTable } from "@/components/vault/ExportHistoryTable";
import { TestingPlaybook } from "@/components/vault/TestingPlaybook";

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
      toast.success("Export bundle generated");
      await load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!feature) return <p className="text-sm text-muted-foreground">Feature not found.</p>;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm">
        <Link to="/superadmin/vault">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to vault
        </Link>
      </Button>

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">{feature.name}</h1>
            <Badge variant="secondary">{feature.status}</Badge>
          </div>
          <p className="text-muted-foreground text-sm mt-1">{feature.summary}</p>
          <p className="text-xs font-mono text-muted-foreground/70 mt-1">{feature.slug}</p>
        </div>
        <Button onClick={handleGenerate} disabled={generating}>
          {generating ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Generate export
        </Button>
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
