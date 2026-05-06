import { useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw, Copy } from "lucide-react";
import { toast } from "sonner";
import type { FieldMapping } from "@/types/mapping";
import {
  buildSampleRecord,
  runMappingTest,
  type MappingTestReport,
} from "@/lib/mapping/runMappingTest";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  mappings: FieldMapping[];
  destinationLabel: string;
}

export function MappingTestDialog({ open, onOpenChange, mappings, destinationLabel }: Props) {
  const initialSample = useMemo(
    () => JSON.stringify(buildSampleRecord(mappings), null, 2),
    [mappings, open],
  );
  const [sampleText, setSampleText] = useState(initialSample);
  const [report, setReport] = useState<MappingTestReport | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const run = () => {
    setParseError(null);
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(sampleText);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Sample must be a JSON object");
      }
    } catch (e) {
      setParseError((e as Error).message);
      return;
    }
    setReport(runMappingTest(mappings, parsed));
  };

  const reset = () => {
    setSampleText(JSON.stringify(buildSampleRecord(mappings), null, 2));
    setReport(null);
    setParseError(null);
  };

  const copyPayload = () => {
    if (!report) return;
    navigator.clipboard.writeText(JSON.stringify(report.payload, null, 2));
    toast.success(`Copied ${destinationLabel} payload`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Test Mapping</DialogTitle>
          <DialogDescription>
            Apply current mappings + transforms to a sample Five9 record and preview the
            payload that would be sent to <span className="font-medium">{destinationLabel}</span>.
            Nothing is pushed to the destination.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 overflow-hidden">
          {/* Left: sample input */}
          <div className="flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm">Sample source record (JSON)</Label>
              <Button variant="ghost" size="sm" onClick={reset}>
                <RefreshCw className="h-3.5 w-3.5 mr-1" /> Regenerate
              </Button>
            </div>
            <Textarea
              value={sampleText}
              onChange={(e) => setSampleText(e.target.value)}
              className="font-mono text-xs flex-1 min-h-[260px] resize-none"
            />
            {parseError && (
              <p className="text-xs text-destructive mt-2">JSON error: {parseError}</p>
            )}
            <div className="flex justify-end mt-3">
              <Button onClick={run} disabled={mappings.length === 0}>
                Run test
              </Button>
            </div>
          </div>

          {/* Right: results */}
          <div className="flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm">Result</Label>
              {report && (
                <div className="flex items-center gap-2 text-xs">
                  <Badge variant="outline">{report.summary.total} mapped</Badge>
                  {report.summary.failed > 0 ? (
                    <Badge variant="destructive">{report.summary.failed} failed</Badge>
                  ) : (
                    <Badge className="bg-success/15 text-success border-success/30">
                      All passed
                    </Badge>
                  )}
                  {report.summary.warnings > 0 && (
                    <Badge variant="outline" className="border-warning/40 text-warning">
                      {report.summary.warnings} warnings
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {!report ? (
              <div className="flex-1 rounded-md border border-dashed border-border flex items-center justify-center text-sm text-muted-foreground">
                Run the test to see per-field results and the destination payload.
              </div>
            ) : (
              <ScrollArea className="flex-1 rounded-md border border-border">
                <div className="divide-y divide-border">
                  {report.rows.map((r) => (
                    <div key={r.id} className="p-3 text-xs space-y-1">
                      <div className="flex items-center gap-2">
                        {r.ok && r.warnings.length === 0 ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                        ) : !r.ok ? (
                          <XCircle className="h-3.5 w-3.5 text-destructive" />
                        ) : (
                          <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                        )}
                        <span className="font-medium">{r.source.label}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="font-medium">{r.target.label}</span>
                        <Badge variant="outline" className="ml-auto text-[10px]">
                          {r.transform}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pl-5 font-mono">
                        <div className="truncate text-muted-foreground">
                          in: {JSON.stringify(r.source.value)}
                        </div>
                        <div className="truncate">out: {JSON.stringify(r.output)}</div>
                      </div>
                      {r.error && <p className="pl-5 text-destructive">{r.error}</p>}
                      {r.warnings.map((w, i) => (
                        <p key={i} className="pl-5 text-warning">⚠ {w}</p>
                      ))}
                    </div>
                  ))}
                </div>
                <div className="p-3 border-t border-border bg-muted/40">
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs">Destination payload</Label>
                    <Button variant="ghost" size="sm" onClick={copyPayload}>
                      <Copy className="h-3 w-3 mr-1" /> Copy
                    </Button>
                  </div>
                  <pre className="text-[11px] font-mono whitespace-pre-wrap break-all">
                    {JSON.stringify(report.payload, null, 2)}
                  </pre>
                </div>
              </ScrollArea>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
