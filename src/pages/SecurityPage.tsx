import { Link } from "react-router-dom";
import { ArrowLeft, Shield, Lock, Server, Eye, Users, Key, Globe, AlertTriangle, Mail } from "lucide-react";
import { Fabric59Icon } from "@/components/brand/Fabric59Icon";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SEOHead } from "@/components/seo/SEOHead";

const COMPLIANCE_EMAIL = "security@fabric59.com";

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        title="Security — Fabric59"
        description="Learn how Fabric59 protects your data with multi-tenant isolation, AES-256 encryption, RBAC, audit logging, and enterprise-grade infrastructure."
        canonical="https://fabric59.lovable.app/security"
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
          <h1 className="text-3xl font-bold">Security</h1>
        </div>

        <p className="text-muted-foreground mb-10 leading-relaxed">
          Security is foundational to Fabric59. We implement industry best practices to protect your data, credentials, and integrations across every layer of the platform.
        </p>

        {/* Architecture & Data Protection */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" /> Architecture & Data Protection
          </h2>
          <div className="space-y-4">
            <Card className="border-border/40 bg-card/50">
              <CardContent className="p-6 space-y-3">
                <h3 className="font-semibold">Multi-Tenant Isolation</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Fabric59 uses a shared-infrastructure, logically-isolated multi-tenant architecture. Row-level security (RLS) policies enforce strict data boundaries at the database level, ensuring that each organization can only access its own data. Tenant context is validated on every query.
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/40 bg-card/50">
              <CardContent className="p-6 space-y-3">
                <h3 className="font-semibold">Encryption</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  All data is encrypted at rest using AES-256 and in transit using TLS 1.3. API credentials and secrets are stored using envelope encryption with rotating keys managed by our infrastructure provider.
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/40 bg-card/50">
              <CardContent className="p-6 space-y-3">
                <h3 className="font-semibold">Backups & Disaster Recovery</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Automated daily backups with point-in-time recovery. Infrastructure is hosted on enterprise-grade cloud with automatic failover, DDoS protection, and geographic redundancy.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Access Control & Audit */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" /> Access Control & Audit
          </h2>
          <div className="space-y-4">
            <Card className="border-border/40 bg-card/50">
              <CardContent className="p-6 space-y-3">
                <h3 className="font-semibold">Role-Based Access Control (RBAC)</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Fine-grained, permission-based access control with support for organization owners, admins, members, and viewers. Least-privilege principles are enforced across all operations, with granular permissions for sensitive actions.
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/40 bg-card/50">
              <CardContent className="p-6 space-y-3">
                <h3 className="font-semibold">Audit Logging</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Every significant action is logged with full audit trails, including agent provisioning, configuration changes, data access events, and integration operations. Logs are immutable and tamper-resistant, stored in append-only archives.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Enterprise Features */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" /> Enterprise Features
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { label: "SSO / SAML", status: "Coming Soon" },
              { label: "SCIM Provisioning", status: "Coming Soon" },
              { label: "IP Allow-Listing", status: "Coming Soon" },
              { label: "API Access Tokens", status: "Available" },
            ].map((f) => (
              <Card key={f.label} className="border-border/40 bg-card/50">
                <CardContent className="p-4 flex items-center justify-between">
                  <span className="text-sm font-medium">{f.label}</span>
                  <Badge variant={f.status === "Available" ? "default" : "secondary"} className="text-xs">
                    {f.status}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Incident Response */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" /> Incident Response
          </h2>
          <Card className="border-border/40 bg-card/50">
            <CardContent className="p-6 space-y-3">
              <p className="text-sm text-muted-foreground leading-relaxed">
                If you believe you have discovered a security vulnerability or experienced a security incident involving Fabric59, please report it immediately to{" "}
                <a
                  href={`mailto:${COMPLIANCE_EMAIL}?subject=${encodeURIComponent("[Security Incident] Fabric59")}`}
                  className="text-primary hover:underline"
                >
                  {COMPLIANCE_EMAIL}
                </a>.
              </p>
              <div className="text-sm text-muted-foreground space-y-1">
                <p><strong className="text-foreground">Acknowledgement:</strong> We will acknowledge receipt within 2 business days.</p>
                <p><strong className="text-foreground">Investigation:</strong> Our security team will investigate and assess the impact.</p>
                <p><strong className="text-foreground">Communication:</strong> We will keep you informed of our findings and remediation steps.</p>
                <p><strong className="text-foreground">Disclosure:</strong> We follow coordinated disclosure practices. See our{" "}
                  <Link to="/responsible-disclosure" className="text-primary hover:underline">Responsible Disclosure</Link> policy.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Compliance */}
        <section className="space-y-4 mb-12">
          <h2 className="text-xl font-semibold">Compliance</h2>
          <p className="text-muted-foreground leading-relaxed">
            We are actively working toward SOC 2 Type II certification. Our platform follows OWASP security guidelines and undergoes regular security assessments. For more details on our compliance posture, visit our{" "}
            <Link to="/trust" className="text-primary hover:underline">Trust Center</Link>.
          </p>
        </section>

        {/* Report */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Report a Vulnerability</h2>
          <p className="text-muted-foreground leading-relaxed">
            If you discover a security vulnerability, please contact us at{" "}
            <a href={`mailto:${COMPLIANCE_EMAIL}`} className="text-primary hover:underline">{COMPLIANCE_EMAIL}</a>.
            We take all reports seriously and will respond within 24 hours. See our{" "}
            <Link to="/responsible-disclosure" className="text-primary hover:underline">Responsible Disclosure</Link> policy for full details.
          </p>
        </section>
      </div>
    </div>
  );
}
