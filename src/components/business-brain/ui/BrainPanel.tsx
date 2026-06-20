/**
 * BrainPanel — Phase 2 surface wrapper.
 *
 * Presentation only. No business logic, no data fetching. Provides a
 * consistent panel surface with optional header (eyebrow / title / actions)
 * and footer. Use `tone` for subtle status rails per Phase 2 guardrail:
 * rails are *subtle*, never loud.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BrainPanelTone = "default" | "ok" | "warn" | "bad" | "info";

interface Props {
  children: ReactNode;
  className?: string;
  tone?: BrainPanelTone;
  /** Raised card chrome (stronger shadow) vs flat panel. */
  raised?: boolean;
  toolbar?: ReactNode;
  footer?: ReactNode;
  "data-testid"?: string;
}

const RAIL_CLASS: Record<BrainPanelTone, string> = {
  default: "",
  ok: "bb-rail bb-rail-ok",
  warn: "bb-rail bb-rail-warn",
  bad: "bb-rail bb-rail-bad",
  info: "bb-rail bb-rail-info",
};

export function BrainPanel({
  children,
  className,
  tone = "default",
  raised,
  toolbar,
  footer,
  ...rest
}: Props) {
  return (
    <section
      data-testid={rest["data-testid"]}
      data-bb-panel-tone={tone}
      className={cn(
        raised ? "bb-card-raised" : "bb-panel",
        RAIL_CLASS[tone],
        className,
      )}
    >
      {toolbar ? (
        <header className="flex items-center justify-between gap-3 border-b border-bb-border-subtle px-4 py-2.5">
          {toolbar}
        </header>
      ) : null}
      <div className="p-4">{children}</div>
      {footer ? (
        <footer className="border-t border-bb-border-subtle px-4 py-2.5">
          {footer}
        </footer>
      ) : null}
    </section>
  );
}

export default BrainPanel;
