import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Fabric59Logo } from "@/components/brand/Fabric59Logo";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useHeaderOffset } from "@/hooks/useHeaderOffset";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  LayoutGrid, Megaphone, BookOpen, Plug, BarChart3, Workflow, ArrowRight, Menu,
} from "lucide-react";

// Canonical capability categories — no vendor-feature inventory.
const platformItems = [
  { icon: LayoutGrid, title: "Workspace operations", desc: "Org, partner, and client workspaces with RLS-isolated data and shared config inheritance.", href: "/product#workspace-operations" },
  { icon: Megaphone, title: "Campaign orchestration", desc: "Intake-driven campaign setup, decision-tree scripting, and runtime simulation.", href: "/product#campaign-orchestration" },
  { icon: BookOpen, title: "Guides and templates", desc: "Reusable playbooks, scripts, and templates for repeatable rollouts.", href: "/product#guides-templates" },
  { icon: Plug, title: "Integrations", desc: "Five9 telephony, MyCase, Clio, and a growing catalog of CRM and workflow connectors.", href: "/integrations" },
  { icon: BarChart3, title: "Analytics and QA", desc: "Realtime API events, telephony reconciliation, audit-grade exports, and QA scoring.", href: "/product#analytics-qa" },
  { icon: Workflow, title: "CRM sync and workflow automation", desc: "Field mapping, post-call automations, and downstream workflow dispatch.", href: "/product#crm-sync" },
];

const primaryLinks = [
  { to: "/solutions", label: "Solutions" },
  { to: "/personas", label: "Personas" },
  { to: "/pricing", label: "Pricing" },
  { to: "/integrations", label: "Integrations" },
  { to: "/customers", label: "Customers" },
  { to: "/trust", label: "Trust" },
];

export function MegaMenuHeader() {
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
      className={`border-b sticky top-0 z-50 backdrop-blur-xl transition-[background-color,border-color,box-shadow] duration-200 ${scrolled ? "border-border/70 bg-background/95 shadow-sm" : "border-border/40 bg-background/80"}`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3">
        <Link to="/">
          <Fabric59Logo iconSize="md" />
        </Link>

        {/* Desktop Nav */}
        <NavigationMenu className="hidden lg:flex">
          <NavigationMenuList className="gap-1">
            <NavigationMenuItem>
              <NavigationMenuTrigger className="bg-transparent text-muted-foreground hover:text-foreground data-[state=open]:text-foreground text-sm">
                Platform
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <div className="w-[680px] p-6">
                  <div className="grid grid-cols-2 gap-3">
                    {platformItems.map((item) => (
                      <Link
                        key={item.title}
                        to={item.href}
                        className="group flex items-start gap-3 rounded-lg p-3 hover:bg-muted/50 transition-colors"
                      >
                        <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                          <item.icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-foreground mb-0.5">{item.title}</div>
                          <div className="text-xs text-muted-foreground leading-relaxed">{item.desc}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
                    <Link to="/product" className="text-xs text-primary hover:underline flex items-center gap-1">
                      Full product overview <ArrowRight className="h-3 w-3" />
                    </Link>
                    <Link to="/integrations" className="text-xs text-muted-foreground hover:text-foreground">
                      Integrations →
                    </Link>
                  </div>
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>

            {primaryLinks.map((item) => (
              <NavigationMenuItem key={item.to}>
                <Link to={item.to} className="inline-flex h-10 items-center justify-center rounded-md px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {item.label}
                </Link>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        {/* CTA */}
        <div className="hidden lg:flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/login">Sign In</Link>
          </Button>
          <Button size="sm" className="gap-1.5" asChild>
            <Link to="/contact">
              Request a walkthrough <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {/* Mobile */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild className="lg:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80 bg-background p-6">
            <div className="flex flex-col gap-6 mt-8">
              <div className="space-y-1">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Platform</div>
                {platformItems.slice(0, 6).map((item) => (
                  <Link key={item.title} to={item.href} onClick={() => setMobileOpen(false)} className="flex items-center gap-2 py-2 text-sm text-foreground hover:text-primary transition-colors">
                    <item.icon className="h-4 w-4 text-primary" />
                    {item.title}
                  </Link>
                ))}
              </div>
              <div className="space-y-1">
                {[
                  ...primaryLinks,
                  { to: "/product", label: "Product overview" },
                  { to: "/contact", label: "Contact" },
                ].map((item) => (
                  <Link key={item.to} to={item.to} onClick={() => setMobileOpen(false)} className="block py-2 text-sm font-medium text-foreground">{item.label}</Link>
                ))}
              </div>
              <div className="space-y-2 pt-4 border-t border-border/50">
                <Button className="w-full" asChild>
                  <Link to="/contact" onClick={() => setMobileOpen(false)}>Request a walkthrough</Link>
                </Button>
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/login" onClick={() => setMobileOpen(false)}>Sign In</Link>
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
