import { Link } from "react-router-dom";
import { ArrowLeft, Shield, CheckCircle2, XCircle, Mail } from "lucide-react";
import { Fabric59Icon } from "@/components/brand/Fabric59Icon";
import { Card, CardContent } from "@/components/ui/card";
import { SEOHead } from "@/components/seo/SEOHead";

const COMPLIANCE_EMAIL = "security@fabric59.com";

const inScope = [
  "Fabric59 web application (fabric59.lovable.app)",
  "Publicly accessible API endpoints",
  "Authentication and authorization flows",
  "Data exposure or leakage vulnerabilities",
  "Cross-site scripting (XSS), SQL injection, CSRF",
];

const outOfScope = [
  "Social engineering or phishing attacks against employees or users",
  "Denial-of-service (DoS/DDoS) attacks or any actions that impact service availability",
  "Physical security testing",
  "Third-party services or integrations not operated by Fabric59",
  "Automated scanning that generates excessive traffic",
];

export default function ResponsibleDisclosurePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        title="Responsible Disclosure — Fabric59"
        description="Fabric59 responsible disclosure policy. Report security vulnerabilities safely and responsibly."
        canonical="https://fabric59.lovable.app/responsible-disclosure"
      />
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Link>

        <div className="flex items-center gap-3 mb-4">
          <Fabric59Icon size="md" />
          <h1 className="text-3xl font-bold">Responsible Disclosure</h1>
        </div>

        <p className="text-muted-foreground mb-10 leading-relaxed">
          We take security seriously and welcome good-faith security research. If you believe you have found a vulnerability in Fabric59, we encourage you to report it responsibly.
        </p>

        <section className="space-y-3 mb-10">
          <h2 className="text-xl font-semibold">Policy Overview</h2>
          <p className="text-muted-foreground leading-relaxed">
            We are committed to working with security researchers to verify and address potential vulnerabilities. We ask that you act in good faith, avoid accessing or modifying other users' data, and give us a reasonable amount of time to address the issue before making any information public.
          </p>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 mb-10">
          <Card className="border-border/40 bg-card/50">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" /> In Scope
              </h3>
              <ul className="space-y-2">
                {inScope.map((item) => (
                  <li key={item} className="text-sm text-muted-foreground flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-border/40 bg-card/50">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <XCircle className="h-4 w-4 text-destructive" /> Out of Scope
              </h3>
              <ul className="space-y-2">
                {outOfScope.map((item) => (
                  <li key={item} className="text-sm text-muted-foreground flex items-start gap-2">
                    <XCircle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <section className="space-y-3 mb-10">
          <h2 className="text-xl font-semibold">How to Report</h2>
          <p className="text-muted-foreground leading-relaxed">
            Please email your findings to{" "}
            <a href={`mailto:${COMPLIANCE_EMAIL}?subject=${encodeURIComponent("[Vulnerability Report] Fabric59")}`} className="text-primary hover:underline">{COMPLIANCE_EMAIL}</a>.
            Include the following in your report:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1 text-sm">
            <li>A description of the vulnerability and its potential impact</li>
            <li>Steps to reproduce the issue</li>
            <li>Any relevant screenshots, logs, or proof-of-concept code</li>
            <li>Your preferred contact information for follow-up</li>
          </ul>
          <p className="text-muted-foreground leading-relaxed">
            We will acknowledge receipt within <strong className="text-foreground">2 business days</strong> and aim to provide a substantive response within <strong className="text-foreground">10 business days</strong>.
          </p>
        </section>

        <section className="space-y-3 mb-10">
          <h2 className="text-xl font-semibold">Safe Harbor</h2>
          <p className="text-muted-foreground leading-relaxed">
            We will not pursue legal action against individuals who report vulnerabilities in good faith and within the scope described above, provided that:
          </p>
          <ul className="list-disc pl-6 text-muted-foreground space-y-1 text-sm">
            <li>You do not access, modify, or delete data belonging to other users</li>
            <li>You do not degrade the availability or performance of the Service</li>
            <li>You comply with all applicable laws</li>
            <li>You allow us reasonable time to address the issue before any public disclosure</li>
          </ul>
          <p className="text-sm text-muted-foreground italic">
            This safe harbor statement is non-binding and subject to our review and applicable law.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Bug Bounty</h2>
          <p className="text-muted-foreground leading-relaxed">
            A formal bug bounty program may be introduced in the future. For now, we appreciate and acknowledge all good-faith security reports.
          </p>
        </section>
      </div>
    </div>
  );
}
