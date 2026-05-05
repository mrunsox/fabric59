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
    return (
      <p className="text-sm text-muted-foreground">
        No exports generated yet. Click <span className="font-medium">Generate export</span> above to create the first bundle.
      </p>
    );
  }

  const handleDownload = async (path: string, version: number) => {
    const { data, error } = await supabase.storage
      .from("vault-exports")
      .createSignedUrl(path, 60 * 5, {
        download: true, // ask Supabase to set Content-Disposition: attachment
      } as any);
    if (error || !data) {
      toast.error("Could not generate download link");
      return;
    }
    // Use a hidden anchor with `download` so most browsers save the file
    // instead of navigating the current/new tab to raw JSON. Falls back to
    // window.open if the browser blocks the click.
    try {
      const a = document.createElement("a");
      a.href = data.signedUrl;
      a.download = `${path.split("/").pop() || `vault-export-v${version}.json`}`;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="overflow-x-auto">
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
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownload(e.bundle_path, e.version)}
                >
                  <Download className="h-3.5 w-3.5 mr-1.5" /> Download
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
