/**
 * BbStateBlock — Phase 1 shared structural block for non-content states.
 *
 * One component, one structure (icon + title + body + optional action),
 * different surface-specific copy/actions per usage site. Per Phase 1
 * scope guard: not a single generic message — callers always pass
 * surface-aware `title`/`description`/`action`.
 *
 * `kind` controls the visual treatment and disambiguates "no-data" from
 * "failed" so reviewers never misread an empty card as a broken one.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import {
  AlertCircle,
  AlertTriangle,
  Inbox,
  Loader2,
  Lock,
  Sparkles,
} from "lucide-react";

export type BbStateKind =
  | "loading"
  | "empty"
  | "noData"
  | "failed"
  | "noPermission"
  | "upcoming";

interface Props {
  kind: BbStateKind;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  /** Use compact padding when embedded inside a tab / panel body. */
  dense?: boolean;
  "data-testid"?: string;
}

const KIND_META: Record<
  BbStateKind,
  { icon: typeof AlertCircle; tone: string; iconAria: string }
> = {
  loading: { icon: Loader2, tone: "text-muted-foreground", iconAria: "Loading" },
  empty: { icon: Inbox, tone: "text-muted-foreground/70", iconAria: "Empty" },
  noData: { icon: Inbox, tone: "text-muted-foreground/70", iconAria: "No data yet" },
  failed: { icon: AlertTriangle, tone: "text-destructive", iconAria: "Failed" },
  noPermission: { icon: Lock, tone: "text-muted-foreground", iconAria: "No access" },
  upcoming: { icon: Sparkles, tone: "text-muted-foreground", iconAria: "Coming soon" },
};

export function BbStateBlock({
  kind,
  title,
  description,
  action,
  className,
  dense,
  ...rest
}: Props) {
  const meta = KIND_META[kind];
  const Icon = meta.icon;
  return (
    <Card
      data-testid={rest["data-testid"] ?? `bb-state-${kind}`}
      data-bb-state-kind={kind}
      className={cn(
        "border-dashed text-center",
        dense ? "px-4 py-6" : "px-6 py-10",
        className,
      )}
    >
      <div className="mx-auto flex max-w-md flex-col items-center gap-2">
        <Icon
          aria-label={meta.iconAria}
          className={cn(
            "h-6 w-6",
            meta.tone,
            kind === "loading" && "animate-spin",
          )}
        />
        <p className="text-sm font-medium">{title}</p>
        {description ? (
          <div className="text-xs text-muted-foreground">{description}</div>
        ) : null}
        {action ? <div className="pt-1">{action}</div> : null}
      </div>
    </Card>
  );
}

export default BbStateBlock;
