import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { Fabric59Icon } from "@/components/brand/Fabric59Icon";
import { ArrowLeft } from "lucide-react";
import { SEOHead } from "@/components/seo/SEOHead";

interface AuthShellProps {
  title: string;
  description: string;
  heading: ReactNode;
  subheading?: ReactNode;
  children: ReactNode;
  showBack?: boolean;
}

/**
 * Phase H — Premium shared auth shell.
 *
 * Two-pane on desktop, stacked on mobile. Left = brand + grounded
 * product truth. Right = clean form column. No rotating feature lists,
 * no fabricated security chips, no fake user-count proof.
 */
export function AuthShell({
  title,
  description,
  heading,
  subheading,
  children,
  showBack = true,
}: AuthShellProps) {
  return (
    <div className="min-h-screen bg-background flex">
      <SEOHead title={title} description={description} noindex />

      {/* Left narrative panel */}
      <aside className="hidden lg:flex lg:w-1/2 relative overflow-hidden border-r border-border/40">
        <div
          aria-hidden
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,hsl(var(--primary)/0.10),transparent_60%)]"
        />
        <div className="relative flex flex-col justify-between p-12 max-w-lg mx-auto w-full">
          <Link to="/" className="flex items-center gap-2.5 w-fit" aria-label="Fabric59 home">
            <Fabric59Icon size="md" />
            <span className="text-base font-semibold tracking-tight text-foreground">
              Fabric59
            </span>
          </Link>

          <div className="space-y-8">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary mb-4">
                Operational intelligence
              </p>
              <p className="text-2xl font-semibold tracking-tight text-foreground leading-snug">
                Operational intelligence for Five9 contact centers.
              </p>
            </div>
            <ul className="space-y-4">
              {[
                "Workspace-first execution — clients, campaigns, guides, and QA in one canonical surface.",
                "Five9-native session events — ANI lookup, screen pop, post-call dispatch.",
                "Clio-first, adapter-based downstream — MyCase next, provider-agnostic by design.",
              ].map((b) => (
                <li
                  key={b}
                  className="flex items-start gap-3 text-sm text-muted-foreground leading-relaxed"
                >
                  <span
                    aria-hidden
                    className="mt-2 h-1 w-1 rounded-full bg-primary/70 shrink-0"
                  />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-[11px] text-muted-foreground/70 tracking-wide">
            Founder-led pilots. Concierge onboarding. No self-serve checkout.
          </p>
        </div>
      </aside>

      {/* Right form column */}
      <main className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md space-y-6">
          {showBack && (
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>
          )}

          <div className="lg:hidden flex items-center gap-2.5">
            <Fabric59Icon size="md" />
            <span className="text-base font-semibold tracking-tight text-foreground">
              Fabric59
            </span>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {heading}
            </h1>
            {subheading && (
              <p className="text-sm text-muted-foreground leading-relaxed">{subheading}</p>
            )}
          </div>

          <div>{children}</div>
        </div>
      </main>
    </div>
  );
}
