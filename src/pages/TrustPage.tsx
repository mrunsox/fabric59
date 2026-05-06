import { Link } from "react-router-dom";
import { ArrowLeft, Shield, Lock, Eye, Server, FileText, Mail, CheckCircle2, Clock } from "lucide-react";
import { Fabric59Icon } from "@/components/brand/Fabric59Icon";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SEOHead } from "@/components/seo/SEOHead";

const COMPLIANCE_EMAIL = "security@fabric59.com";

const controls = [
  { label: "Role-based access control (RBAC)", done: true },
  { label: "Immutable audit logging", done: true },
  { label: "Encrypted backups with point-in-time recovery", done: true },
  { label: "Change management via version-controlled migrations", done: true },
  { label: "Dependency vulnerability scanning", done: true },
  { label: "Row-level security (RLS) on all tenant data", done: true },
  { label: "Penetration testing (periodic)", done: false },
  { label: "Formal incident response plan", done: false },
];

export default function TrustPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        title="Trust Center — Fabric59"
        description="Fabric59 Trust Center: current security posture, AES-256 credential vault, Postgres RLS isolation, audit-grade compliance export. SOC 2 not yet pursued."
        canonical="https://fabric59.com/trust"
        ogTitle="Fabric59 Trust Center"
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
          <h1 className="text-3xl font-bold">Trust Center</h1>
        </div>

        <p className="text-muted-foreground mb-4 leading-relaxed">
          Fabric59 follows baseline security controls: AES-256 credential encryption (pgcrypto), Postgres Row-Level Security with SECURITY DEFINER role checks, role-based access control, and immutable audit logging with a server-side compliance export.
        </p>
        <p className="text-muted-foreground mb-10 leading-relaxed">
          We do <strong>not</strong> currently claim SOC 2, ISO 27001, or any third-party certification. Formal certifications will be pursued as the business matures, and this page will be updated when status changes.
        </p>

        {/* Compliance Status */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4">Certification Status</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Card className="border-border/40 bg-card/50">
              <CardContent className="p-5 flex items-start gap-3">
                <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">SOC 2 Type II</span>
                    <Badge variant="outline" className="text-xs"><Clock className="h-3 w-3 mr-1" />Not pursued yet</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">No SOC 2 audit is in progress today. We will announce on this page when an engagement begins.</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/40 bg-card/50">
              <CardContent className="p-5 flex items-start gap-3">
                <Lock className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm">ISO 27001</span>
                    <Badge variant="outline" className="text-xs"><Clock className="h-3 w-3 mr-1" />Not pursued yet</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">No ISO 27001 engagement is active. Current controls follow the spirit of the framework but are not certified.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Existing Controls */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4">Security Controls</h2>
          <div className="space-y-2">
            {controls.map((c) => (
              <div key={c.label} className="flex items-center gap-3 text-sm">
                <CheckCircle2 className={`h-4 w-4 shrink-0 ${c.done ? "text-primary" : "text-muted-foreground/40"}`} />
                <span className={c.done ? "text-foreground" : "text-muted-foreground"}>{c.label}</span>
                {!c.done && <Badge variant="secondary" className="text-xs ml-auto">Planned</Badge>}
              </div>
            ))}
          </div>
        </section>

        {/* Data Handling */}
        <section className="mb-12 space-y-3">
          <h2 className="text-xl font-semibold">Data Handling</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card className="border-border/40 bg-card/50">
              <CardContent className="p-5">
                <Server className="h-5 w-5 text-primary mb-2" />
                <h3 className="text-sm font-semibold mb-1">Data Locations</h3>
                <p className="text-xs text-muted-foreground">Primary infrastructure hosted in the United States. CDN edge nodes distributed globally for performance.</p>
              </CardContent>
            </Card>
            <Card className="border-border/40 bg-card/50">
              <CardContent className="p-5">
                <Eye className="h-5 w-5 text-primary mb-2" />
                <h3 className="text-sm font-semibold mb-1">Retention</h3>
                <p className="text-xs text-muted-foreground">Active data retained while account is active. Audit logs and archives retained per compliance requirements. Deletion within 30 days of request.</p>
              </CardContent>
            </Card>
            <Card className="border-border/40 bg-card/50">
              <CardContent className="p-5">
                <Lock className="h-5 w-5 text-primary mb-2" />
                <h3 className="text-sm font-semibold mb-1">Immutable Archives</h3>
                <p className="text-xs text-muted-foreground">Audit trails are stored in append-only, tamper-resistant storage to support regulatory and compliance requirements.</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Quick Links */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4">Security & Privacy</h2>
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              { label: "Security", href: "/security", icon: Shield },
              { label: "Privacy Policy", href: "/privacy", icon: FileText },
              { label: "Terms of Service", href: "/terms", icon: FileText },
            ].map((link) => (
              <Link key={link.href} to={link.href} className="flex items-center gap-2 text-sm text-primary hover:underline p-3 rounded-md border border-border/40 bg-card/50 hover:bg-muted/30 transition-colors">
                <link.icon className="h-4 w-4" />
                {link.label}
              </Link>
            ))}
          </div>
        </section>

        {/* Due Diligence */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Due Diligence Requests</h2>
          <p className="text-muted-foreground leading-relaxed">
            If you are a customer, partner, or regulator and need additional documentation to complete a due diligence questionnaire (DDQ), security assessment, or compliance review, please contact us at{" "}
            <a href={`mailto:${COMPLIANCE_EMAIL}`} className="text-primary hover:underline">{COMPLIANCE_EMAIL}</a>.
            We are happy to provide additional detail on our security architecture, data handling practices, and compliance controls.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            For security vulnerability reports, please visit our{" "}
            <Link to="/responsible-disclosure" className="text-primary hover:underline">Responsible Disclosure</Link> page.
          </p>
        </section>
      </div>
    </div>
  );
}
