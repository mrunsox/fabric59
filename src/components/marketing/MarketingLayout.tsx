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
  /** Phase G — optional banner rendered between content and footer (e.g. final CTA). */
  ctaBanner?: ReactNode;
}

/**
 * Phase G — Shared marketing chrome.
 * Mega menu header, content, optional CTA banner, mega footer, scroll-to-top.
 */
export function MarketingLayout({ title, description, children, noindex, ctaBanner }: MarketingLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead title={title} description={description} noindex={noindex} />
      <MegaMenuHeader />
      <main>{children}</main>
      {ctaBanner && <div className="border-t border-border/30">{ctaBanner}</div>}
      <MegaFooter />
      <ScrollToTopButton />
    </div>
  );
}
