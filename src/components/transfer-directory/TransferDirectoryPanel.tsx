/**
 * Transfer directory panel — used in both the internal call runner and the
 * published embed runner. Renders ranked buckets with rationale chips,
 * "single allowed" banner, and instructions-only state.
 */
import { useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Phone, Copy, FileText, AlertTriangle, ShieldAlert, Star } from "lucide-react";
import { toast } from "sonner";
import type {
  EvaluatedTarget,
  EvaluationResult,
} from "@/lib/transfer-directory/types";
import { BUCKET_LABEL, formatPhone } from "@/lib/transfer-directory/reasons";

interface Props {
  result: EvaluationResult | null;
  emptyHint?: string;
  onAppendToNotes?: (text: string) => void;
  compact?: boolean;
}

export function TransferDirectoryPanel({
  result,
  emptyHint = "No transfer targets configured yet.",
  onAppendToNotes,
  compact = false,
}: Props) {
  if (!result) {
    return (
      <Card data-testid="transfer-directory-empty">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Transfer directory</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">{emptyHint}</CardContent>
      </Card>
    );
  }

  if (result.instructionsOnly) {
    return (
      <Card data-testid="transfer-directory-instructions" className="border-amber-300/60">
        <CardHeader className="pb-2 flex flex-row items-center gap-2 space-y-0">
          <ShieldAlert className="h-4 w-4 text-amber-500" />
          <CardTitle className="text-sm font-semibold">Transfer not permitted</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">{result.instructionsOnly.message}</p>
          {onAppendToNotes && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                onAppendToNotes(
                  `Transfer blocked: ${result.instructionsOnly!.message}`,
                )
              }
            >
              <FileText className="h-3.5 w-3.5 mr-1.5" /> Append to notes
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const totalShown =
    result.recommended.length +
    result.allowed.length +
    result.escalation.length +
    result.fallback.length;

  return (
    <Card data-testid="transfer-directory">
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Phone className="h-4 w-4 text-primary" /> Transfer directory
        </CardTitle>
        {result.singleAllowed && (
          <Badge variant="default" data-testid="single-allowed-banner">
            Only allowed target
          </Badge>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {totalShown === 0 && result.fallback.length === 0 && (
          <p className="text-xs text-muted-foreground" data-testid="no-targets">
            No transfer targets match the current context.
          </p>
        )}
        <ScrollArea className={compact ? "max-h-[260px]" : "max-h-[480px]"}>
          <div className="space-y-3 pr-2">
            <Bucket
              bucket="recommended"
              targets={result.recommended}
              onAppendToNotes={onAppendToNotes}
            />
            <Bucket bucket="allowed" targets={result.allowed} onAppendToNotes={onAppendToNotes} />
            <Bucket
              bucket="escalation"
              targets={result.escalation}
              onAppendToNotes={onAppendToNotes}
            />
            <Bucket
              bucket="fallback"
              targets={result.fallback}
              onAppendToNotes={onAppendToNotes}
              showWhenEmpty={
                result.recommended.length === 0 && result.allowed.length === 0
              }
            />
            {result.unavailable.length > 0 && (
              <UnavailableSection targets={result.unavailable} />
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function Bucket({
  bucket,
  targets,
  onAppendToNotes,
  showWhenEmpty,
}: {
  bucket: EvaluatedTarget["bucket"];
  targets: EvaluatedTarget[];
  onAppendToNotes?: (text: string) => void;
  showWhenEmpty?: boolean;
}) {
  if (targets.length === 0 && !showWhenEmpty) return null;
  return (
    <section data-testid={`bucket-${bucket}`}>
      <header className="flex items-center gap-2 mb-1.5">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {BUCKET_LABEL[bucket]}
        </h3>
        <Badge variant="outline" className="h-4 px-1 text-[10px]">
          {targets.length}
        </Badge>
      </header>
      <div className="space-y-1.5">
        {targets.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">None.</p>
        ) : (
          targets.map((t) => (
            <TargetCard key={t.entry.id} target={t} onAppendToNotes={onAppendToNotes} />
          ))
        )}
      </div>
    </section>
  );
}

function TargetCard({
  target,
  onAppendToNotes,
}: {
  target: EvaluatedTarget;
  onAppendToNotes?: (text: string) => void;
}) {
  const phone = formatPhone(target.entry.phoneNumber, target.entry.extension);
  const copy = useCallback(() => {
    const lines: string[] = [target.entry.displayName];
    if (target.entry.role) lines.push(target.entry.role);
    if (phone) lines.push(phone);
    if (target.entry.instructions) lines.push(target.entry.instructions);
    navigator.clipboard?.writeText(lines.join("\n")).then(
      () => toast.success("Transfer info copied"),
      () => toast.error("Copy failed"),
    );
  }, [target, phone]);
  const append = useCallback(() => {
    if (!onAppendToNotes) return;
    const lines: string[] = [
      `Transfer: ${target.entry.displayName}${target.entry.role ? ` (${target.entry.role})` : ""}`,
    ];
    if (phone) lines.push(`Phone: ${phone}`);
    if (target.entry.instructions) lines.push(target.entry.instructions);
    onAppendToNotes(lines.join("\n"));
  }, [target, phone, onAppendToNotes]);
  return (
    <article
      className="border rounded-md p-2 bg-card hover:bg-accent/30 transition-colors"
      data-target-id={target.entry.id}
      data-bucket={target.bucket}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {target.bucket === "recommended" && (
              <Star className="h-3 w-3 text-amber-500 flex-shrink-0" />
            )}
            <p className="text-sm font-medium truncate">{target.entry.displayName}</p>
            {target.entry.escalationLevel > 0 && (
              <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                L{target.entry.escalationLevel}
              </Badge>
            )}
          </div>
          {(target.entry.role || target.entry.team) && (
            <p className="text-xs text-muted-foreground truncate">
              {[target.entry.role, target.entry.team].filter(Boolean).join(" · ")}
            </p>
          )}
          {phone && (
            <p className="text-xs font-mono text-foreground mt-0.5">{phone}</p>
          )}
          {target.entry.instructions && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {target.entry.instructions}
            </p>
          )}
          {target.reasons.length > 0 && (
            <ul className="mt-1.5 flex flex-wrap gap-1">
              {target.reasons.map((r, i) => (
                <li key={i}>
                  <Badge variant="outline" className="h-4 px-1 text-[10px] font-normal">
                    {r}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex flex-col gap-1 flex-shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={copy} title="Copy">
            <Copy className="h-3.5 w-3.5" />
          </Button>
          {onAppendToNotes && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={append}
              title="Append to notes"
            >
              <FileText className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}

function UnavailableSection({ targets }: { targets: EvaluatedTarget[] }) {
  return (
    <details className="text-xs" data-testid="bucket-unavailable">
      <summary className="cursor-pointer text-muted-foreground flex items-center gap-1.5">
        <AlertTriangle className="h-3 w-3" /> {targets.length} unavailable
      </summary>
      <ul className="mt-1.5 space-y-1 pl-4">
        {targets.map((t) => (
          <li key={t.entry.id} className="text-muted-foreground">
            <span className="text-foreground">{t.entry.displayName}</span>
            {t.reasons[0] && <span> — {t.reasons[0]}</span>}
          </li>
        ))}
      </ul>
    </details>
  );
}
