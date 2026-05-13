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
  PhoneIncoming,
  PhoneOutgoing,
  ClipboardCheck,
  Workflow,
  Activity,
  Headphones,
  Wrench,
  Scale,
  Building2,
  ArrowRight,
  Menu,
  Sparkles,
} from "lucide-react";

// Canonical solutions — 5 operating motions. Each anchors a section on /solutions.
const solutionMotions = [
  {
    icon: PhoneIncoming,
    title: "Inbound intake",
    desc: "Pre-call ANI lookup, decision-tree guides, and disposition-driven CRM writeback.",
    href: "/solutions#inbound-intake",
  },
  {
    icon: PhoneOutgoing,
    title: "Outbound reactivation",
    desc: "Campaign orchestration, callback queues, and ANI block lists for win-back motions.",
    href: "/solutions#outbound-reactivation",
  },
  {
    icon: ClipboardCheck,
    title: "QA and review",
    desc: "Workspace-scoped review queue, scoring against shipped guides, and supervisor live ops.",
    href: "/solutions#qa-and-review",
  },
  {
    icon: Workflow,
    title: "CRM sync and handoff",
    desc: "Field mapping, post-call automations, and downstream workflow dispatch into your systems.",
    href: "/solutions#crm-sync-handoff",
  },
  {
    icon: Activity,
    title: "Monitoring and readiness",
    desc: "Telephony reconciliation, tenant health, rate limits, and pilot readiness state.",
    href: "/solutions#monitoring-readiness",
  },
];

// Canonical personas — 4 roles. Each anchors a section on /personas.
const personaRoles = [
  { icon: Building2, title: "Ops leader", desc: "Multi-workspace governance, rollups, readiness.", href: "/personas#ops-leader" },
  { icon: Headphones, title: "Supervisor", desc: "Live ops, callbacks, QA review and coaching.", href: "/personas#supervisor" },
  { icon: Wrench, title: "Implementation / admin", desc: "Connectors, mappings, scripting, rollout.", href: "/personas#implementation-admin" },
  { icon: Scale, title: "Intake / service ops owner", desc: "Per-disposition routing, downstream handoff.", href: "/personas#intake-owner" },
];

// Canonical primary nav after the mega menus. No duplicates of mega-menu triggers.
const primaryLinks = [
  { to: "/integrations", label: "Integrations" },
  { to: "/pricing", label: "Pricing" },
  { to: "/customers", label: "Customers" },
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
      className={`border-b sticky top-0 z-50 backdrop-blur-xl transition-[background-color,border-color,box-shadow] duration-200 ${
        scrolled ? "border-border/70 bg-background/95 shadow-sm" : "border-border/40 bg-background/80"
      }`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-6 px-6 py-3">
        <Link to="/" aria-label="Fabric59 home" className="shrink-0 whitespace-nowrap">
          <Fabric59Logo iconSize="md" />
        </Link>

        {/* Desktop Nav */}
        <NavigationMenu className="hidden lg:flex">
          <NavigationMenuList className="gap-1">
            {/* Solutions panel */}
            <NavigationMenuItem>
              <NavigationMenuTrigger className="bg-transparent text-muted-foreground hover:text-foreground data-[state=open]:text-foreground text-sm">
                Solutions
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <div className="w-[760px] grid grid-cols-[1fr_220px] gap-6 p-6">
                  <div className="grid grid-cols-2 gap-2">
                    {solutionMotions.map((item) => (
                      <Link
                        key={item.title}
                        to={item.href}
                        className="group flex items-start gap-3 rounded-lg p-3 hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      >
                        <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                          <item.icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground">{item.title}</div>
                          <div className="text-xs text-muted-foreground leading-relaxed mt-0.5">{item.desc}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                  <CtaColumn />
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>

            {/* Personas panel */}
            <NavigationMenuItem>
              <NavigationMenuTrigger className="bg-transparent text-muted-foreground hover:text-foreground data-[state=open]:text-foreground text-sm">
                Personas
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <div className="w-[640px] grid grid-cols-[1fr_220px] gap-6 p-6">
                  <div className="grid grid-cols-2 gap-2">
                    {personaRoles.map((item) => (
                      <Link
                        key={item.title}
                        to={item.href}
                        className="group flex items-start gap-3 rounded-lg p-3 hover:bg-muted/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                      >
                        <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                          <item.icon className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground">{item.title}</div>
                          <div className="text-xs text-muted-foreground leading-relaxed mt-0.5">{item.desc}</div>
                        </div>
                      </Link>
                    ))}
                  </div>
                  <CtaColumn />
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>

            {/* Direct primary links */}
            {primaryLinks.map((item) => (
              <NavigationMenuItem key={item.to}>
                <Link
                  to={item.to}
                  className="inline-flex h-10 items-center justify-center rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {item.label}
                </Link>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        {/* CTA */}
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
            <div className="flex flex-col gap-6 mt-8">
              <MobileGroup label="Solutions" items={solutionMotions} onPick={() => setMobileOpen(false)} />
              <MobileGroup label="Personas" items={personaRoles} onPick={() => setMobileOpen(false)} />

              <div className="space-y-1">
                {primaryLinks.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className="block py-2 text-sm font-medium text-foreground"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>

              <div className="space-y-2 pt-4 border-t border-border/50">
                <Button className="w-full" asChild>
                  <Link to="/contact?topic=pilot" onClick={() => setMobileOpen(false)}>
                    Start a pilot
                  </Link>
                </Button>
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/login" onClick={() => setMobileOpen(false)}>Sign in</Link>
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}

function CtaColumn() {
  return (
    <div className="rounded-xl border border-border/60 bg-gradient-to-b from-primary/5 to-transparent p-4 flex flex-col">
      <div className="flex items-center gap-2 mb-2">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <p className="text-xs font-semibold tracking-wide text-foreground">Get started</p>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed mb-4">
        Founder-led pilots. Real workspaces, real connectors, scoped to your operation.
      </p>
      <div className="mt-auto space-y-2">
        <Button size="sm" className="w-full gap-1" asChild>
          <Link to="/contact?topic=pilot">
            Start a pilot <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Button>
        <Button size="sm" variant="ghost" className="w-full" asChild>
          <Link to="/login">Sign in</Link>
        </Button>
      </div>
    </div>
  );
}

interface MobileItem {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  href: string;
}

function MobileGroup({ label, items, onPick }: { label: string; items: MobileItem[]; onPick: () => void }) {
  return (
    <div className="space-y-1">
      <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">{label}</div>
      {items.map((item) => (
        <Link
          key={item.title}
          to={item.href}
          onClick={onPick}
          className="flex items-center gap-2 py-2 text-sm text-foreground hover:text-primary transition-colors"
        >
          <item.icon className="h-4 w-4 text-primary" />
          {item.title}
        </Link>
      ))}
    </div>
  );
}
