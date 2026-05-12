import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { ArrowRight } from "lucide-react";

const STORIES = [
  {
    sector: "Legal intake",
    headline: "Design partner pilot — Five9 + MyCase",
    body:
      "First Fabric59 pilot landed live with MyCase via per-client API key. Intake agents work from canonical guides; outcomes route per disposition into the right matter, with telephony reconciliation against Five9 logs.",
    status: "Live pilot",
  },
  {
    sector: "BPO operations",
    headline: "Multi-client workspace separation on a shared Five9 domain",
    body:
      "Workspace-per-client isolation with RLS, per-tenant rate limits, tenant health, and a Supervisor / QA review queue replaced spreadsheet-driven client management.",
    status: "Phase 8 in production",
  },
  {
    sector: "Platform partner",
    headline: "Concierge onboarding + safe-mode rollout",
    body:
      "Design-partner flag, rollout_status enum, GA readiness checklist, feedback drawer, and What's New release notes coordinate every pilot from kickoff through go-live.",
    status: "Phase 5 Slice 4 + Phase 6 shipped",
  },
];

export default function CustomersPage() {
  return (
    <MarketingLayout
      title="Customer stories | Fabric59"
      description="How real teams are using Fabric59 today: legal intake on Five9, BPO multi-client operations, and platform partner pilots."
    >
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto text-center mb-14">
          <Badge variant="outline" className="border-primary/40 text-primary mb-4">
            Customers
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Real teams. Real workspaces. Real Five9.
          </h1>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto">
            Fabric59 is in active design-partner mode. We are intentionally not staging fake logos
            here. Stories below describe how the product is being used today.
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-4">
          {STORIES.map((s) => (
            <Card key={s.headline}>
              <CardContent className="p-6 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-[11px]">{s.sector}</Badge>
                  <Badge variant="outline" className="text-[11px] border-success/40 text-success">{s.status}</Badge>
                </div>
                <h2 className="text-lg font-semibold">{s.headline}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">{s.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12 space-y-3">
          <p className="text-sm text-muted-foreground">
            Want to be the next customer story?
          </p>
          <Button asChild className="gap-1.5">
            <Link to="/contact">
              Become a design partner <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </section>
    </MarketingLayout>
  );
}
