import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { PhoneIncoming, PhoneOutgoing, PhoneCall, ClipboardCheck, ArrowRight } from "lucide-react";

const SOLUTIONS = [
  {
    icon: PhoneIncoming,
    title: "Inbound intake",
    pitch: "ANI lookup, screen pop, decision-tree guides, CRM writeback by disposition.",
    pieces: ["Pre-call ANI lookup", "Native guide builder", "Outcome → CRM dispatch"],
  },
  {
    icon: PhoneCall,
    title: "Callback orchestration",
    pitch: "Wait-time thresholds promote queue callers into outbound callbacks automatically.",
    pieces: ["Callback queue page", "Abandon rate engine", "ANI block list"],
  },
  {
    icon: PhoneOutgoing,
    title: "Outbound + reactivation",
    pitch: "Intake-driven campaign orchestration with reverse-engineering of existing campaigns and post-call automation.",
    pieces: ["Campaign orchestration", "Workflow automation", "CRM sync"],
  },
  {
    icon: ClipboardCheck,
    title: "QA + analytics",
    pitch: "Workspace-scoped review queue, KPI overview, top dispositions, drilldowns.",
    pieces: ["Canonical /analytics", "Canonical /qa review queue", "Honest billing shell"],
  },
];

export default function SolutionsPage() {
  return (
    <MarketingLayout
      title="Fabric59 Solutions | Five9 intake, callback, outbound, QA"
      description="Solutions for inbound intake, callback orchestration, outbound campaigns, and QA — all built on the canonical Fabric59 workspace model."
    >
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto text-center mb-14">
          <Badge variant="outline" className="border-primary/40 text-primary mb-4">
            Solutions
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            Real workflows, not theme-park demos
          </h1>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto">
            Each solution maps directly onto a canonical workspace surface that is already shipped —
            no slides, no fake screens.
          </p>
        </div>

        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-6">
          {SOLUTIONS.map((s) => (
            <Card key={s.title}>
              <CardContent className="p-6 space-y-3">
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
                  <s.icon className="h-5 w-5 text-primary" />
                </div>
                <h2 className="text-lg font-semibold">{s.title}</h2>
                <p className="text-sm text-muted-foreground">{s.pitch}</p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {s.pieces.map((p) => (
                    <Badge key={p} variant="secondary" className="text-[11px]">{p}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="max-w-3xl mx-auto mt-14 text-center space-y-3">
          <Button asChild className="gap-1.5">
            <Link to="/contact">
              Walk through it with us <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
          <p className="text-xs text-muted-foreground">
            Already a customer? <Link to="/app/workspaces" className="text-primary hover:underline">Open your workspace</Link>.
          </p>
        </div>
      </section>
    </MarketingLayout>
  );
}
