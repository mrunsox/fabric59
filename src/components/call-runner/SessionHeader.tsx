import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PhoneCall, Clock, Radio, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CallSessionMeta } from "@/types/call-runner";

interface Props {
  meta: CallSessionMeta;
  resumed: boolean;
  onReset: () => void;
}

export function SessionHeader({ meta, resumed, onReset }: Props) {
  const startedAt = new Date(meta.startedAt);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const elapsed = Math.max(0, Math.floor((now.getTime() - startedAt.getTime()) / 1000));
  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  return (
    <Card data-testid="runner-session-header">
      <CardContent className="py-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">{meta.workspaceName ?? "Workspace"}</span>
          <span className="text-xs text-muted-foreground">·</span>
          <span className="text-sm">{meta.campaignName ?? "Campaign"}</span>
        </div>
        <Badge variant="outline" className="font-mono text-xs gap-1">
          <PhoneCall className="h-3 w-3" /> ANI {meta.ani ?? "—"}
        </Badge>
        {meta.callId && (
          <Badge variant="outline" className="font-mono text-[10px]" title="Five9 call id">
            Call {meta.callId.slice(0, 8)}
          </Badge>
        )}
        <Badge variant="outline" className="font-mono text-xs gap-1" data-testid="runner-elapsed">
          <Clock className="h-3 w-3" /> {mm}:{ss}
        </Badge>
        {resumed && (
          <Badge variant="secondary" className="text-[10px]" data-testid="runner-resumed">
            Resumed
          </Badge>
        )}
        <span className="ml-auto text-[11px] uppercase tracking-wider text-muted-foreground">
          Started {startedAt.toLocaleTimeString()}
        </span>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-7 gap-1.5 text-xs"
          onClick={onReset}
          data-testid="runner-reset"
        >
          <RotateCcw className="h-3 w-3" /> Reset
        </Button>
      </CardContent>
    </Card>
  );
}
