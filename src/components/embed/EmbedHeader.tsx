/**
 * Compact header for the embed runner. Shows workspace · campaign · call
 * signal. No nav, no shell chrome.
 */
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Headphones, Clock } from "lucide-react";
import type { EmbedRuntimeContext } from "@/lib/campaign-publish/types";

interface Props {
  workspaceName: string;
  campaignName: string;
  ctx: EmbedRuntimeContext;
  startedAt: string;
}

function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function EmbedHeader({ workspaceName, campaignName, ctx, startedAt }: Props) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  const elapsed = formatElapsed(now - new Date(startedAt).getTime());
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
      <div className="flex items-center gap-2 min-w-0">
        <Headphones className="h-4 w-4 text-primary flex-shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <p className="font-semibold truncate" data-testid="embed-campaign-name">
            {campaignName}
          </p>
          <p className="text-xs text-muted-foreground truncate">{workspaceName}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-wrap justify-end">
        {ctx.agentName && (
          <Badge variant="outline" data-testid="embed-agent-name">
            {ctx.agentName}
          </Badge>
        )}
        {ctx.ani && (
          <Badge variant="secondary" data-testid="embed-ani">
            ANI {ctx.ani}
          </Badge>
        )}
        <Badge variant="outline" className="font-mono" data-testid="embed-elapsed">
          <Clock className="h-3 w-3 mr-1" /> {elapsed}
        </Badge>
      </div>
    </div>
  );
}
