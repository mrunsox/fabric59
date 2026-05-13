import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionShellProps {
  id?: string;
  children: ReactNode;
  muted?: boolean;
  bordered?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Phase H — Canonical marketing section wrapper.
 *
 * Consistent vertical rhythm and max-width across all marketing pages.
 * Optional muted background and top border for visual separation.
 */
export function SectionShell({
  id,
  children,
  muted,
  bordered,
  size = "md",
  className,
}: SectionShellProps) {
  const padY =
    size === "sm" ? "py-14" : size === "lg" ? "py-28" : "py-20";
  return (
    <section
      id={id}
      className={cn(
        padY,
        muted && "bg-muted/20",
        bordered && "border-t border-border/30",
        className,
      )}
    >
      <div className="max-w-6xl mx-auto px-6">{children}</div>
    </section>
  );
}
