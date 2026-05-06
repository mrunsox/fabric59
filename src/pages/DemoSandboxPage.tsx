import { useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
  ArrowRight, Calendar as CalendarIcon, Phone, Workflow, ShieldCheck,
  GitBranch, Scale, Building2, CheckCircle2, Clock, Video,
} from "lucide-react";
import { SEOHead } from "@/components/seo/SEOHead";
import { MegaMenuHeader } from "@/components/marketing/MegaMenuHeader";
import { MegaFooter } from "@/components/marketing/MegaFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ----- Walkthrough storyboard (mirrors the real demo) -----
const agenda = [
  {
    icon: CalendarIcon,
    minutes: "5 min",
    title: "Intros + scoping",
    desc: "Quick context on your Five9 footprint, CRM stack (MyCase, Clio, other), and the intake or campaign workflows you want to improve.",
  },
  {
    icon: Phone,
    minutes: "10 min",
    title: "Five9 control plane tour",
    desc: "Live walkthrough of multi-domain Five9 management, the unified five9-main edge function, ANI pre-call lookup, and 30+ SOAP actions hitting a real domain.",
  },
  {
    icon: Scale,
    minutes: "10 min",
    title: "Legal CRM bridge in action",
    desc: "We connect Five9 to MyCase (live API key intake) end-to-end. Clio adapter is shown in dry-run mode, with the OAuth activation step labeled Coming soon.",
  },
  {
    icon: GitBranch,
    minutes: "10 min",
    title: "Mapping + scripting deep dive",
    desc: "Drag-and-drop field mapping with a real Test runner against the tenant config, then a 22-node decision-tree script executed in the runtime simulator.",
  },
  {
    icon: Building2,
    minutes: "5 min",
    title: "Tenancy, RLS, and audit export",
    desc: "Org / Partner / Client config inheritance, Postgres RLS isolation, and a server-side compliance export bundle that auditors can actually use.",
  },
  {
    icon: Workflow,
    minutes: "5 min",
    title: "Tailored next steps",
    desc: "If it's a fit, we propose a rollout plan and scope. If it's not, we'll tell you straight — no follow-up sales sequence.",
  },
];

const focusOptions = [
  "Five9 SOAP / multi-domain",
  "MyCase integration",
  "Clio integration",
  "Field mapping + Test runner",
  "Decision-tree agent scripts",
  "Disposition email engine",
  "Multi-tenant ops + RLS",
  "Compliance / audit export",
] as const;

const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "live.com",
  "icloud.com", "aol.com", "proton.me", "protonmail.com", "msn.com",
]);

const demoSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(100),
    work_email: z
      .string()
      .trim()
      .email("Enter a valid email")
      .max(255)
      .refine((v) => {
        const domain = v.split("@")[1]?.toLowerCase();
        return domain && !FREE_EMAIL_DOMAINS.has(domain);
      }, "Please use your work email"),
    company: z.string().trim().min(1, "Company is required").max(120),
    role: z.string().trim().max(100).optional().or(z.literal("")),
    five9_status: z.string().min(1, "Pick one"),
    current_crm: z.string().min(1, "Pick one"),
    team_size: z.string().min(1, "Pick one"),
    timezone: z.string().min(1, "Pick a timezone"),
    focus_areas: z.array(z.string()).min(1, "Pick at least one focus area").max(focusOptions.length),
    slot_1: z.date({ required_error: "Pick a preferred day" }),
    slot_2: z.date().optional(),
    slot_3: z.date().optional(),
    notes: z.string().trim().max(1000).optional().or(z.literal("")),
    company_website: z.string().max(0).optional(), // honeypot
  })
  .refine((d) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d.slot_1 >= today;
  }, { message: "Pick a date today or later", path: ["slot_1"] });

type DemoForm = z.infer<typeof demoSchema>;

const TIMEZONES = [
  "America/Los_Angeles", "America/Denver", "America/Chicago", "America/New_York",
  "America/Toronto", "America/Sao_Paulo", "Europe/London", "Europe/Berlin",
  "Europe/Madrid", "Asia/Dubai", "Asia/Kolkata", "Asia/Singapore",
  "Asia/Tokyo", "Australia/Sydney", "Pacific/Auckland",
];

export default function DemoSandboxPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<DemoForm>({
    resolver: zodResolver(demoSchema),
    defaultValues: {
      name: "", work_email: "", company: "", role: "",
      five9_status: "", current_crm: "", team_size: "", timezone: "",
      focus_areas: [], notes: "", company_website: "",
    },
  });

  async function onSubmit(values: DemoForm) {
    if (values.company_website) {
      // Bot caught by honeypot — silently succeed.
      setSubmitted(true);
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("demo_requests").insert({
        name: values.name,
        work_email: values.work_email,
        company: values.company,
        role: values.role || null,
        five9_status: values.five9_status,
        current_crm: values.current_crm,
        team_size: values.team_size,
        timezone: values.timezone,
        focus_areas: values.focus_areas,
        slot_1: values.slot_1.toISOString(),
        slot_2: values.slot_2 ? values.slot_2.toISOString() : null,
        slot_3: values.slot_3 ? values.slot_3.toISOString() : null,
        notes: values.notes || null,
        source_url: typeof window !== "undefined" ? window.location.href : null,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      });
      if (error) throw error;
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      toast.error("Could not submit demo request. Please email hi@fabric59.com.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        title="Book a Live Demo — Fabric59"
        description="Founder-led, 45-minute live walkthrough of the real Fabric59 platform on a real Five9 domain. Tell us your stack and pick a few times — we confirm by email."
        canonical="https://fabric59.com/demo"
        ogTitle="Book a live Fabric59 walkthrough"
      />

      <MegaMenuHeader />

      <main className="max-w-5xl mx-auto px-6 py-20">
        <header className="text-center mb-12">
          <Badge variant="secondary" className="mb-4 border border-primary/30 bg-primary/10 text-primary">
            Live demo
          </Badge>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            A real walkthrough of the real product
          </h1>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl mx-auto">
            Founder-led, ~45 minutes, on Zoom. We drive a live Fabric59 environment connected to a Five9 domain and a legal CRM. Anything not yet shipped is labeled Coming soon out loud.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 mt-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-primary" /> ~45 minutes</span>
            <span className="flex items-center gap-1.5"><Video className="h-3.5 w-3.5 text-primary" /> Zoom (recording shared after)</span>
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-primary" /> Only shipped capabilities are demoed live</span>
          </div>
        </header>

        {/* Storyboard */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-6 text-center">What happens during the demo</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {agenda.map((step, i) => (
              <Card key={step.title} className="border-border/50">
                <CardContent className="p-5 flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <step.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-semibold text-sm">{i + 1}. {step.title}</h3>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{step.minutes}</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Form */}
        <section id="book" className="grid lg:grid-cols-[1fr_320px] gap-10 items-start scroll-mt-24">
          <Card className="border-border/50">
            <CardContent className="p-8">
              {submitted ? (
                <div className="text-center py-10">
                  <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 className="h-6 w-6 text-success" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Request received</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    We'll email you within one business day with a confirmed time and a Zoom link. If anything urgent, reach us at <a className="text-primary hover:underline" href="mailto:hi@fabric59.com">hi@fabric59.com</a>.
                  </p>
                  <Button asChild variant="outline">
                    <Link to="/product">Read the product tour <ArrowRight className="ml-2 h-4 w-4" /></Link>
                  </Button>
                </div>
              ) : (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold mb-1">Book your walkthrough</h2>
                      <p className="text-sm text-muted-foreground">Takes about 90 seconds. We confirm by email within one business day.</p>
                    </div>

                    {/* Honeypot */}
                    <div className="hidden" aria-hidden="true">
                      <Label htmlFor="company_website">Website</Label>
                      <Input id="company_website" tabIndex={-1} autoComplete="off" {...form.register("company_website")} />
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl><Input placeholder="Jane Doe" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="work_email" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Work email</FormLabel>
                          <FormControl><Input type="email" placeholder="jane@firm.com" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="company" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company</FormLabel>
                          <FormControl><Input placeholder="Acme Legal Intake" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="role" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Role <span className="text-muted-foreground">(optional)</span></FormLabel>
                          <FormControl><Input placeholder="Director of Operations" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    <div className="grid sm:grid-cols-3 gap-4">
                      <FormField control={form.control} name="five9_status" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Five9 status</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="live">Live on Five9</SelectItem>
                              <SelectItem value="evaluating">Evaluating Five9</SelectItem>
                              <SelectItem value="other">Other dialer</SelectItem>
                              <SelectItem value="none">No dialer yet</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="current_crm" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current CRM</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="mycase">MyCase</SelectItem>
                              <SelectItem value="clio">Clio</SelectItem>
                              <SelectItem value="other-legal">Other legal CRM</SelectItem>
                              <SelectItem value="non-legal">Non-legal CRM</SelectItem>
                              <SelectItem value="none">No CRM</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="team_size" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Team size</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="1-10">1–10 agents</SelectItem>
                              <SelectItem value="11-50">11–50 agents</SelectItem>
                              <SelectItem value="51-200">51–200 agents</SelectItem>
                              <SelectItem value="200+">200+ agents</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>

                    <FormField control={form.control} name="focus_areas" render={() => (
                      <FormItem>
                        <FormLabel>What should we focus on?</FormLabel>
                        <div className="grid sm:grid-cols-2 gap-2 mt-2">
                          {focusOptions.map((opt) => (
                            <FormField key={opt} control={form.control} name="focus_areas" render={({ field }) => {
                              const checked = field.value?.includes(opt);
                              return (
                                <label className={cn(
                                  "flex items-center gap-2 rounded-md border p-2.5 cursor-pointer text-sm transition-colors",
                                  checked ? "border-primary/50 bg-primary/5" : "border-border hover:border-border/80"
                                )}>
                                  <Checkbox
                                    checked={checked}
                                    onCheckedChange={(v) => {
                                      const next = v ? [...(field.value ?? []), opt] : (field.value ?? []).filter((x) => x !== opt);
                                      field.onChange(next);
                                    }}
                                  />
                                  <span>{opt}</span>
                                </label>
                              );
                            }} />
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="timezone" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your timezone</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Select timezone" /></SelectTrigger></FormControl>
                          <SelectContent className="max-h-72">
                            {TIMEZONES.map((tz) => <SelectItem key={tz} value={tz}>{tz.replace(/_/g, " ")}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <div>
                      <Label className="mb-2 block">Preferred days</Label>
                      <p className="text-xs text-muted-foreground mb-3">Pick up to three days that work for you. We'll reply with a confirmed time within business hours in your timezone.</p>
                      <div className="grid sm:grid-cols-3 gap-3">
                        {(["slot_1", "slot_2", "slot_3"] as const).map((name, i) => (
                          <FormField key={name} control={form.control} name={name} render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <FormLabel className="text-xs">{i === 0 ? "First choice" : i === 1 ? "Second choice (optional)" : "Third choice (optional)"}</FormLabel>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button variant="outline" className={cn("pl-3 text-left font-normal w-full", !field.value && "text-muted-foreground")}>
                                      {field.value ? format(field.value, "PP") : <span>Pick a day</span>}
                                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={field.value as Date | undefined}
                                    onSelect={field.onChange}
                                    disabled={(d) => {
                                      const today = new Date();
                                      today.setHours(0, 0, 0, 0);
                                      return d < today;
                                    }}
                                    initialFocus
                                    className={cn("p-3 pointer-events-auto")}
                                  />
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )} />
                        ))}
                      </div>
                    </div>

                    <FormField control={form.control} name="notes" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Anything else? <span className="text-muted-foreground">(optional)</span></FormLabel>
                        <FormControl>
                          <Textarea rows={4} placeholder="Specific use cases, integrations, or constraints we should know about." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <Button type="submit" size="lg" className="w-full gap-2" disabled={submitting}>
                      {submitting ? "Submitting…" : <>Request walkthrough <ArrowRight className="h-4 w-4" /></>}
                    </Button>
                    <p className="text-[11px] text-muted-foreground text-center">
                      By submitting, you agree we may email you to confirm a time. We do not subscribe you to a newsletter.
                    </p>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>

          <aside className="space-y-4">
            <Card className="border-border/50">
              <CardContent className="p-5">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">What we will show live</div>
                <ul className="space-y-2 text-sm">
                  {[
                    "Five9 SOAP actions on a real domain",
                    "MyCase intake via per-client API key",
                    "Field mapping Test runner (live execution)",
                    "Decision-tree script in the runtime simulator",
                    "Multi-tenant config inheritance + RLS",
                  ].map((s) => (
                    <li key={s} className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" /><span>{s}</span></li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card className="border-dashed border-border/60 bg-muted/20">
              <CardContent className="p-5">
                <div className="text-[10px] uppercase tracking-wider text-accent font-semibold mb-2">Shown as Coming soon</div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {[
                    "Clio OAuth activation",
                    "AI Call Flow → Five9 export",
                    "Disposition CRM writebacks",
                    "Google Workspace provisioning",
                    "Self-serve billing",
                  ].map((s) => <li key={s} className="flex items-start gap-2"><span className="text-accent mt-0.5">○</span><span>{s}</span></li>)}
                </ul>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-5 flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  No prerecorded sandboxes, no faked dashboards. Everything is driven from the real platform during the call.
                </p>
              </CardContent>
            </Card>
          </aside>
        </section>
      </main>

      <MegaFooter />
    </div>
  );
}
