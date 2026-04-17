import { useState, useCallback } from "react";
import { Upload, Check, X, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type Step = "upload" | "map" | "preview" | "done";

interface Field {
  key: string;
  label: string;
  required?: boolean;
}

interface ImportWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  fields: Field[];
  onWrite: (rows: Record<string, string>[]) => Promise<{ inserted: number; failed: number }>;
}

function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  const split = (line: string): string[] => {
    const out: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQ) {
        if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
        else if (c === '"') { inQ = false; }
        else { cur += c; }
      } else {
        if (c === ",") { out.push(cur); cur = ""; }
        else if (c === '"') { inQ = true; }
        else { cur += c; }
      }
    }
    out.push(cur);
    return out;
  };
  return { headers: split(lines[0]), rows: lines.slice(1).map(split) };
}

export function ImportWizard({ open, onOpenChange, title, fields, onWrite }: ImportWizardProps) {
  const [step, setStep] = useState<Step>("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ inserted: number; failed: number } | null>(null);

  const reset = useCallback(() => {
    setStep("upload");
    setHeaders([]);
    setRows([]);
    setMapping({});
    setResult(null);
  }, []);

  const onFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const parsed = parseCsv(text);
      if (parsed.headers.length === 0) {
        toast.error("Empty or invalid CSV");
        return;
      }
      setHeaders(parsed.headers);
      setRows(parsed.rows);
      const auto: Record<string, string> = {};
      for (const f of fields) {
        const match = parsed.headers.find((h) => h.toLowerCase().trim() === f.key.toLowerCase() || h.toLowerCase().trim() === f.label.toLowerCase());
        if (match) auto[f.key] = match;
      }
      setMapping(auto);
      setStep("map");
    };
    reader.readAsText(file);
  };

  const buildPreviewRows = (): Record<string, string>[] =>
    rows.slice(0, 5).map((r) => {
      const obj: Record<string, string> = {};
      for (const f of fields) {
        const src = mapping[f.key];
        if (src) {
          const colIdx = headers.indexOf(src);
          obj[f.key] = colIdx >= 0 ? (r[colIdx] ?? "") : "";
        } else {
          obj[f.key] = "";
        }
      }
      return obj;
    });

  const buildAllRows = (): Record<string, string>[] =>
    rows.map((r) => {
      const obj: Record<string, string> = {};
      for (const f of fields) {
        const src = mapping[f.key];
        if (src) {
          const colIdx = headers.indexOf(src);
          obj[f.key] = colIdx >= 0 ? (r[colIdx] ?? "") : "";
        } else {
          obj[f.key] = "";
        }
      }
      return obj;
    });

  const handleWrite = async () => {
    const missingRequired = fields.filter((f) => f.required && !mapping[f.key]);
    if (missingRequired.length > 0) {
      toast.error(`Missing required field(s): ${missingRequired.map((f) => f.label).join(", ")}`);
      return;
    }
    setBusy(true);
    try {
      const r = await onWrite(buildAllRows());
      setResult(r);
      setStep("done");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Upload, map, preview, then write.</DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/20 p-10 cursor-pointer hover:border-primary/40 transition-colors">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">Click to upload a CSV</p>
            <p className="text-xs text-muted-foreground">First row should contain column headers</p>
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
            />
          </label>
        )}

        {step === "map" && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Match each Fabric59 field to a column from your CSV. Detected {rows.length} rows.
            </p>
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {fields.map((f) => (
                <div key={f.key} className="grid grid-cols-2 gap-3 items-center">
                  <div className="text-sm">
                    {f.label}
                    {f.required && <span className="text-destructive ml-1">*</span>}
                  </div>
                  <Select
                    value={mapping[f.key] || "__skip__"}
                    onValueChange={(v) =>
                      setMapping((m) => {
                        const next = { ...m };
                        if (v === "__skip__") delete next[f.key];
                        else next[f.key] = v;
                        return next;
                      })
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="-- skip --" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__skip__">-- skip --</SelectItem>
                      {headers.map((h) => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setStep("upload")}>Back</Button>
              <Button onClick={() => setStep("preview")}>Preview</Button>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">First 5 rows preview</p>
            <div className="border border-border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {fields.map((f) => <TableHead key={f.key} className="text-xs">{f.label}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {buildPreviewRows().map((r, i) => (
                    <TableRow key={i}>
                      {fields.map((f) => <TableCell key={f.key} className="text-xs">{r[f.key]}</TableCell>)}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setStep("map")}>Back</Button>
              <Button onClick={handleWrite} disabled={busy}>
                {busy ? "Writing..." : `Write ${rows.length} rows`}
              </Button>
            </div>
          </div>
        )}

        {step === "done" && result && (
          <div className="space-y-4 text-center py-4">
            <div className="mx-auto h-12 w-12 rounded-full bg-success/10 flex items-center justify-center">
              <Check className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-lg font-semibold">{result.inserted} inserted</p>
              {result.failed > 0 && (
                <p className="text-sm text-destructive">{result.failed} failed</p>
              )}
            </div>
            <Button onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
