import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RotateCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  eventId: string | null;
}

export default function EventReplayDialog({ open, onOpenChange, eventId }: Props) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);

  const replay = async () => {
    if (!eventId) return;
    setRunning(true);
    setResult(null);
    try {
      const { data: row, error: fetchErr } = await supabase
        .from("legal_connect_event_log")
        .select("*")
        .eq("id", eventId)
        .single();
      if (fetchErr) throw fetchErr;

      const { data, error } = await supabase.functions.invoke("legal-connect-jobs", {
        body: { action: "replay_event", event_id: eventId, raw_payload: row.raw_payload },
      });
      if (error) throw error;
      setResult(data);
      toast.success("Event replayed");
    } catch (e: any) {
      setResult({ error: e.message });
      toast.error(`Replay failed: ${e.message}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2"><RotateCw className="h-4 w-4" /> Replay Event</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Replays this event through the sync pipeline with a fresh correlation ID. Idempotent and audit-logged.
          </p>
          {result && (
            <ScrollArea className="h-[260px] rounded-md border border-border bg-muted/30 p-3">
              <pre className="text-xs font-mono whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
            </ScrollArea>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={replay} disabled={running || !eventId}>
            {running ? "Replaying…" : "Replay Event"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
