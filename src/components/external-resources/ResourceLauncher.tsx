/**
 * ResourceLauncher — owns the actual open-behavior for an external resource.
 *
 * Supports four concrete launch modes (after resolveLaunchMode runs):
 *   - iframe      : inline panel inside a Dialog with blocked-load fallback
 *   - drawer      : right-side Sheet with same iframe + fallback contract
 *   - replace_center : not honored in embed surfaces (see resolveLaunchMode)
 *   - new_tab     : programmatic `window.open(url, "_blank", "noopener,noreferrer")`
 *
 * Blocked-iframe strategy is best-effort UX, not authoritative security
 * detection: we start a load-watchdog and surface a clear fallback panel that
 * always offers "Open in new tab". The actual load outcome is the source of
 * truth — see docs/external-resource-workspace-architecture.md §G.
 *
 * All new-tab launches (programmatic OR anchor-based) MUST use
 * `noopener,noreferrer` semantics.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, ExternalLink, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveLaunchMode } from "@/lib/external-resources/resolveLaunchMode";
import { displayHost } from "@/lib/external-resources/reasons";
import type {
  ExternalResource,
  LaunchResolution,
  ResourceEvaluationContext,
  ResourceEventKind,
} from "@/lib/external-resources/types";

const IFRAME_LOAD_TIMEOUT_MS = 4000;

interface Props {
  resource: ExternalResource | null;
  context: ResourceEvaluationContext;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fired for each meaningful lifecycle event for session tracking. */
  onEvent?: (kind: ResourceEventKind, resolution: LaunchResolution, detail?: string) => void;
}

/** Safe programmatic new-tab open. Always uses noopener,noreferrer. */
export function openInNewTab(url: string): void {
  try {
    const w = window.open(url, "_blank", "noopener,noreferrer");
    // Defensive: some browsers ignore the third arg — re-null opener.
    if (w) w.opener = null;
  } catch {
    /* swallow — caller will see the resource never marked opened */
  }
}

export function ResourceLauncher({ resource, context, open, onOpenChange, onEvent }: Props) {
  const resolution = useMemo<LaunchResolution | null>(() => {
    if (!resource) return null;
    return resolveLaunchMode({ resource, context });
  }, [resource, context]);

  // For new_tab mode, fire-and-close once on each open.
  useEffect(() => {
    if (!open || !resource || !resolution) return;
    if (resolution.mode === "new_tab") {
      openInNewTab(resolution.resolvedUrl);
      onEvent?.("opened_new_tab", resolution);
      onOpenChange(false);
    } else {
      onEvent?.("opened", resolution);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, resource?.id]);

  if (!resource || !resolution) return null;
  if (resolution.mode === "new_tab") return null;

  const widthClass = WIDTH_CLASS[resolution.width];

  if (resolution.mode === "drawer") {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className={cn("p-0 flex flex-col", widthClass)}>
          <SheetHeader className="p-3 border-b">
            <SheetTitle className="text-sm font-semibold flex items-center gap-2">
              {resource.label}
              <Badge variant="outline" className="text-[10px] font-normal">
                {displayHost(resolution.resolvedUrl)}
              </Badge>
            </SheetTitle>
          </SheetHeader>
          <IframeBody
            resource={resource}
            resolution={resolution}
            onEvent={onEvent}
            onClose={() => onOpenChange(false)}
          />
        </SheetContent>
      </Sheet>
    );
  }

  // iframe (default) and replace_center share the dialog presentation; the
  // resolver downgrades replace_center → drawer in embed mode already.
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn("p-0 flex flex-col max-h-[90dvh]", widthClass)}
        data-testid="resource-launcher-dialog"
      >
        <DialogHeader className="p-3 border-b">
          <DialogTitle className="text-sm font-semibold flex items-center gap-2">
            {resource.label}
            <Badge variant="outline" className="text-[10px] font-normal">
              {displayHost(resolution.resolvedUrl)}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        <IframeBody
          resource={resource}
          resolution={resolution}
          onEvent={onEvent}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

const WIDTH_CLASS: Record<LaunchResolution["width"], string> = {
  sm: "sm:max-w-md w-full",
  md: "sm:max-w-2xl w-full",
  lg: "sm:max-w-4xl w-full",
  full: "sm:max-w-[96vw] w-full",
};

function IframeBody({
  resource,
  resolution,
  onEvent,
  onClose,
}: {
  resource: ExternalResource;
  resolution: LaunchResolution;
  onEvent?: Props["onEvent"];
  onClose: () => void;
}) {
  const [state, setState] = useState<"loading" | "loaded" | "blocked">("loading");
  const [attempt, setAttempt] = useState(0);
  const timeoutRef = useRef<number | null>(null);

  // Best-effort load-watchdog. NOT authoritative — onLoad on an X-Frame-Options
  // / frame-ancestors blocked frame may or may not fire. We rely on the user
  // having a clear fallback in either case.
  useEffect(() => {
    setState("loading");
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      setState((s) => (s === "loading" ? "blocked" : s));
    }, IFRAME_LOAD_TIMEOUT_MS);
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [attempt]);

  const onLoad = () => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    setState("loaded");
    onEvent?.("embedded_loaded", resolution);
  };

  const retry = () => {
    setAttempt((n) => n + 1);
  };

  const openExternally = () => {
    openInNewTab(resolution.resolvedUrl);
    onEvent?.("opened_new_tab", resolution, "fallback from blocked embed");
    onClose();
  };

  if (state === "blocked") {
    // Fire-and-forget blocked event once per blocked state transition.
    // (Effect-less so it logs every recompute is acceptable; the trail cap
    // bounds growth in practice.)
    onEvent?.("embedded_blocked", resolution, "iframe load watchdog timeout");
    return (
      <div className="p-4" data-testid="resource-launcher-blocked">
        <Alert variant="destructive" className="border-amber-300/60 text-foreground">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>This site can't be embedded</AlertTitle>
          <AlertDescription className="space-y-3">
            <p className="text-xs">
              <span className="font-medium">{resource.label}</span> ({displayHost(resolution.resolvedUrl)}) did not load
              within {Math.round(IFRAME_LOAD_TIMEOUT_MS / 1000)}s. Many sites block inline embedding for security; opening in a new tab is
              the supported fallback.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={openExternally} data-testid="resource-open-newtab">
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Open in new tab
              </Button>
              <Button size="sm" variant="outline" onClick={retry}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry inline
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <iframe
        key={attempt}
        src={resolution.resolvedUrl}
        title={resource.label}
        className="flex-1 min-h-[60dvh] w-full border-0 bg-background"
        // Conservative sandbox. Calendars/forms commonly need scripts + forms;
        // popups must be allowed so booking-page CTAs still work.
        sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-same-origin"
        referrerPolicy="no-referrer"
        allow="clipboard-write"
        onLoad={onLoad}
        data-testid="resource-launcher-iframe"
      />
      {state === "loading" && (
        <p className="text-[11px] text-muted-foreground p-2 border-t" data-testid="resource-launcher-loading">
          Loading {displayHost(resolution.resolvedUrl)}…
        </p>
      )}
    </div>
  );
}
