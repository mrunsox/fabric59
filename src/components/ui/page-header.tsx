import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Phase G — small label rendered above the title. */
  eyebrow?: string;
  /** Phase G — control alignment of title + subtitle stack. */
  align?: "left" | "center";
  /** Phase G — optional proof strip slot rendered beneath the subtitle. */
  proofStrip?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  breadcrumb?: ReactNode;
  className?: string;
  accent?: boolean;
  icon?: ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  align = "left",
  proofStrip,
  children,
  actions,
  breadcrumb,
  className,
  accent = true,
  icon,
}: PageHeaderProps) {
  const isCenter = align === "center";
  return (
    <div className={cn("pb-1", accent && "header-gradient", className)}>
      {breadcrumb && <div className="mb-2">{breadcrumb}</div>}
      <div
        className={cn(
          "flex flex-col gap-4 pt-1",
          isCenter ? "items-center text-center" : "sm:flex-row sm:items-center sm:justify-between",
        )}
      >
        <div className={cn("flex items-center gap-3 min-w-0", isCenter && "flex-col items-center")}>
          {icon}
          <div className={cn("min-w-0", isCenter && "text-center")}>
            {eyebrow && (
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary mb-2">
                {eyebrow}
              </p>
            )}
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl truncate">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {children && <div className={cn("flex items-center gap-2 flex-shrink-0", isCenter && "justify-center")}>{children}</div>}
      </div>
      {proofStrip && <div className="mt-5">{proofStrip}</div>}
      {actions && <div className={cn("mt-4 flex items-center gap-2", isCenter && "justify-center")}>{actions}</div>}
    </div>
  );
}
