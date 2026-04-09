import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, User, FileText, Phone, RefreshCw } from "lucide-react";
import { useExecutePrompt } from "@/hooks/useLegalConnect";

interface AgentContextPanelProps {
  clientId?: string;
  callerPhone?: string;
  contact?: Record<string, unknown>;
  matter?: Record<string, unknown>;
  recentEvents?: unknown[];
}

export default function AgentContextPanel({
  clientId,
  callerPhone,
  contact,
  matter,
  recentEvents,
}: AgentContextPanelProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const executePrompt = useExecutePrompt();

  const handleGenerateSummary = () => {
    executePrompt.mutate(
      {
        prompt_key: "call_context_summary",
        context: { caller_phone: callerPhone, contact, matter, recent_events: recentEvents },
        client_id: clientId,
      },
      { onSuccess: (data) => setSummary(data?.data?.content ?? null) }
    );
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Agent Context
          </CardTitle>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 text-xs"
            onClick={handleGenerateSummary}
            disabled={executePrompt.isPending}
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${executePrompt.isPending ? "animate-spin" : ""}`} />
            {executePrompt.isPending ? "Loading..." : "Refresh"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-3 space-y-2">
        {/* Quick facts */}
        <div className="flex flex-wrap gap-2">
          {callerPhone && (
            <Badge variant="outline" className="text-[10px] gap-1">
              <Phone className="h-2.5 w-2.5" /> {callerPhone}
            </Badge>
          )}
          {contact && (
            <Badge variant="outline" className="text-[10px] gap-1 bg-success/10 border-success/30 text-success">
              <User className="h-2.5 w-2.5" /> Known Contact
            </Badge>
          )}
          {matter && (
            <Badge variant="outline" className="text-[10px] gap-1 bg-primary/10 border-primary/30 text-primary">
              <FileText className="h-2.5 w-2.5" /> Active Case
            </Badge>
          )}
          {!contact && !matter && (
            <Badge variant="outline" className="text-[10px] gap-1 bg-warning/10 border-warning/30 text-warning">
              New Caller
            </Badge>
          )}
        </div>

        {/* AI Summary */}
        {executePrompt.isPending ? (
          <div className="space-y-1">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ) : summary ? (
          <p className="text-xs text-foreground leading-relaxed">{summary}</p>
        ) : (
          <p className="text-xs text-muted-foreground">Click Refresh to generate a call context summary</p>
        )}
      </CardContent>
    </Card>
  );
}
