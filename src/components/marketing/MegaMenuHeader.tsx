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
  GitBranch, Bot, Megaphone, Globe, Scale, ArrowRight, Menu,
  UserCog, GitFork, Mail, Lock, FileSearch, Phone, Building2,
} from "lucide-react";

const platformItems = [
  { icon: Phone, title: "Five9 SOAP integration", desc: "30+ live SOAP actions across agents, campaigns, skills, profiles, DNIS.", href: "/#available-now", badge: "Live" },
  { icon: Globe, title: "Multi-domain Five9 management", desc: "Credentials, IVR, and connection tests across multiple Five9 domains.", href: "/#available-now", badge: "Live" },
  { icon: Scale, title: "Legal Connect (MyCase / Clio)", desc: "MyCase live via per-client API key. Clio adapter ready to activate.", href: "/#legal-connect", badge: "Live" },
  { icon: GitBranch, title: "Visual field mapping + Test runner", desc: "Drag-and-drop CRM mapping with a real Test runner against tenant configs.", href: "/#available-now", badge: "Live" },
  { icon: GitFork, title: "Decision-tree script builder", desc: "React Flow scripting with conditional branching and runtime simulator.", href: "/#available-now", badge: "Live" },
  { icon: Building2, title: "Multi-tenant hierarchy + RLS", desc: "Org / Partner / Client config inheritance with Postgres RLS isolation.", href: "/#security", badge: "Live" },
  { icon: FileSearch, title: "API logs & compliance export", desc: "Realtime API events, telephony reconciliation, audit-grade export.", href: "/#security", badge: "Live" },
  { icon: Bot, title: "AI Call Flow builder", desc: "Chat-driven flow design. One-click Five9 export coming soon.", href: "/#coming-soon", badge: "Coming soon" },
  { icon: Megaphone, title: "Campaign blueprints", desc: "Intake form drives automated SOAP sequences and reverse-engineering.", href: "/#available-now", badge: "Live" },
  { icon: UserCog, title: "Agent provisioning (Five9 + Slack)", desc: "One-form provisioning for Five9 and Slack workspaces.", href: "/#available-now", badge: "Live" },
  { icon: Mail, title: "Disposition email engine", desc: "Per-disposition branded emails. CRM writebacks coming soon.", href: "/#available-now", badge: "Partial" },
];

export function MegaMenuHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={`border-b sticky top-0 z-50 backdrop-blur-xl transition-all ${scrolled ? "border-border/70 bg-background/95 shadow-sm" : "border-border/40 bg-background/80"}`}>
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
                      <a
                        key={item.title}
                        href={item.href}
                        className="group flex items-start gap-3 rounded-lg p-3 hover:bg-muted/50 transition-colors"
                      >
                        <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                          <item.icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-medium text-foreground">{item.title}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                              item.badge === "Live"
                                ? "bg-success/10 text-success"
                                : item.badge === "Partial"
                                ? "bg-primary/10 text-primary"
                                : "bg-accent/10 text-accent"
                            }`}>
                              {item.badge}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground leading-relaxed">{item.desc}</div>
                        </div>
                      </a>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
                    <Link to="/product" className="text-xs text-primary hover:underline flex items-center gap-1">
                      Full product tour <ArrowRight className="h-3 w-3" />
                    </Link>
                    <a href="/#coming-soon" className="text-xs text-muted-foreground hover:text-foreground">
                      Roadmap →
                    </a>
                  </div>
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <Link to="/product" className="inline-flex h-10 items-center justify-center rounded-md px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                Product
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link to="/trust" className="inline-flex h-10 items-center justify-center rounded-md px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                Trust
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link to="/contact" className="inline-flex h-10 items-center justify-center rounded-md px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                Contact
              </Link>
            </NavigationMenuItem>
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
                  <a key={item.title} href={item.href} onClick={() => setMobileOpen(false)} className="flex items-center gap-2 py-2 text-sm text-foreground hover:text-primary transition-colors">
                    <item.icon className="h-4 w-4 text-primary" />
                    {item.title}
                  </a>
                ))}
              </div>
              <div className="space-y-1">
                <Link to="/product" onClick={() => setMobileOpen(false)} className="block py-2 text-sm font-medium text-foreground">Product</Link>
                <Link to="/trust" onClick={() => setMobileOpen(false)} className="block py-2 text-sm font-medium text-foreground">Trust</Link>
                <Link to="/contact" onClick={() => setMobileOpen(false)} className="block py-2 text-sm font-medium text-foreground">Contact</Link>
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
