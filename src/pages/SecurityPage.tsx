import { Link } from "react-router-dom";
import { ArrowLeft, Shield, Lock, Server, Eye } from "lucide-react";
import { Fabric59Icon } from "@/components/brand/Fabric59Icon";
import { Card, CardContent } from "@/components/ui/card";

const securityFeatures = [
  {
    icon: Lock,
    title: "Encryption at Rest & in Transit",
    description:
      "All data is encrypted using AES-256 at rest and TLS 1.3 in transit. API credentials are stored using envelope encryption with rotating keys.",
  },
  {
    icon: Server,
    title: "Infrastructure Security",
    description:
      "Hosted on enterprise-grade cloud infrastructure with automatic failover, DDoS protection, and isolated tenant environments.",
  },
  {
    icon: Shield,
    title: "Access Control",
    description:
      "Role-based access control (RBAC) with organization-level data isolation. Row-level security policies enforce strict data boundaries.",
  },
  {
    icon: Eye,
    title: "Audit Logging",
    description:
      "Every action is logged with full audit trails. Immutable logs track agent provisioning, data access, and configuration changes.",
  },
];

export default function SecurityPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
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
          Security is foundational to Fabric59. We implement industry best practices to protect your
          data, credentials, and integrations.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 mb-12">
          {securityFeatures.map((f) => (
            <Card key={f.title} className="border-border/40 bg-card/50">
              <CardContent className="p-6">
                <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <section className="space-y-4 mb-12">
          <h2 className="text-xl font-semibold">Compliance</h2>
          <p className="text-muted-foreground leading-relaxed">
            We are actively working toward SOC 2 Type II certification. Our platform follows OWASP
            security guidelines and undergoes regular penetration testing.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Report a Vulnerability</h2>
          <p className="text-muted-foreground leading-relaxed">
            If you discover a security vulnerability, please contact us at{" "}
            <a href="mailto:hi@fabric59.com" className="text-primary hover:underline">
              hi@fabric59.com
            </a>
            . We take all reports seriously and will respond within 24 hours.
          </p>
        </section>
      </div>
    </div>
  );
}
