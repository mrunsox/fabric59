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
 *
 * Phase 2 Slice B: internals adopt the Brain token system (surface-2 +
 * subtle status hues for failed/noPermission). Prop surface unchanged.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
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

type KindMeta = {
  icon: typeof AlertCircle;
  iconTone: string;
  iconBg: string;
  rail: string;
  iconAria: string;
};

const KIND_META: Record<BbStateKind, KindMeta> = {
  loading: {
    icon: Loader2,
    iconTone: "text-muted-foreground",
    iconBg: "bg-bb-surface-inset",
    rail: "",
    iconAria: "Loading",
  },
  empty: {
    icon: Inbox,
    iconTone: "text-muted-foreground/80",
    iconBg: "bg-bb-surface-inset",
    rail: "",
    iconAria: "Empty",
  },
  noData: {
    icon: Inbox,
    iconTone: "text-bb-status-muted-fg",
    iconBg: "bg-bb-status-muted-bg-soft",
    rail: "bb-rail",
    iconAria: "No data yet",
  },
  failed: {
    icon: AlertTriangle,
    iconTone: "text-bb-status-bad-fg",
    iconBg: "bg-bb-status-bad-bg-soft",
    rail: "bb-rail bb-rail-bad",
    iconAria: "Failed",
  },
  noPermission: {
    icon: Lock,
    iconTone: "text-bb-status-warn-fg",
    iconBg: "bg-bb-status-warn-bg-soft",
    rail: "bb-rail bb-rail-warn",
    iconAria: "No access",
  },
  upcoming: {
    icon: Sparkles,
    iconTone: "text-bb-status-info-fg",
    iconBg: "bg-bb-status-info-bg-soft",
    rail: "",
    iconAria: "Coming soon",
  },
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
    <section
      role="status"
      data-testid={rest["data-testid"] ?? `bb-state-${kind}`}
      data-bb-state-kind={kind}
      className={cn(
        "bb-panel text-center",
        meta.rail,
        dense ? "px-4 py-6" : "px-6 py-10",
        className,
      )}
    >
      <div className="mx-auto flex max-w-md flex-col items-center gap-3">
        <span
          className={cn(
            "inline-flex h-9 w-9 items-center justify-center rounded-full",
            meta.iconBg,
          )}
        >
          <Icon
            aria-label={meta.iconAria}
            className={cn(
              "h-4.5 w-4.5",
              meta.iconTone,
              kind === "loading" && "animate-spin",
            )}
          />
        </span>
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description ? (
          <div className="text-xs text-muted-foreground">{description}</div>
        ) : null}
        {action ? <div className="pt-1">{action}</div> : null}
      </div>
    </section>
  );
}

export default BbStateBlock;
