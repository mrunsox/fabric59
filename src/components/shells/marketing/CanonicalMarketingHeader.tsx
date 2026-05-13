import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Fabric59Logo } from "@/components/brand/Fabric59Logo";
import { useHeaderOffset } from "@/hooks/useHeaderOffset";
import { MARKETING_NAV } from "@/config/canonicalNav";
import { cn } from "@/lib/utils";

/**
 * Phase 1 — Canonical marketing header.
 *
 * Driven entirely by MARKETING_NAV (single source of truth).
 * No mega menus, no inline content arrays. Mobile drawer mirrors desktop nav.
 *
 * CTA destinations are locked to public-only routes:
 *   - /contact?topic=pilot  (primary)
 *   - /login                (secondary)
 *
 * Replaces the legacy MegaMenuHeader for canonical pages.
 */
export function CanonicalMarketingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const headerRef = useHeaderOffset<HTMLElement>();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      ref={headerRef}
      className={cn(
        "border-b sticky top-0 z-50 backdrop-blur-xl transition-[background-color,border-color,box-shadow] duration-200",
        scrolled
          ? "border-border/70 bg-background/95 shadow-sm"
          : "border-border/40 bg-background/80",
      )}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-6 px-6 py-3">
        <Link to="/" aria-label="Fabric59 home" className="shrink-0 whitespace-nowrap">
          <Fabric59Logo iconSize="md" />
        </Link>

        {/* Desktop nav — flat, MARKETING_NAV driven */}
        <nav className="hidden lg:flex items-center gap-1">
          {MARKETING_NAV.map((item) => (
            <NavLink
              key={item.key}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  "inline-flex h-9 items-center justify-center rounded-md px-3 text-sm transition-colors",
                  isActive
                    ? "text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Desktop CTAs — locked to public destinations */}
        <div className="hidden lg:flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/login">Sign in</Link>
          </Button>
          <Button size="sm" className="gap-1.5" asChild>
            <Link to="/contact?topic=pilot">
              Start a pilot <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {/* Mobile drawer */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild className="lg:hidden">
            <Button variant="ghost" size="icon" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80 bg-background p-6 overflow-y-auto">
            <div className="flex flex-col gap-1 mt-8">
              {MARKETING_NAV.map((item) => (
                <NavLink
                  key={item.key}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                      isActive
                        ? "bg-muted text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                    )
                  }
                >
                  <item.icon className="h-4 w-4 text-primary" />
                  {item.label}
                </NavLink>
              ))}

              <div className="space-y-2 pt-6 mt-2 border-t border-border/50">
                <Button className="w-full" asChild>
                  <Link to="/contact?topic=pilot" onClick={() => setMobileOpen(false)}>
                    Start a pilot
                  </Link>
                </Button>
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/login" onClick={() => setMobileOpen(false)}>
                    Sign in
                  </Link>
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
