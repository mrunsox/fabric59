import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Fabric59Logo } from "@/components/brand/Fabric59Logo";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  Users, GitBranch, Bot, Megaphone, Shield, Globe, Building2, Layers,
  Plug, Mail, BarChart3, Scale, ArrowRight, Menu, X, FileText,
  Calculator, CheckSquare, BookOpen, Lock, HelpCircle, ChevronRight,
  UserCog, GitFork, Star, Check, Briefcase, Phone, MessageSquare, Cloud
} from "lucide-react";

const platformItems = [
  { icon: UserCog, title: "Agent Lifecycle", desc: "One-click provisioning & deprovisioning across Five9, Google, Slack", href: "#features" },
  { icon: GitBranch, title: "CRM Field Mapping", desc: "Visual drag-and-drop builder with custom transforms", href: "#features" },
  { icon: Bot, title: "AI Call Flow Builder", desc: "Chat-driven call flow design with interactive simulator", href: "#features" },
  { icon: Megaphone, title: "Campaign Automation", desc: "Multi-department campaigns from a single intake form", href: "#features" },
  { icon: Scale, title: "Legal Connect", desc: "Clio & MyCase integration with matter linking & policy engine", href: "#legal-connect" },
  { icon: GitFork, title: "Decision Tree Scripting", desc: "Conditional branching with skip/jump logic & data gates", href: "#features" },
  { icon: Mail, title: "Disposition Engine", desc: "Per-disposition email routing with branded templates", href: "#features" },
  { icon: Globe, title: "Five9 Domain Management", desc: "Multi-domain credentials, IVR settings & connection testing", href: "#five9" },
];

const integrationCategories = [
  { label: "CRM", items: ["salesforce", "hubspot", "zendesk"] },
  { label: "Legal", items: ["docusign", "dropbox"] },
  { label: "Productivity", items: ["slack", "teams", "asana", "google-drive"] },
  { label: "Communication", items: ["twilio", "zoom", "calendly"] },
];

const resourceItems = [
  { icon: FileText, title: "Five9 Automation Playbook", desc: "Free PDF guide to Five9 optimization", badge: "PDF" },
  { icon: Calculator, title: "ROI Calculator", desc: "Calculate your automation savings", badge: "Interactive" },
  { icon: CheckSquare, title: "Migration Checklist", desc: "Step-by-step Five9 migration guide", badge: "PDF" },
];

const resourceLinks = [
  { icon: BookOpen, title: "Build Outline", href: "/outline" },
  { icon: Lock, title: "Security", href: "/security" },
  { icon: HelpCircle, title: "FAQ", href: "#faq" },
];

export function MegaMenuHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="border-b border-border/50 backdrop-blur-xl sticky top-0 z-50 bg-background/90">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3">
        <Link to="/">
          <Fabric59Logo iconSize="md" />
        </Link>

        {/* Desktop Nav */}
        <NavigationMenu className="hidden lg:flex">
          <NavigationMenuList className="gap-1">
            {/* Platform */}
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
                        <div>
                          <div className="text-sm font-medium text-foreground">{item.title}</div>
                          <div className="text-xs text-muted-foreground leading-relaxed">{item.desc}</div>
                        </div>
                      </a>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <a href="#features" className="text-xs text-primary hover:underline flex items-center gap-1">
                      Explore all features <ArrowRight className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>

            {/* Integrations */}
            <NavigationMenuItem>
              <NavigationMenuTrigger className="bg-transparent text-muted-foreground hover:text-foreground data-[state=open]:text-foreground text-sm">
                Integrations
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <div className="w-[560px] p-6">
                  <div className="flex gap-6">
                    <div className="w-36 space-y-3">
                      {integrationCategories.map((cat) => (
                        <div key={cat.label}>
                          <div className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">{cat.label}</div>
                          <div className="flex flex-wrap gap-2">
                            {cat.items.map((item) => (
                              <div key={item} className="h-8 w-8 rounded-md bg-muted/50 border border-border/50 flex items-center justify-center hover:border-primary/40 transition-colors">
                                <img src={`/integration-logos/${item}.svg`} alt={item} className="h-4 w-4" />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex-1 border-l border-border/50 pl-6">
                      <div className="text-sm font-semibold text-foreground mb-3">55+ Pre-Built Connectors</div>
                      <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                        Connect Five9 to Salesforce, HubSpot, Clio, Workiz, Slack, Teams, and dozens more. OAuth flows, field mapping, and real-time sync — all built in.
                      </p>
                      <div className="grid grid-cols-5 gap-2 mb-4">
                        {["slack", "teams", "hubspot", "salesforce", "stripe", "zoom", "google-drive", "openai", "quickbooks", "asana"].map((logo) => (
                          <div key={logo} className="h-10 w-10 rounded-lg bg-muted/30 border border-border/30 flex items-center justify-center hover:scale-110 transition-transform">
                            <img src={`/integration-logos/${logo}.svg`} alt={logo} className="h-5 w-5" />
                          </div>
                        ))}
                      </div>
                      <a href="#features" className="text-xs text-primary hover:underline flex items-center gap-1">
                        See all integrations <ArrowRight className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>

            {/* Resources */}
            <NavigationMenuItem>
              <NavigationMenuTrigger className="bg-transparent text-muted-foreground hover:text-foreground data-[state=open]:text-foreground text-sm">
                Resources
              </NavigationMenuTrigger>
              <NavigationMenuContent>
                <div className="w-[480px] p-6">
                  <div className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">Lead Magnets</div>
                  <div className="space-y-2 mb-4">
                    {resourceItems.map((item) => (
                      <div
                        key={item.title}
                        className="group flex items-start gap-3 rounded-lg p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                      >
                        <div className="h-9 w-9 rounded-md bg-accent/10 flex items-center justify-center shrink-0">
                          <item.icon className="h-4 w-4 text-accent" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground">{item.title}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">{item.badge}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">{item.desc}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-border/50 pt-3">
                    <div className="grid grid-cols-3 gap-2">
                      {resourceLinks.map((item) => (
                        <Link
                          key={item.title}
                          to={item.href}
                          className="flex items-center gap-2 rounded-lg p-2 hover:bg-muted/50 transition-colors text-sm text-muted-foreground hover:text-foreground"
                        >
                          <item.icon className="h-4 w-4" />
                          {item.title}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>

            {/* Pricing */}
            <NavigationMenuItem>
              <a
                href="#pricing"
                className="inline-flex h-10 items-center justify-center rounded-md px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Pricing
              </a>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

        {/* CTA */}
        <div className="hidden lg:flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/login">Sign In</Link>
          </Button>
          <Button size="sm" className="gap-1.5" asChild>
            <Link to="/signup">Get Started <ArrowRight className="h-3.5 w-3.5" /></Link>
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
                {platformItems.slice(0, 5).map((item) => (
                  <a key={item.title} href={item.href} onClick={() => setMobileOpen(false)} className="flex items-center gap-2 py-2 text-sm text-foreground hover:text-primary transition-colors">
                    <item.icon className="h-4 w-4 text-primary" />
                    {item.title}
                  </a>
                ))}
              </div>
              <div className="space-y-1">
                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Resources</div>
                {resourceLinks.map((item) => (
                  <Link key={item.title} to={item.href} onClick={() => setMobileOpen(false)} className="flex items-center gap-2 py-2 text-sm text-foreground hover:text-primary transition-colors">
                    <item.icon className="h-4 w-4" />
                    {item.title}
                  </Link>
                ))}
              </div>
              <a href="#pricing" onClick={() => setMobileOpen(false)} className="text-sm font-medium text-foreground">Pricing</a>
              <div className="space-y-2 pt-4 border-t border-border/50">
                <Button className="w-full" asChild>
                  <Link to="/signup" onClick={() => setMobileOpen(false)}>Get Started</Link>
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
