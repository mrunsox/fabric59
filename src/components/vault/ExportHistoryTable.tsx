import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  exports: Array<{
    id: string;
    version: number;
    bundle_path: string;
    size_bytes: number | null;
    created_at: string;
  }>;
}

export function ExportHistoryTable({ exports }: Props) {
  if (exports.length === 0) {
    return <p className="text-sm text-muted-foreground">No exports generated yet.</p>;
  }

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
    <table className="w-full text-sm">
      <thead className="text-xs uppercase tracking-wider text-muted-foreground">
        <tr>
          <th className="text-left py-2">Version</th>
          <th className="text-left py-2">Size</th>
          <th className="text-left py-2">Generated</th>
          <th className="text-right py-2">Action</th>
        </tr>
      </thead>
      <tbody>
        {exports.map((e) => (
          <tr key={e.id} className="border-t border-border">
            <td className="py-2 text-muted-foreground">v{e.version}</td>
            <td className="py-2 text-muted-foreground">
              {e.size_bytes ? `${(e.size_bytes / 1024).toFixed(1)} KB` : "—"}
            </td>
            <td className="py-2 text-muted-foreground">
              {new Date(e.created_at).toLocaleString()}
            </td>
            <td className="py-2 text-right">
              <Button size="sm" variant="outline" onClick={() => handleDownload(e.bundle_path)}>
                <Download className="h-3.5 w-3.5 mr-1.5" /> Download
              </Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
