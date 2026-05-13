import { Link } from "react-router-dom";
import { Fabric59Icon } from "@/components/brand/Fabric59Icon";
import { Mail, Heart } from "lucide-react";

const productLinks = [
  { label: "Solutions", href: "/solutions" },
  { label: "Personas", href: "/personas" },
  { label: "Pricing", href: "/pricing" },
  { label: "Integrations", href: "/integrations" },
  { label: "Customers", href: "/customers" },
];

const resourceLinks = [
  { label: "Pilot guide", href: "/contact?topic=pilot-guide" },
  { label: "Intake playbook", href: "/contact?topic=intake-playbook" },
  { label: "Five9 + CRM blueprint", href: "/contact?topic=five9-crm-blueprint" },
  { label: "Docs", href: "/contact?topic=docs" },
  { label: "Contact", href: "/contact" },
];

const companyLinks = [
  { label: "Trust", href: "/trust" },
  { label: "Security", href: "/security" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Responsible Disclosure", href: "/responsible-disclosure" },
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
              Five9-native operational intelligence connecting telephony to CRM, workflow, QA, and downstream service systems.
            </p>
            <a
              href="mailto:hi@fabric59.com"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
            >
              <Mail className="h-4 w-4" /> hi@fabric59.com
            </a>
          </div>

          {/* Product */}
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

          {/* Resources */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">Resources</h4>
            <nav className="flex flex-col gap-2.5">
              {resourceLinks.map((link) => (
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

          {/* Trust */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">Trust</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Credentials encrypted at rest. Tenants isolated by Postgres row-level security. Full audit trail. Founder-led pilots.
            </p>
            <Link
              to="/trust"
              className="text-xs text-primary hover:underline inline-block mt-3"
            >
              Read the trust overview →
            </Link>
          </div>
        </div>

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
