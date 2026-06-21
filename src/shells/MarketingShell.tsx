import { ReactNode } from "react";
import { CanonicalMarketingHeader } from "@/components/shells/marketing/CanonicalMarketingHeader";
import { CanonicalMarketingFooter } from "@/components/shells/marketing/CanonicalMarketingFooter";
import { ScrollToTopButton } from "@/components/layout/ScrollToTopButton";
import { SEOHead } from "@/components/seo/SEOHead";

interface MarketingShellProps {
  title: string;
  description: string;
  children: ReactNode;
  noindex?: boolean;
  /** Optional banner rendered between content and footer (e.g. final CTA). */
  ctaBanner?: ReactNode;
}

/**
 * Phase 1 — Canonical MarketingShell.
 *
 * Wraps every public marketing surface with the canonical header (driven
 * by MARKETING_NAV) and canonical footer. Drop-in API-compatible with
 * the legacy MarketingLayout so existing canonical pages can swap import
 * paths without prop changes.
 *
 * Public CTA destinations rendered by this shell are locked to:
 *   /contact?topic=pilot, /login, /signup, /trust, and other public routes.
 * No /admin, /master, or /superadmin destinations.
 */
export function MarketingShell({
  title,
  description,
  children,
  noindex,
  ctaBanner,
}: MarketingShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <SEOHead title={title} description={description} noindex={noindex} />
      <CanonicalMarketingHeader />
      <main className="flex-1">{children}</main>
      {ctaBanner && (
        <div className="border-t border-border/40 bg-[hsl(var(--bb-surface-inset))]">
          {ctaBanner}
        </div>
      )}
      <CanonicalMarketingFooter />
      <ScrollToTopButton />
    </div>
  );
}

export default MarketingShell;
