import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Briefcase, Scale, Wrench, CheckCircle2 } from "lucide-react";

const personas = [
  {
    id: "bpo",
    icon: Briefcase,
    label: "BPO",
    headline: "Manage hundreds of agents across many clients",
    body: "Stand up new client domains in minutes. Provision and offboard agents at scale. Roll up billing across every account.",
    bullets: [
      "Multi-tenant dashboard",
      "Bulk agent provisioning",
      "Per-client billing rollups",
      "Branded credential emails",
    ],
  },
  {
    id: "legal",
    icon: Scale,
    label: "Legal Intake",
    headline: "Convert callers into matters with zero data entry",
    body: "Pre-call ANI lookup matches contacts in Clio or MyCase. Disposition outcomes write back to the right matter automatically.",
    bullets: [
      "Clio and MyCase deep integration",
      "Pre-call screen pop with matter context",
      "Disposition driven CRM writebacks",
      "Field level policy engine",
    ],
  },
  {
    id: "home",
    icon: Wrench,
    label: "Home Services",
    headline: "Book jobs without leaving the call",
    body: "Connect Five9 to Workiz, Jobber, Housecall Pro, or QuoteIQ. Schedule appointments, dispatch techs, and capture payments from inside the script.",
    bullets: [
      "Workiz, Jobber, Housecall Pro connectors",
      "In-call scheduling",
      "Disposition driven dispatch",
      "Branded SMS confirmations",
    ],
  },
];

export function PersonaTabs() {
  const [active, setActive] = useState(personas[0].id);
  const current = personas.find((p) => p.id === active)!;

  return (
    <section className="py-20 max-w-6xl mx-auto px-6">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="text-center mb-8"
      >
        <h2 className="text-3xl font-bold mb-3">Built for your industry</h2>
        <p className="text-muted-foreground">Pick your role to see what changes.</p>
      </motion.div>

      <div className="flex justify-center gap-2 mb-10 flex-wrap">
        {personas.map((p) => (
          <button
            key={p.id}
            onClick={() => setActive(p.id)}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all ${
              active === p.id
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-muted/40 text-muted-foreground hover:bg-muted/70"
            }`}
          >
            <p.icon className="h-4 w-4" />
            {p.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-8 md:p-10 min-h-[260px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="grid md:grid-cols-2 gap-8 items-center"
          >
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3">
                <current.icon className="h-3.5 w-3.5" /> {current.label}
              </div>
              <h3 className="text-2xl font-bold mb-3">{current.headline}</h3>
              <p className="text-muted-foreground leading-relaxed">{current.body}</p>
            </div>
            <ul className="space-y-3">
              {current.bullets.map((b) => (
                <li key={b} className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm text-foreground">{b}</span>
                </li>
              ))}
            </ul>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}
