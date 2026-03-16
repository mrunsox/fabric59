import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { FileText, Clock, Phone, Send, CheckCircle2 } from "lucide-react";

interface PostCallSummaryProps {
  session?: {
    id: string;
    started_at: string;
    ended_at?: string | null;
    duration_seconds?: number | null;
    disposition?: string | null;
    post_call_status?: string | null;
    variables?: Record<string, unknown> | null;
  } | null;
  notes?: string[];
  className?: string;
}

export function PostCallSummary({ session, notes = [], className }: PostCallSummaryProps) {
  if (!session) {
    return (
      <Card className={className}>
        <CardContent className="py-12 text-center text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No completed session to summarize.</p>
        </CardContent>
      </Card>
    );
  }

  const duration = session.duration_seconds
    ? `${Math.floor(session.duration_seconds / 60)}:${(session.duration_seconds % 60).toString().padStart(2, "0")}`
    : "—";

  const startTime = new Date(session.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const endTime = session.ended_at
    ? new Date(session.ended_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "—";

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" /> Post-Call Summary
          <Badge variant={session.post_call_status === "completed" ? "default" : "secondary"} className="ml-auto">
            {session.post_call_status || "pending"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <Clock className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-lg font-mono font-bold">{duration}</p>
            <p className="text-xs text-muted-foreground">Duration</p>
          </div>
          <div className="text-center">
            <Phone className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-sm font-medium">{startTime} – {endTime}</p>
            <p className="text-xs text-muted-foreground">Time</p>
          </div>
          <div className="text-center">
            <CheckCircle2 className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
            <p className="text-sm font-medium">{session.disposition || "None"}</p>
            <p className="text-xs text-muted-foreground">Disposition</p>
          </div>
        </div>

        {notes.length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-2">Notes</h4>
              <ul className="space-y-1">
                {notes.map((note, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-muted-foreground/50">•</span>
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {session.variables && Object.keys(session.variables).length > 0 && (
          <>
            <Separator />
            <div>
              <h4 className="text-sm font-medium mb-2">Captured Data</h4>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(session.variables).slice(0, 6).map(([key, val]) => (
                  <div key={key} className="rounded border border-border px-2 py-1">
                    <p className="text-[10px] text-muted-foreground uppercase">{key}</p>
                    <p className="text-sm font-medium truncate">{String(val)}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="flex gap-2 pt-2">
          <Button size="sm" variant="outline" className="flex-1">
            <Send className="h-3 w-3 mr-1" /> Email Summary
          </Button>
          <Button size="sm" variant="outline" className="flex-1">
            <Send className="h-3 w-3 mr-1" /> SMS Summary
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
