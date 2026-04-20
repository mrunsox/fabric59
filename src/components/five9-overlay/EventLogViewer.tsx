import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Eye, RotateCw } from "lucide-react";
import { useFive9EventLog } from "@/hooks/useFive9Overlay";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Props { clientId?: string; }

const statusVariant: Record<string, string> = {
  processed: "bg-success/15 text-success border-success/30",
  pending: "bg-warning/15 text-warning border-warning/30",
  failed: "bg-destructive/15 text-destructive border-destructive/30",
  unresolved: "bg-muted text-muted-foreground border-border",
};

export default function EventLogViewer({ clientId }: Props) {
  const { data: events, isLoading, refetch } = useFive9EventLog({ client_id: clientId, limit: 100 });
  const [selected, setSelected] = useState<any | null>(null);
  const [replaying, setReplaying] = useState<string | null>(null);

  const replay = async (row: any) => {
    setReplaying(row.id);
    try {
      const { data, error } = await supabase.functions.invoke("five9-overlay-test", {
        body: { ...(row.raw_payload || {}), _replay_of: row.id, _correlation_parent: row.correlation_id },
      });
      if (error) throw error;
      toast.success(`Replayed: ${data?.steps?.length ?? 0} step(s)`);
      refetch();
    } catch (e: any) {
      toast.error(`Replay failed: ${e.message}`);
    } finally {
      setReplaying(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4" /> Event Log</CardTitle>
          <CardDescription>Raw and normalized Five9 events with replay support.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground py-6 text-center">Loading…</div>
          ) : !events?.length ? (
            <div className="text-sm text-muted-foreground py-6 text-center">No events yet.</div>
          ) : (
            <div className="border border-border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">When</TableHead>
                    <TableHead className="text-xs">Event</TableHead>
                    <TableHead className="text-xs">Provider</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Correlation</TableHead>
                    <TableHead className="text-xs w-24"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((e: any) => (
                    <TableRow key={e.id}>
                      <TableCell className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}</TableCell>
                      <TableCell className="text-xs font-mono">{e.event_type}</TableCell>
                      <TableCell className="text-xs capitalize">{e.resolved_provider ?? "—"}</TableCell>
                      <TableCell><Badge variant="outline" className={`text-xs ${statusVariant[e.status] ?? "bg-muted"}`}>{e.status}</Badge></TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground truncate max-w-[120px]">{e.correlation_id?.slice(0, 8)}</TableCell>
                      <TableCell className="space-x-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setSelected(e)}><Eye className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => replay(e)} disabled={replaying === e.id}><RotateCw className={`h-3.5 w-3.5 ${replaying === e.id ? "animate-spin" : ""}`} /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader><DialogTitle className="text-base">Event Detail</DialogTitle></DialogHeader>
          {selected && (
            <Tabs defaultValue="normalized">
              <TabsList>
                <TabsTrigger value="normalized" className="text-xs">Normalized</TabsTrigger>
                <TabsTrigger value="raw" className="text-xs">Raw</TabsTrigger>
                <TabsTrigger value="actions" className="text-xs">Actions</TabsTrigger>
              </TabsList>
              <TabsContent value="normalized">
                <ScrollArea className="h-[400px] rounded-md border border-border bg-muted/30 p-3">
                  <pre className="text-xs font-mono whitespace-pre-wrap">{JSON.stringify(selected.normalized_payload, null, 2)}</pre>
                </ScrollArea>
              </TabsContent>
              <TabsContent value="raw">
                <ScrollArea className="h-[400px] rounded-md border border-border bg-muted/30 p-3">
                  <pre className="text-xs font-mono whitespace-pre-wrap">{JSON.stringify(selected.raw_payload, null, 2)}</pre>
                </ScrollArea>
              </TabsContent>
              <TabsContent value="actions">
                <ScrollArea className="h-[400px] rounded-md border border-border bg-muted/30 p-3">
                  <pre className="text-xs font-mono whitespace-pre-wrap">{JSON.stringify(selected.mapped_actions, null, 2)}</pre>
                  {selected.error && <p className="text-destructive text-xs mt-3">Error: {selected.error}</p>}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
