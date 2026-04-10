import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UserCog, GitBranch, Scale, Megaphone, Bot, BarChart3,
  Check, ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const tabs = [
  {
    id: "lifecycle",
    icon: UserCog,
    label: "Agent Lifecycle",
    headline: "Provision agents in under 60 seconds",
    description: "One-click provisioning across Five9, Google Workspace, and Slack. Automated credential generation, secure delivery, and full audit trails. Deprovisioning with configurable grace periods and data transfer workflows.",
    bullets: [
      "Simultaneous Five9 + Google + Slack provisioning",
      "Auto-generated credentials with secure delivery",
      "Configurable grace periods for offboarding",
      "Complete audit trail for compliance",
    ],
    mockupGradient: "from-primary/20 to-accent/10",
  },
  {
    id: "mapping",
    icon: GitBranch,
    label: "Field Mapping",
    headline: "Visual drag-and-drop CRM mapping",
    description: "Connect Five9 contact fields to any CRM with a visual canvas builder. Support for Clio, Workiz, Salesforce, HubSpot, and more with custom transformation logic including date formatting, string concatenation, and conditional mapping.",
    bullets: [
      "Drag-and-drop mapping canvas",
      "Custom transform functions",
      "Support for 10+ CRM providers",
      "Real-time validation & preview",
    ],
    mockupGradient: "from-accent/20 to-primary/10",
  },
  {
    id: "legal",
    icon: Scale,
    label: "Legal Connect",
    headline: "Clio & MyCase, Fully Automated",
    description: "Automated contact resolution, matter linking, and disposition-driven CRM writebacks. Policy engine with field-level allow/block/redact rules. Webhook sync with retry logic and dead-letter handling.",
    bullets: [
      "Automated Clio/MyCase contact lookup",
      "Disposition → CRM action mapping",
      "Field-level policy engine (allow/block/redact)",
      "Webhook sync with retry & dead-letter",
    ],
    mockupGradient: "from-purple-500/20 to-primary/10",
  },
  {
    id: "campaigns",
    icon: Megaphone,
    label: "Campaigns",
    headline: "Multi-department campaign automation",
    description: "Build and launch multi-department campaigns from a single intake form. Per-disposition email routing, decision tree scripting with conditional branching and skip/jump logic, and auto-provisioning of campaigns, skills, profiles, and DNIS directly in Five9.",
    bullets: [
      "Single intake form → full campaign setup",
      "Per-department IVR routing & decision trees",
      "Auto-provision campaigns in Five9 via SOAP API",
      "Blueprint system for repeatable launches",
    ],
    mockupGradient: "from-orange-500/20 to-accent/10",
  },
  {
    id: "callflow",
    icon: Bot,
    label: "AI Call Flow",
    headline: "Chat-driven call flow design",
    description: "Design call flows through a chat-driven interface powered by AI. Describe your requirements in plain language and the system generates a complete configuration. Test with an interactive step-through simulator.",
    bullets: [
      "AI-powered flow generation from plain language",
      "Pre-built templates for legal, home services, healthcare",
      "Interactive step-through simulator",
      "Export to Five9-compatible format",
    ],
    mockupGradient: "from-blue-500/20 to-purple-500/10",
  },
  {
    id: "reporting",
    icon: BarChart3,
    label: "Reporting",
    headline: "Real-time monitoring & analytics",
    description: "Real-time API logs, error tracking, and E2E reconciliation tracing. Track every Five9 call from webhook to CRM writeback. Scheduled reports with configurable delivery and advanced filtering.",
    bullets: [
      "E2E call tracing (Five9 → Fabric59 → CRM)",
      "Real-time API log monitoring",
      "Scheduled report delivery",
      "Error alerting with Slack/Teams/Email",
    ],
    mockupGradient: "from-emerald-500/20 to-primary/10",
  },
];

export function FeatureTabs() {
  const [activeTab, setActiveTab] = useState("lifecycle");
  const active = tabs.find((t) => t.id === activeTab)!;

  return (
    <section id="features" className="max-w-7xl mx-auto px-6 py-24">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-12"
      >
        <h2 className="text-3xl font-bold mb-3">Built for Five9 teams that move fast</h2>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Every feature designed to eliminate manual work and give your team superpowers.
        </p>
      </motion.div>

      {/* Tab bar */}
      <div className="flex flex-wrap justify-center gap-2 mb-12">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeTab === tab.id
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                : "bg-card border border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/30"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="grid lg:grid-cols-2 gap-12 items-center"
        >
          {/* Text */}
          <div>
            <h3 className="text-2xl font-bold mb-4">{active.headline}</h3>
            <p className="text-muted-foreground leading-relaxed mb-6">{active.description}</p>
            <ul className="space-y-3 mb-8">
              {active.bullets.map((bullet, i) => (
                <motion.li
                  key={bullet}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-start gap-2.5 text-sm"
                >
                  <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>{bullet}</span>
                </motion.li>
              ))}
            </ul>
            <Button className="gap-2" asChild>
              <Link to="/signup">
                Try it free <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          {/* Mockup area */}
          <div className={`aspect-[4/3] rounded-2xl bg-gradient-to-br ${active.mockupGradient} border border-border/30 flex items-center justify-center relative overflow-hidden`}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,hsl(var(--primary)/0.08),transparent_70%)]" />
            <div className="relative text-center p-8">
              <active.icon className="h-16 w-16 text-primary/40 mx-auto mb-4" />
              <div className="text-sm font-medium text-muted-foreground">{active.label} Dashboard</div>
              {/* Simulated UI elements */}
              <div className="mt-6 space-y-2 max-w-xs mx-auto">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-3 rounded-full bg-foreground/5" style={{ width: `${100 - n * 15}%` }} />
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
