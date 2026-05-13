import { Link } from "react-router-dom";
import { Fabric59Icon } from "@/components/brand/Fabric59Icon";
import { Mail, Heart, Lock, Building2 } from "lucide-react";

// Canonical IA — Slice A (no /#anchor hrefs).
const productLinks = [
  { label: "Solutions", href: "/solutions" },
  { label: "Personas", href: "/personas" },
  { label: "Pricing", href: "/pricing" },
  { label: "Integrations", href: "/integrations" },
  { label: "Customers", href: "/customers" },
  { label: "Product overview", href: "/product" },
];

// Canonical capability categories — no vendor-feature inventory.
const platformLinks = [
  { label: "Workspace operations", href: "/product#workspace-operations" },
  { label: "Campaign orchestration", href: "/product#campaign-orchestration" },
  { label: "Guides and templates", href: "/product#guides-templates" },
  { label: "Integrations", href: "/integrations" },
  { label: "Analytics and QA", href: "/product#analytics-qa" },
  { label: "CRM sync and workflow automation", href: "/product#crm-sync" },
];

const companyLinks = [
  { label: "Trust", href: "/trust" },
  { label: "Security", href: "/security" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Responsible Disclosure", href: "/responsible-disclosure" },
  { label: "Contact", href: "/contact" },
];

export function MegaFooter() {
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
              The Five9-native control plane and legal-intake bridge for contact centers and law firms.
            </p>
            <a
              href="mailto:hi@fabric59.com"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
            >
              <Mail className="h-4 w-4" /> hi@fabric59.com
            </a>
          </div>

          {/* Product (canonical IA) */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">Product</h4>
            <nav className="flex flex-col gap-2.5">
              {productLinks.map((link) => (
                <Link key={link.label} to={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Platform highlights → all deep-link into the canonical product overview */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">Platform</h4>
            <nav className="grid grid-cols-1 gap-2.5">
              {platformLinks.map((link) => (
                <Link key={link.label} to={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">Company</h4>
            <nav className="flex flex-col gap-2.5">
              {companyLinks.map((link) => (
                <Link key={link.label} to={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors w-fit">
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Security posture */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">Security posture</h4>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
              Credentials encrypted at rest, tenants isolated by Postgres Row-Level Security, full audit trail.
            </p>
            <div className="flex flex-wrap gap-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 rounded-lg px-2.5 py-1.5">
                <Lock className="h-3.5 w-3.5 text-primary" />
                AES-256
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 rounded-lg px-2.5 py-1.5">
                <Building2 className="h-3.5 w-3.5 text-primary" />
                RLS
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground/70 mt-3 leading-relaxed">
              No SOC 2 claim today. Formal certifications will be pursued as the business matures.
            </p>
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
