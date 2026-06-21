import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionShellProps {
  id?: string;
  children: ReactNode;
  /** @deprecated use `surface="muted"` */
  muted?: boolean;
  bordered?: boolean;
  size?: "sm" | "md" | "lg";
  surface?: "default" | "muted" | "inset";
  className?: string;
}

/**
 * Phase 4 — Canonical marketing section wrapper.
 *
 * `surface`:
 *   - "default" — plain background
 *   - "muted"   — soft muted band (back-compat with `muted` prop)
 *   - "inset"   — Brain-aligned inset surface (hsl bb-surface-inset)
 */
export function SectionShell({
  id,
  children,
  muted,
  bordered,
  size = "md",
  surface,
  className,
}: SectionShellProps) {
  const padY = size === "sm" ? "py-14" : size === "lg" ? "py-28" : "py-20";
  const resolved = surface ?? (muted ? "muted" : "default");
  const bg =
    resolved === "muted"
      ? "bg-muted/25"
      : resolved === "inset"
        ? "bg-[hsl(var(--bb-surface-inset))]"
        : "";
  return (
    <section
      id={id}
      className={cn(
        padY,
        bg,
        bordered && "border-t border-border/40",
        className,
      )}
    >
      <div className="max-w-6xl mx-auto px-6">{children}</div>
    </section>
  );
}
