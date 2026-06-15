/**
 * ExternalResourcesPanel — contextual resource list for both the canonical
 * runner and the published embed runner.
 *
 * Renders ranked buckets with rationale chips, an `auto_open_if_safe` banner
 * (non-disruptive — the agent confirms), first-class booking actions for
 * `calendar` resources, and a launcher that handles iframe vs. new-tab
 * fallback. Resource events are bubbled up to the parent for session tracking.
 */
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileText,
  Globe,
  Layers,
  MailCheck,
  Send,
  Sparkles,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { resolveLaunchMode } from "@/lib/external-resources/resolveLaunchMode";
import { BUCKET_LABEL, KIND_LABEL, OPEN_MODE_LABEL, displayHost } from "@/lib/external-resources/reasons";
import type {
  EvaluatedResource,
  ExternalResource,
  ResourceEvaluationContext,
  ResourceEvaluationResult,
  ResourceEvent,
  ResourceEventKind,
  ResourceKind,
} from "@/lib/external-resources/types";
import { ResourceLauncher, openInNewTab } from "./ResourceLauncher";

interface Props {
  result: ResourceEvaluationResult | null;
  context: ResourceEvaluationContext;
  /** Bubble event for session tracking. */
  onEvent?: (event: ResourceEvent) => void;
  /** Insert into runner notes. */
  onAppendToNotes?: (text: string) => void;
  /** Optional surfaced-callback (parent typically wires this to recordEvent). */
  onSurfaced?: (resources: EvaluatedResource[]) => void;
  emptyHint?: string;
  compact?: boolean;
}

const KIND_ICON: Record<ResourceKind, typeof Globe> = {
  calendar: Calendar,
  website: Globe,
  document: FileText,
  form: BookOpen,
  portal: Layers,
  custom: Sparkles,
};

export function ExternalResourcesPanel({
  result,
  context,
  onEvent,
  onAppendToNotes,
  onSurfaced,
  emptyHint = "No resources configured for this campaign yet.",
  compact = false,
}: Props) {
  const [launchTarget, setLaunchTarget] = useState<ExternalResource | null>(null);
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [autoOpenAcked, setAutoOpenAcked] = useState<string | null>(null);

  // Fire `surfaced` once when the recommended/available list changes.
  useEffect(() => {
    if (!result || !onSurfaced) return;
    onSurfaced([...result.recommended, ...result.available]);
  }, [result, onSurfaced]);

  const launch = (resource: ExternalResource) => {
    setLaunchTarget(resource);
    setLauncherOpen(true);
  };

  const fireEvent = (
    kind: ResourceEventKind,
    resource: ExternalResource,
    detail?: string,
    launchMode?: ResourceEvent["launchMode"],
  ) => {
    if (!onEvent) return;
    onEvent({
      at: new Date().toISOString(),
      kind,
      resourceId: resource.id,
      resourceLabel: resource.label,
      resourceKind: resource.kind,
      launchMode,
      detail,
      context: {
        stepId: context.stepId ?? null,
        issueType: context.issueType ?? null,
        urgency: context.urgency ?? null,
        branch: context.branch ?? null,
        disposition: context.disposition ?? null,
        embedMode: context.embedMode ?? null,
      },
    });
  };

  if (!result) {
    return (
      <Card data-testid="external-resources-empty">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Resources
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">{emptyHint}</CardContent>
      </Card>
    );
  }

  const totalShown = result.recommended.length + result.available.length;
  const autoCandidate = result.autoOpenCandidate;
  const showAutoBanner = !!autoCandidate && autoOpenAcked !== autoCandidate.resource.id;

  return (
    <>
      <Card data-testid="external-resources-panel">
        <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2 space-y-0">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> Resources
            <Badge variant="outline" className="h-4 px-1 text-[10px]">
              {totalShown}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {showAutoBanner && autoCandidate && (
            <div
              className="rounded-md border border-primary/40 bg-primary/5 p-2 flex items-start gap-2"
              data-testid="auto-open-banner"
            >
              <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-xs">
                  <span className="font-medium">{autoCandidate.resource.label}</span> is recommended for this step.
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    className="h-7 px-2 text-xs"
                    onClick={() => {
                      setAutoOpenAcked(autoCandidate.resource.id);
                      launch(autoCandidate.resource);
                    }}
                  >
                    Open now
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs"
                    onClick={() => {
                      setAutoOpenAcked(autoCandidate.resource.id);
                      fireEvent("dismissed", autoCandidate.resource, "auto-open dismissed");
                    }}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </div>
          )}

          {totalShown === 0 && (
            <p className="text-xs text-muted-foreground" data-testid="no-resources">
              No resources match the current context.
            </p>
          )}

          <ScrollArea className={compact ? "max-h-[260px]" : "max-h-[480px]"}>
            <div className="space-y-3 pr-2">
              <Bucket
                bucket="recommended"
                items={result.recommended}
                context={context}
                onLaunch={launch}
                onEvent={fireEvent}
                onAppendToNotes={onAppendToNotes}
              />
              <Bucket
                bucket="available"
                items={result.available}
                context={context}
                onLaunch={launch}
                onEvent={fireEvent}
                onAppendToNotes={onAppendToNotes}
              />
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <ResourceLauncher
        resource={launchTarget}
        context={context}
        open={launcherOpen}
        onOpenChange={(o) => {
          if (!o && launchTarget) fireEvent("dismissed", launchTarget, "launcher closed");
          setLauncherOpen(o);
        }}
        onEvent={(kind, resolution, detail) => {
          if (launchTarget) fireEvent(kind, launchTarget, detail, resolution.mode);
        }}
      />
    </>
  );
}

function Bucket({
  bucket,
  items,
  context,
  onLaunch,
  onEvent,
  onAppendToNotes,
}: {
  bucket: EvaluatedResource["bucket"];
  items: EvaluatedResource[];
  context: ResourceEvaluationContext;
  onLaunch: (r: ExternalResource) => void;
  onEvent: (
    kind: ResourceEventKind,
    r: ExternalResource,
    detail?: string,
    mode?: ResourceEvent["launchMode"],
  ) => void;
  onAppendToNotes?: (text: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <section data-testid={`resource-bucket-${bucket}`}>
      <header className="flex items-center gap-2 mb-1.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {BUCKET_LABEL[bucket]}
        </h3>
        <Badge variant="outline" className="h-4 px-1 text-[10px]">
          {items.length}
        </Badge>
      </header>
      <div className="space-y-1.5">
        {items.map((it) => (
          <ResourceCard
            key={it.resource.id}
            evaluated={it}
            context={context}
            onLaunch={onLaunch}
            onEvent={onEvent}
            onAppendToNotes={onAppendToNotes}
          />
        ))}
      </div>
    </section>
  );
}

function ResourceCard({
  evaluated,
  context,
  onLaunch,
  onEvent,
  onAppendToNotes,
}: {
  evaluated: EvaluatedResource;
  context: ResourceEvaluationContext;
  onLaunch: (r: ExternalResource) => void;
  onEvent: (
    kind: ResourceEventKind,
    r: ExternalResource,
    detail?: string,
    mode?: ResourceEvent["launchMode"],
  ) => void;
  onAppendToNotes?: (text: string) => void;
}) {
  const r = evaluated.resource;
  const Icon = KIND_ICON[r.kind];
  const resolution = useMemo(() => resolveLaunchMode({ resource: r, context }), [r, context]);
  const isBooking = r.kind === "calendar";

  const copy = () => {
    navigator.clipboard?.writeText(resolution.resolvedUrl).then(
      () => {
        toast.success("URL copied");
        onEvent("copied", r);
      },
      () => toast.error("Copy failed"),
    );
  };

  const insertNote = () => {
    if (!onAppendToNotes) return;
    const note =
      r.notesTemplate?.trim() ||
      `${KIND_LABEL[r.kind]}: ${r.label} — ${resolution.resolvedUrl}`;
    onAppendToNotes(note);
    onEvent("notes_inserted", r);
  };

  const openExt = () => {
    openInNewTab(resolution.resolvedUrl);
    onEvent("opened_new_tab", r, "direct new-tab launch", "new_tab");
  };

  return (
    <article
      className="border rounded-md p-2 bg-card hover:bg-accent/30 transition-colors"
      data-resource-id={r.id}
      data-bucket={evaluated.bucket}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Icon className="h-3.5 w-3.5 text-primary flex-shrink-0" aria-hidden />
            <p className="text-sm font-medium truncate">{r.label}</p>
            <Badge variant="secondary" className="h-4 px-1 text-[10px]">
              {KIND_LABEL[r.kind]}
            </Badge>
            <Badge variant="outline" className="h-4 px-1 text-[10px]">
              {OPEN_MODE_LABEL[resolution.mode]}
            </Badge>
            {resolution.downgraded && (
              <Badge variant="outline" className="h-4 px-1 text-[10px] border-amber-300/60">
                downgraded
              </Badge>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground truncate font-mono">
            {displayHost(resolution.resolvedUrl)}
          </p>
          {r.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{r.description}</p>
          )}
          {evaluated.reasons.length > 0 && (
            <ul className="mt-1.5 flex flex-wrap gap-1">
              {evaluated.reasons.slice(0, 4).map((reason, i) => (
                <li key={i}>
                  <Badge variant="outline" className="h-4 px-1 text-[10px] font-normal">
                    {reason}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className={cn("mt-2 flex flex-wrap gap-1.5", isBooking && "border-t pt-2")}>
        <Button size="sm" className="h-7 px-2 text-xs" onClick={() => onLaunch(r)}>
          <ExternalLink className="h-3 w-3 mr-1" /> Open
        </Button>
        <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={openExt}>
          New tab
        </Button>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={copy}>
          <Copy className="h-3 w-3 mr-1" /> Copy URL
        </Button>
        {onAppendToNotes && (
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={insertNote}>
            <FileText className="h-3 w-3 mr-1" /> Insert note
          </Button>
        )}
      </div>

      {isBooking && (
        <BookingActions
          resource={r}
          resolutionMode={resolution.mode}
          onAppendToNotes={onAppendToNotes}
          onEvent={(kind, detail) => onEvent(kind, r, detail, resolution.mode)}
        />
      )}
    </article>
  );
}

function BookingActions({
  resource,
  resolutionMode,
  onAppendToNotes,
  onEvent,
}: {
  resource: ExternalResource;
  resolutionMode: ResourceEvent["launchMode"];
  onAppendToNotes?: (text: string) => void;
  onEvent: (kind: ResourceEventKind, detail?: string) => void;
}) {
  return (
    <div
      className="mt-2 pt-2 border-t flex flex-wrap items-center gap-1.5"
      data-testid="booking-actions"
      data-resource-id={resource.id}
    >
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Booking</span>
      <Button
        size="sm"
        variant="outline"
        className="h-6 px-1.5 text-[11px]"
        onClick={() => onEvent("booking_opened", "agent marked booking opened")}
      >
        <Calendar className="h-3 w-3 mr-1" /> Mark opened
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-6 px-1.5 text-[11px]"
        onClick={() => {
          onEvent("booking_completed", "agent confirmed appointment booked");
          onAppendToNotes?.(`Appointment booked via ${resource.label}.`);
        }}
      >
        <CheckCircle2 className="h-3 w-3 mr-1" /> Mark booked
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-6 px-1.5 text-[11px]"
        onClick={() => {
          onEvent("booking_link_sent", "agent sent booking link to caller");
          onAppendToNotes?.(`Sent booking link to caller (${resource.label}).`);
        }}
      >
        <Send className="h-3 w-3 mr-1" /> Send link
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-6 px-1.5 text-[11px]"
        onClick={() => onEvent("booking_unable", "agent unable to complete booking")}
      >
        <XCircle className="h-3 w-3 mr-1" /> Unable
      </Button>
      <Badge variant="outline" className="h-4 px-1 text-[10px] font-normal">
        <MailCheck className="h-2.5 w-2.5 mr-0.5" /> {resolutionMode}
      </Badge>
    </div>
  );
}
