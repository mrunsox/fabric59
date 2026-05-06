import { useState } from "react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Mail, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Fabric59Icon } from "@/components/brand/Fabric59Icon";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { SEOHead } from "@/components/seo/SEOHead";
import { MegaMenuHeader } from "@/components/marketing/MegaMenuHeader";
import { MegaFooter } from "@/components/marketing/MegaFooter";
import { useToast } from "@/hooks/use-toast";

const COMPLIANCE_EMAIL = "security@fabric59.com";
const GENERAL_EMAIL = "hi@fabric59.com";

// Block obvious free-mail / disposable domains for "work email"
const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "live.com",
  "icloud.com", "aol.com", "proton.me", "protonmail.com", "msn.com",
  "mail.com", "gmx.com", "yandex.com", "yandex.ru", "zoho.com",
]);

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your full name").max(120),
  workEmail: z
    .string()
    .trim()
    .email("Enter a valid email address")
    .max(255)
    .refine(
      (v) => {
        const domain = v.split("@")[1]?.toLowerCase();
        return !!domain && !FREE_EMAIL_DOMAINS.has(domain);
      },
      { message: "Please use your work email (not a personal address)" },
    ),
  company: z.string().trim().min(2, "Company name is required").max(160),
  role: z.string().trim().max(120).optional().or(z.literal("")),
  five9Status: z.enum(["live", "implementing", "evaluating", "none"], {
    required_error: "Please select a Five9 status",
  }),
  currentCrm: z.string().trim().max(120).optional().or(z.literal("")),
  teamSize: z.enum(["1-10", "11-50", "51-200", "200+"], {
    required_error: "Please pick a team size",
  }),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
  honeypot: z.string().max(0, "Spam detected").optional().or(z.literal("")),
});

type FormState = {
  name: string;
  workEmail: string;
  company: string;
  role: string;
  five9Status: string;
  currentCrm: string;
  teamSize: string;
  message: string;
  honeypot: string;
};

const initialState: FormState = {
  name: "",
  workEmail: "",
  company: "",
  role: "",
  five9Status: "",
  currentCrm: "",
  teamSize: "",
  message: "",
  honeypot: "",
};

export default function ContactPage() {
  const { toast } = useToast();
  const [form, setForm] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof FormState, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FormState;
        if (!fieldErrors[key]) fieldErrors[key] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    // Honeypot triggered — silently succeed
    if (parsed.data.honeypot) {
      setSubmitted(true);
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("walkthrough_requests").insert({
        name: parsed.data.name,
        work_email: parsed.data.workEmail,
        company: parsed.data.company,
        role: parsed.data.role || null,
        five9_status: parsed.data.five9Status,
        current_crm: parsed.data.currentCrm || null,
        team_size: parsed.data.teamSize,
        message: parsed.data.message || null,
        source_url: typeof window !== "undefined" ? window.location.href : null,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      });

      if (error) throw error;

      setSubmitted(true);
      setForm(initialState);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Please try again or email us directly.";
      toast({
        title: "Could not send your request",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        title="Request a Walkthrough | Fabric59"
        description="Book a founder-led walkthrough of Fabric59 — the Five9-native control plane and legal-intake bridge."
        canonical="https://fabric59.com/contact"
      />

      <MegaMenuHeader />

      <main className="max-w-5xl mx-auto px-6 py-16">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <div className="grid lg:grid-cols-[1fr,360px] gap-10 items-start">
          {/* Form column */}
          <div>
            <Badge variant="secondary" className="mb-4 border border-primary/30 bg-primary/10 text-primary">
              Request a walkthrough
            </Badge>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
              Let’s scope your Five9 program
            </h1>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Tell us a bit about your stack and we’ll set up a 45-minute live walkthrough of Fabric59 against your Five9 + CRM environment. Founder-led, no sales tower.
            </p>

            {submitted ? (
              <Card className="border-success/40 bg-success/5">
                <CardContent className="p-8 text-center">
                  <div className="mx-auto h-12 w-12 rounded-full bg-success/10 flex items-center justify-center mb-4">
                    <CheckCircle2 className="h-6 w-6 text-success" />
                  </div>
                  <h2 className="text-xl font-semibold mb-2">Got it — we’ll be in touch</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                    Your request is in. Expect a reply within one business day. If it’s urgent, email us directly at{" "}
                    <a href={`mailto:${GENERAL_EMAIL}`} className="text-primary hover:underline">{GENERAL_EMAIL}</a>.
                  </p>
                  <Button variant="outline" onClick={() => setSubmitted(false)}>
                    Send another request
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <form onSubmit={onSubmit} className="space-y-5" noValidate>
                {/* Honeypot (hidden from real users) */}
                <div className="hidden" aria-hidden="true">
                  <Label htmlFor="company_website">Leave this empty</Label>
                  <Input
                    id="company_website"
                    name="company_website"
                    tabIndex={-1}
                    autoComplete="off"
                    value={form.honeypot}
                    onChange={(e) => setField("honeypot", e.target.value)}
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                  <Field
                    label="Full name"
                    required
                    error={errors.name}
                    htmlFor="name"
                  >
                    <Input
                      id="name"
                      autoComplete="name"
                      value={form.name}
                      onChange={(e) => setField("name", e.target.value)}
                      maxLength={120}
                    />
                  </Field>
                  <Field
                    label="Work email"
                    required
                    error={errors.workEmail}
                    htmlFor="workEmail"
                  >
                    <Input
                      id="workEmail"
                      type="email"
                      autoComplete="email"
                      value={form.workEmail}
                      onChange={(e) => setField("workEmail", e.target.value)}
                      maxLength={255}
                    />
                  </Field>
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                  <Field
                    label="Company"
                    required
                    error={errors.company}
                    htmlFor="company"
                  >
                    <Input
                      id="company"
                      autoComplete="organization"
                      value={form.company}
                      onChange={(e) => setField("company", e.target.value)}
                      maxLength={160}
                    />
                  </Field>
                  <Field
                    label="Your role"
                    error={errors.role}
                    htmlFor="role"
                  >
                    <Input
                      id="role"
                      placeholder="e.g. VP Operations"
                      value={form.role}
                      onChange={(e) => setField("role", e.target.value)}
                      maxLength={120}
                    />
                  </Field>
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                  <Field
                    label="Where are you with Five9?"
                    required
                    error={errors.five9Status}
                    htmlFor="five9Status"
                  >
                    <Select
                      value={form.five9Status}
                      onValueChange={(v) => setField("five9Status", v)}
                    >
                      <SelectTrigger id="five9Status">
                        <SelectValue placeholder="Select…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="live">Live in production</SelectItem>
                        <SelectItem value="implementing">Currently implementing</SelectItem>
                        <SelectItem value="evaluating">Evaluating Five9</SelectItem>
                        <SelectItem value="none">Not on Five9 yet</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field
                    label="Team size"
                    required
                    error={errors.teamSize}
                    htmlFor="teamSize"
                  >
                    <Select
                      value={form.teamSize}
                      onValueChange={(v) => setField("teamSize", v)}
                    >
                      <SelectTrigger id="teamSize">
                        <SelectValue placeholder="Select…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1-10">1–10 agents</SelectItem>
                        <SelectItem value="11-50">11–50 agents</SelectItem>
                        <SelectItem value="51-200">51–200 agents</SelectItem>
                        <SelectItem value="200+">200+ agents</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>

                <Field
                  label="Current CRM (if any)"
                  error={errors.currentCrm}
                  htmlFor="currentCrm"
                >
                  <Input
                    id="currentCrm"
                    placeholder="e.g. MyCase, Clio, Salesforce"
                    value={form.currentCrm}
                    onChange={(e) => setField("currentCrm", e.target.value)}
                    maxLength={120}
                  />
                </Field>

                <Field
                  label="What would you like to see or solve?"
                  error={errors.message}
                  htmlFor="message"
                >
                  <Textarea
                    id="message"
                    rows={5}
                    placeholder="A few sentences on your current Five9 + CRM workflow and what you’d like to fix."
                    value={form.message}
                    onChange={(e) => setField("message", e.target.value)}
                    maxLength={2000}
                  />
                </Field>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                  <p className="text-xs text-muted-foreground">
                    By submitting, you agree to our{" "}
                    <Link to="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>.
                  </p>
                  <Button type="submit" size="lg" disabled={submitting} className="gap-2">
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Sending…
                      </>
                    ) : (
                      <>
                        Request walkthrough <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>

          {/* Side column */}
          <aside className="space-y-4 lg:sticky lg:top-24">
            <Card className="border-border/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Fabric59Icon size="sm" />
                  <span className="text-sm font-semibold">What to expect</span>
                </div>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    Reply within one business day
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    45-minute live walkthrough on Zoom
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    Only what’s shipped — roadmap items clearly labeled
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    Founder-led, no SDR follow-up sequences
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-muted/30">
              <CardContent className="p-5 space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Prefer email?
                </div>
                <a
                  href={`mailto:${GENERAL_EMAIL}?subject=${encodeURIComponent("[Walkthrough] Fabric59")}`}
                  className="flex items-center gap-2 text-sm text-foreground hover:text-primary"
                >
                  <Mail className="h-4 w-4" /> {GENERAL_EMAIL}
                </a>
                <a
                  href={`mailto:${COMPLIANCE_EMAIL}?subject=${encodeURIComponent("[Security] Fabric59")}`}
                  className="flex items-center gap-2 text-sm text-foreground hover:text-primary"
                >
                  <Shield className="h-4 w-4" /> {COMPLIANCE_EMAIL}
                </a>
                <p className="text-xs text-muted-foreground">
                  For data subject requests or vulnerability reports, use the security inbox.
                </p>
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>

      <MegaFooter />
    </div>
  );
}

interface FieldProps {
  label: string;
  required?: boolean;
  error?: string;
  htmlFor: string;
  children: React.ReactNode;
}

function Field({ label, required, error, htmlFor, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-sm">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
