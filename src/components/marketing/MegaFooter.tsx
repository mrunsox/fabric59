import { useState } from "react";
import { Link } from "react-router-dom";
import { Fabric59Icon } from "@/components/brand/Fabric59Icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Mail, Linkedin, Twitter, Heart, ArrowRight, Shield, UserCog,
  GitBranch, Bot, Megaphone, Scale, Globe, BarChart3, FileText,
  Calculator, CheckSquare, BookOpen, Lock, HelpCircle, Building2
} from "lucide-react";

const platformLinks = [
  { icon: UserCog, label: "Agent Lifecycle", href: "#features" },
  { icon: GitBranch, label: "Field Mapping", href: "#features" },
  { icon: Bot, label: "AI Call Flow", href: "#features" },
  { icon: Megaphone, label: "Campaigns", href: "#features" },
  { icon: Scale, label: "Legal Connect", href: "#legal-connect" },
  { icon: Globe, label: "Five9 Domains", href: "#five9" },
  { icon: BarChart3, label: "Reporting", href: "#features" },
];

const integrationLogos = ["salesforce", "hubspot", "slack", "teams", "zoom", "stripe"];

const resourceLinks = [
  { icon: FileText, label: "Five9 Playbook", badge: "PDF" },
  { icon: Calculator, label: "ROI Calculator", badge: "Free" },
  { icon: CheckSquare, label: "Migration Checklist", badge: "PDF" },
  { icon: BookOpen, label: "Build Outline", href: "/outline" },
  { icon: HelpCircle, label: "FAQ", href: "#faq" },
];

const companyLinks = [
  { label: "Security", href: "/security" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Trust", href: "/trust" },
  { label: "Responsible Disclosure", href: "/responsible-disclosure" },
  { label: "Contact", href: "/contact" },
];

export function MegaFooter() {
  const [email, setEmail] = useState("");

  return (
    <footer className="border-t border-border/30 bg-background pt-20 pb-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10 mb-16">
          {/* Brand */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <Fabric59Icon size="sm" />
              <span className="text-base font-extrabold tracking-tight text-foreground">Fabric59</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The all-in-one Five9 integration platform for BPOs and contact centers.
            </p>
            <div className="flex gap-3 mt-1">
              <a href="mailto:hi@fabric59.com" className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-colors text-muted-foreground">
                <Mail className="h-4 w-4" />
              </a>
              <a href="https://linkedin.com/company/fabric59" target="_blank" rel="noopener noreferrer" className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-colors text-muted-foreground">
                <Linkedin className="h-4 w-4" />
              </a>
              <a href="https://x.com/fabric59" target="_blank" rel="noopener noreferrer" className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-colors text-muted-foreground">
                <Twitter className="h-4 w-4" />
              </a>
            </div>
            {/* Newsletter */}
            <div className="mt-2">
              <div className="text-xs font-semibold text-foreground mb-2">Stay updated</div>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-8 text-xs bg-muted/30"
                />
                <Button size="sm" className="h-8 px-3">
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Platform */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">Platform</h4>
            <nav className="flex flex-col gap-2.5">
              {platformLinks.map((link) => (
                <a key={link.label} href={link.href} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
                  <link.icon className="h-3.5 w-3.5" />
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          {/* Integrations */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">Integrations</h4>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {integrationLogos.map((logo) => (
                <div key={logo} className="h-9 w-9 rounded-lg bg-muted/30 border border-border/30 flex items-center justify-center hover:border-primary/40 transition-colors">
                  <img src={`/integration-logos/${logo}.svg`} alt={logo} className="h-4 w-4" />
                </div>
              ))}
            </div>
            <a href="#features" className="text-xs text-primary hover:underline">
              55+ connectors →
            </a>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">Resources</h4>
            <nav className="flex flex-col gap-2.5">
              {resourceLinks.map((link) => (
                <div key={link.label} className="flex items-center gap-2">
                  {link.href ? (
                    <Link to={link.href} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                      <link.icon className="h-3.5 w-3.5" />
                      {link.label}
                    </Link>
                  ) : (
                    <span className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                      <link.icon className="h-3.5 w-3.5" />
                      {link.label}
                      {link.badge && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{link.badge}</span>}
                    </span>
                  )}
                </div>
              ))}
            </nav>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">Company</h4>
            <nav className="flex flex-col gap-2.5">
              {companyLinks.map((link) => (
                link.href.startsWith("mailto:") || link.href === "#" ? (
                  <a key={link.label} href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
                    {link.label}
                  </a>
                ) : (
                  <Link key={link.label} to={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
                    {link.label}
                  </Link>
                )
              ))}
            </nav>
            {/* Security badges */}
            <div className="mt-6 flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/30 rounded-lg px-2.5 py-1.5">
                <Shield className="h-3.5 w-3.5 text-primary" />
                SOC 2
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/30 rounded-lg px-2.5 py-1.5">
                <Lock className="h-3.5 w-3.5 text-primary" />
                AES-256
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border/30 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Fabric59. All rights reserved.
          </span>
          <span className="text-sm text-muted-foreground flex items-center gap-1.5">
            An UNSOX Digital Solution
            <a href="https://unsox.com" target="_blank" rel="noopener noreferrer" className="inline-flex">
              <Heart className="h-4 w-4 text-orange-500 animate-pulse hover:scale-125 transition-transform" fill="currentColor" />
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
