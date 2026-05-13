import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { Fabric59Icon } from "@/components/brand/Fabric59Icon";
import { SEOHead } from "@/components/seo/SEOHead";
import { cn } from "@/lib/utils";

export interface OnboardingStepDef {
  key: string;
  label: string;
  description?: string;
}

interface OnboardingShellProps {
  title: string;
  description: string;
  steps: OnboardingStepDef[];
  activeKey: string;
  heading: ReactNode;
  subheading?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Phase 2 — Canonical OnboardingShell.
 *
 * Promoted from re-export. Brand bar + progress rail + step header + body.
 * Workspace-first by default — never implies admin as the first destination.
 */
export function OnboardingShell({
  title,
  description,
  steps,
  activeKey,
  heading,
  subheading,
  children,
  footer,
}: OnboardingShellProps) {
  const activeIndex = Math.max(
    0,
    steps.findIndex((s) => s.key === activeKey),
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead title={title} description={description} noindex />

      <header className="border-b border-border/40">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5" aria-label="Fabric59 home">
            <Fabric59Icon size="sm" />
            <span className="text-sm font-semibold tracking-tight text-foreground">
              Fabric59
            </span>
          </Link>
          <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            Concierge setup
          </p>
        </div>
      </header>

      <main className="flex-1">
        <div className="max-w-6xl mx-auto px-6 py-12 grid lg:grid-cols-[260px_1fr] gap-12">
          {/* Progress rail */}
          <nav aria-label="Onboarding progress" className="hidden lg:block">
            <ol className="space-y-1">
              {steps.map((s, i) => {
                const done = i < activeIndex;
                const active = i === activeIndex;
                return (
                  <li
                    key={s.key}
                    className={cn(
                      "relative flex gap-3 rounded-lg px-3 py-3 transition-colors",
                      active && "bg-muted/40",
                    )}
                  >
                    <div
                      className={cn(
                        "h-6 w-6 rounded-full border flex items-center justify-center text-[11px] font-semibold shrink-0",
                        done
                          ? "bg-primary border-primary text-primary-foreground"
                          : active
                            ? "border-primary text-primary"
                            : "border-border text-muted-foreground",
                      )}
                    >
                      {done ? <Check className="h-3 w-3" /> : i + 1}
                    </div>
                    <div className="min-w-0">
                      <p
                        className={cn(
                          "text-sm font-medium",
                          active ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {s.label}
                      </p>
                      {s.description && (
                        <p className="text-[11px] text-muted-foreground/80 mt-0.5 leading-snug">
                          {s.description}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </nav>

          {/* Mobile progress */}
          <div className="lg:hidden">
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              Step {activeIndex + 1} of {steps.length}
            </p>
            <p className="text-sm font-medium text-foreground mt-1">
              {steps[activeIndex]?.label}
            </p>
            <div className="mt-3 h-1 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${((activeIndex + 1) / steps.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Body */}
          <section>
            <header className="mb-6">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {heading}
              </h1>
              {subheading && (
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-xl">
                  {subheading}
                </p>
              )}
            </header>
            <div>{children}</div>
            {footer && <div className="mt-8">{footer}</div>}
          </section>
        </div>
      </main>
    </div>
  );
}

export default OnboardingShell;
