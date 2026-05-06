import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Phone, Users, Zap, CheckCircle2, PlayCircle, Building2, GitBranch } from "lucide-react";
import { SEOHead } from "@/components/seo/SEOHead";
import { MegaMenuHeader } from "@/components/marketing/MegaMenuHeader";
import { MegaFooter } from "@/components/marketing/MegaFooter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const steps = [
  {
    icon: Building2,
    title: "Connect a Five9 domain",
    detail: "Click Add Domain, paste demo credentials, click Test Connection. The mock connector returns 'Connected' instantly.",
    fakeUi: (
      <div className="space-y-3">
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Add Five9 Domain</div>
        <div className="space-y-2">
          <div className="h-9 rounded-md border border-border bg-muted/30 px-3 flex items-center text-xs">main-call-center</div>
          <div className="h-9 rounded-md border border-border bg-muted/30 px-3 flex items-center text-xs">admin@demo.com</div>
          <div className="h-9 rounded-md border border-border bg-muted/30 px-3 flex items-center text-xs">••••••••</div>
        </div>
        <div className="flex items-center gap-2 text-xs text-success">
          <CheckCircle2 className="h-3.5 w-3.5" /> Connection successful
        </div>
      </div>
    ),
  },
  {
    icon: Users,
    title: "Provision an agent",
    detail: "One form. Five9 user, Google account, and Slack invite happen in parallel. Watch the workflow stepper light up green.",
    fakeUi: (
      <div className="space-y-3">
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Provisioning agent: Sarah K.</div>
        {["Create Five9 user", "Create Google account", "Invite to Slack", "Email credentials"].map((label, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.4 }}
            className="flex items-center gap-3 text-xs"
          >
            <CheckCircle2 className="h-4 w-4 text-success" />
            <span>{label}</span>
          </motion.div>
        ))}
      </div>
    ),
  },
  {
    icon: GitBranch,
    title: "Map a CRM field",
    detail: "Drag the Five9 caller_phone field to the Clio contact phone field. Add a phone-normalize transform. Save.",
    fakeUi: (
      <div className="space-y-3">
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Field Mapping</div>
        <div className="grid grid-cols-2 gap-3 items-center">
          <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs">caller_phone</div>
          <div className="rounded-md border border-accent/30 bg-accent/5 px-3 py-2 text-xs">contact.phone</div>
        </div>
        <div className="text-xs text-muted-foreground">Transform: phone-normalize (E.164)</div>
      </div>
    ),
  },
  {
    icon: Phone,
    title: "Simulate a call",
    detail: "Trigger a mock inbound call. The pre-call lookup hits Clio, returns a matched contact, and the screen-pop fires.",
    fakeUi: (
      <div className="space-y-3">
        <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Live Call</div>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between"><span className="text-muted-foreground">ANI</span><span className="font-mono">+1 555 0123</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Match</span><span className="text-success">John Doe (Clio)</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Matter</span><span>#2847 Active</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Status</span><span className="text-primary">Connected</span></div>
        </div>
      </div>
    ),
  },
];

export default function DemoSandboxPage() {
  const [step, setStep] = useState(0);
  const current = steps[step];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        title="Interactive Demo | Fabric59"
        description="Try Fabric59 with no signup. Walk through a fake provisioning, mapping, and call flow in a read-only sandbox."
        canonical="https://fabric59.com/demo"
      />

      <MegaMenuHeader />

      <main className="max-w-6xl mx-auto px-6 py-16">
        <header className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4">
            <PlayCircle className="h-3.5 w-3.5" /> Interactive Demo (no signup needed)
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight mb-3">See Fabric59 in action</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Click through a guided demo of the four core workflows. Nothing is saved. No data leaves this page.
          </p>
        </header>

        <div className="grid md:grid-cols-[260px_1fr] gap-8">
          <aside className="space-y-2">
            {steps.map((s, i) => (
              <button
                key={s.title}
                onClick={() => setStep(i)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  i === step
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border bg-card hover:border-primary/30"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      i === step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {i + 1}
                  </div>
                  <s.icon className={`h-4 w-4 ${i === step ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <p className={`text-xs font-medium ${i === step ? "text-foreground" : "text-muted-foreground"}`}>{s.title}</p>
              </button>
            ))}
          </aside>

          <div className="space-y-4">
            <Card className="p-6 min-h-[320px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <current.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold">{current.title}</h2>
                      <p className="text-sm text-muted-foreground">{current.detail}</p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/20 p-4">
                    {current.fakeUi}
                  </div>
                </motion.div>
              </AnimatePresence>
            </Card>

            <div className="flex justify-between items-center">
              <Button variant="outline" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
                Previous
              </Button>
              {step < steps.length - 1 ? (
                <Button onClick={() => setStep((s) => s + 1)}>
                  Next <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              ) : (
                <Button asChild>
                  <Link to="/signup">Start Free Trial <ArrowRight className="ml-1.5 h-4 w-4" /></Link>
                </Button>
              )}
            </div>

            <Card className="p-4 bg-muted/20 border-dashed">
              <div className="flex items-start gap-3">
                <Zap className="h-4 w-4 text-primary mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  This is a read-only sandbox. The real platform writes to your Five9 domain, your CRM, and your Slack workspace.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </main>

      <MegaFooter />
    </div>
  );
}
