/**
 * BrainBadge — Phase 2 status-aware badge.
 *
 * Presentation only. Uses the .bb-badge tonal recipes so colors stay
 * consistent and restrained. Prefer this over hand-rolled badges inside
 * Brain surfaces.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BrainBadgeTone = "ok" | "warn" | "bad" | "info" | "muted";

interface Props {
  tone?: BrainBadgeTone;
  children: ReactNode;
  className?: string;
  "data-testid"?: string;
}

const TONE_CLASS: Record<BrainBadgeTone, string> = {
  ok: "bb-badge bb-badge-ok",
  warn: "bb-badge bb-badge-warn",
  bad: "bb-badge bb-badge-bad",
  info: "bb-badge bb-badge-info",
  muted: "bb-badge bb-badge-muted",
};

export function BrainBadge({ tone = "muted", children, className, ...rest }: Props) {
  return (
    <span
      data-testid={rest["data-testid"]}
      data-bb-badge-tone={tone}
      className={cn(TONE_CLASS[tone], className)}
    >
      {children}
    </span>
  );
}

export default BrainBadge;
