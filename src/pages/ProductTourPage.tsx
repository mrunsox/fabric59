import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Users, GitBranch, Bot, Megaphone, Scale, CheckCircle2 } from "lucide-react";
import { SEOHead } from "@/components/seo/SEOHead";
import { MegaMenuHeader } from "@/components/marketing/MegaMenuHeader";
import { MegaFooter } from "@/components/marketing/MegaFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const sections = [
  {
    id: "agents",
    icon: Users,
    badge: "Agent Lifecycle",
    title: "Provision agents in under a minute",
    body: "Type the agent's name once. Fabric59 fans the request out to Five9, Google Workspace, and Slack in parallel, then emails secured credentials. Offboarding follows the same pattern in reverse, with a configurable grace period and Drive ownership transfer.",
    bullets: [
      "Single form, three platforms",
      "Auto-generated credentials, sent securely",
      "Immutable audit log of every step",
    ],
  },
  {
    id: "mappings",
    icon: GitBranch,
    badge: "Field Mapping",
    title: "Visual CRM field mapping",
    body: "Drag a Five9 field to a CRM destination. Add a transformation if you need formatting, normalization, or concatenation. Validate against sample data, then publish. No code, no waiting for engineering.",
    bullets: [
      "Drag-and-drop canvas",
      "Live Five9 schema fetch",
      "Reusable templates per CRM",
    ],
  },
  {
    id: "callflow",
    icon: Bot,
    badge: "AI Call Flow Builder",
    title: "Design call flows by chatting",
    body: "Describe the flow in plain English. The AI generates the structure, branches, and integration triggers. Test it inside the interactive simulator with realistic Five9 events before going live.",
    bullets: [
      "Chat-driven flow generation",
      "Interactive simulator with mock calls",
      "One-click publish to Five9",
    ],
  },
  {
    id: "campaigns",
    icon: Megaphone,
    badge: "Campaign Setup",
    title: "Stand up a campaign from one form",
    body: "A single intake form drives the entire provisioning sequence: create the inbound campaign, generate skills and profiles, attach DNIS, configure dispositions, and wire dispatch emails. The 40-item checklist tracks every step.",
    bullets: [
      "Multi-department campaigns",
      "Per-disposition email routing",
      "Auto-saved drafts at every stage",
    ],
  },
  {
    id: "legal",
    icon: Scale,
    badge: "Legal Connect",
    title: "Deep Clio and MyCase integration",
    body: "Pre-call ANI lookup matches contacts and resolves matters before the agent says hello. Disposition outcomes drive CRM writebacks under a policy engine that enforces field-level allow, block, and redact rules per campaign.",
    bullets: [
      "Pre-call contact and matter resolution",
      "Disposition to CRM action mapping",
      "Policy engine with field-level rules",
    ],
  },
];

export default function ProductTourPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        title="Product Tour | Fabric59"
        description="Walk through Fabric59 capabilities, from agent provisioning and CRM field mapping to AI call flow design and Legal Connect."
        canonical="https://fabric59.lovable.app/product"
      />

      <MegaMenuHeader />

      <main>
        <section className="py-20 text-center max-w-3xl mx-auto px-6">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            See Fabric59 end to end
          </h1>
          <p className="text-muted-foreground text-lg mb-6">
            A guided walkthrough of every major capability. Jump to any section, then start a free trial.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {sections.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="text-xs px-3 py-1.5 rounded-full bg-muted/50 border border-border hover:border-primary/40 hover:text-primary transition-colors"
              >
                {s.badge}
              </a>
            ))}
          </div>
        </section>

        <div className="max-w-5xl mx-auto px-6 pb-20 space-y-16">
          {sections.map((s, i) => (
            <motion.section
              key={s.id}
              id={s.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="grid md:grid-cols-2 gap-10 items-center scroll-mt-24"
            >
              <div className={i % 2 === 1 ? "md:order-2" : ""}>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3">
                  <s.icon className="h-3.5 w-3.5" /> {s.badge}
                </div>
                <h2 className="text-3xl font-bold mb-3">{s.title}</h2>
                <p className="text-muted-foreground mb-4 leading-relaxed">{s.body}</p>
                <ul className="space-y-2">
                  {s.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <Card className={i % 2 === 1 ? "md:order-1" : ""}>
                <CardContent className="p-8 aspect-video flex items-center justify-center bg-gradient-to-br from-primary/5 to-accent/5">
                  <s.icon className="h-20 w-20 text-primary/30" />
                </CardContent>
              </Card>
            </motion.section>
          ))}
        </div>

        <section className="py-16 text-center bg-muted/30">
          <h2 className="text-3xl font-bold mb-3">Ready to try it?</h2>
          <p className="text-muted-foreground mb-6">Start a free trial in two minutes.</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button size="lg" asChild>
              <Link to="/signup">Start Free Trial <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/demo">Try the Demo Sandbox</Link>
            </Button>
          </div>
        </section>
      </main>

      <MegaFooter />
    </div>
  );
}
