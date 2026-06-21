import { Link } from "react-router-dom";
import { Mail, Heart } from "lucide-react";
import { Fabric59Icon } from "@/components/brand/Fabric59Icon";
import { MARKETING_NAV } from "@/config/canonicalNav";

/**
 * Phase 4 — Canonical marketing footer.
 *
 * Four-column tighter grid on lg+, collapses cleanly on tablet/mobile.
 * Hairline dividers and small-caps headers align with the Brain workspace
 * footer treatment without transplanting the app shell.
 */

const RESOURCE_LINKS = [
  { label: "Pilot guide", href: "/contact?topic=pilot-guide" },
  { label: "Intake playbook", href: "/contact?topic=intake-playbook" },
  { label: "Five9 + CRM blueprint", href: "/contact?topic=five9-crm-blueprint" },
  { label: "Contact", href: "/contact" },
];

const COMPANY_LINKS = [
  { label: "Trust", href: "/trust" },
  { label: "Security", href: "/security" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Responsible Disclosure", href: "/responsible-disclosure" },
];

function ColHeader({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground mb-4">
      {children}
    </h4>
  );
}

export function CanonicalMarketingFooter() {
  return (
    <footer className="border-t border-border/40 bg-background pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-10 mb-14">
          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-5 flex flex-col gap-4 max-w-md">
            <div className="flex items-center gap-2.5">
              <Fabric59Icon size="sm" />
              <span className="text-base font-extrabold tracking-tight text-foreground">
                Fabric59
              </span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              The multi-tenant guided call workspace for outsourced answering and
              virtual receptionist providers. Business Brain — the governed
              knowledge layer inside Fabric59 — gives your agents the right answer
              for every client. Five9-native. Multi-vertical.
            </p>
            <a
              href="mailto:hi@fabric59.com"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
            >
              <Mail className="h-4 w-4" /> hi@fabric59.com
            </a>
          </div>

          <div className="lg:col-span-2">
            <ColHeader>Product</ColHeader>
            <nav className="flex flex-col gap-2.5">
              {MARKETING_NAV.map((item) => (
                <Link
                  key={item.key}
                  to={item.to}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="lg:col-span-2">
            <ColHeader>Resources</ColHeader>
            <nav className="flex flex-col gap-2.5">
              {RESOURCE_LINKS.map((link) => (
                <Link
                  key={link.label}
                  to={link.href}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="lg:col-span-3">
            <ColHeader>Company</ColHeader>
            <nav className="flex flex-col gap-2.5">
              {COMPANY_LINKS.map((link) => (
                <Link
                  key={link.label}
                  to={link.href}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        <div className="border-t border-border/40 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Fabric59. All rights reserved.
          </span>
          <span className="text-xs text-muted-foreground flex items-center gap-1.5">
            An UNSOX Digital Solution
            <a
              href="https://unsox.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex"
            >
              <Heart
                className="h-3.5 w-3.5 text-orange-500 hover:scale-125 transition-transform"
                fill="currentColor"
              />
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
