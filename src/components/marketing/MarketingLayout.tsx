import { ReactNode } from "react";
import { MegaMenuHeader } from "@/components/marketing/MegaMenuHeader";
import { MegaFooter } from "@/components/marketing/MegaFooter";
import { ScrollToTopButton } from "@/components/layout/ScrollToTopButton";
import { SEOHead } from "@/components/seo/SEOHead";

interface MarketingLayoutProps {
  title: string;
  description: string;
  children: ReactNode;
  noindex?: boolean;
}

/**
 * Phase 9 — Shared marketing chrome for the rebuilt public IA.
 * Wraps persona/solution/pricing/integrations/customers pages with the
 * canonical mega header, mega footer, and SEO defaults.
 */
export function MarketingLayout({ title, description, children, noindex }: MarketingLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead title={title} description={description} noindex={noindex} />
      <MegaMenuHeader />
      <main>{children}</main>
      <MegaFooter />
      <ScrollToTopButton />
    </div>
  );
}
