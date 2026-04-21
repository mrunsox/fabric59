import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";

type ExportRow = {
  id: string;
  feature_id: string;
  version: number;
  bundle_path: string;
  size_bytes: number | null;
  created_at: string;
  vault_features?: { name: string; slug: string };
};

export default function SourceExportsPage() {
  const [rows, setRows] = useState<ExportRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("vault_exports")
        .select("*, vault_features(name, slug)")
        .order("created_at", { ascending: false });
      setRows((data as any) ?? []);
      setLoading(false);
    })();
  }, []);

  const handleDownload = async (path: string) => {
    const { data, error } = await supabase.storage
      .from("vault-exports")
      .createSignedUrl(path, 60 * 5);
    if (error || !data) {
      toast.error("Could not generate download link");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Source Exports</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Downloadable bundles for archived features (frontend/, backend/, docs/, manifest.json).
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-sm text-muted-foreground">
            No exports yet. Generate one from a feature in the vault.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-3">Feature</th>
                  <th className="text-left px-4 py-3">Version</th>
                  <th className="text-left px-4 py-3">Size</th>
                  <th className="text-left px-4 py-3">Generated</th>
                  <th className="text-right px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{r.vault_features?.name}</div>
                      <div className="text-xs font-mono text-muted-foreground">{r.vault_features?.slug}</div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">v{r.version}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.size_bytes ? `${(r.size_bytes / 1024).toFixed(1)} KB` : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button size="sm" variant="outline" onClick={() => handleDownload(r.bundle_path)}>
                        <Download className="h-3.5 w-3.5 mr-1.5" /> Download
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
