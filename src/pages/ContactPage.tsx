import { Link } from "react-router-dom";
import { ArrowLeft, Mail, Shield, Scale, Building2, MessageSquare } from "lucide-react";
import { Fabric59Icon } from "@/components/brand/Fabric59Icon";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SEOHead } from "@/components/seo/SEOHead";

const COMPLIANCE_EMAIL = "security@fabric59.com";
const GENERAL_EMAIL = "hi@fabric59.com";

const contacts = [
  {
    icon: Shield,
    title: "Security & Privacy",
    description: "Report vulnerabilities, request data deletion, or ask about our security practices.",
    email: COMPLIANCE_EMAIL,
    subject: "[Security Inquiry] Fabric59",
  },
  {
    icon: Scale,
    title: "Compliance & Due Diligence",
    description: "Request compliance documentation, DDQ completion, or regulatory information.",
    email: COMPLIANCE_EMAIL,
    subject: "[Compliance Inquiry] Fabric59",
  },
  {
    icon: Building2,
    title: "Partnerships & Sales",
    description: "Inquire about Fabric59 for your organization, request a demo, or discuss partnership opportunities.",
    email: GENERAL_EMAIL,
    subject: "[Partnership Inquiry] Fabric59",
  },
  {
    icon: MessageSquare,
    title: "General Support",
    description: "Get help with your account, report a bug, or ask a question about the platform.",
    email: GENERAL_EMAIL,
    subject: "[Support] Fabric59",
  },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        title="Contact | Fabric59"
        description="Get in touch with Fabric59 for security, compliance, partnership, or support inquiries."
        canonical="https://fabric59.com/contact"
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
          <h1 className="text-3xl font-bold">Contact Us</h1>
        </div>

        <p className="text-muted-foreground mb-10 leading-relaxed">
          Whether you have a security concern, compliance question, or just want to learn more about Fabric59, we are here to help.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 mb-12">
          {contacts.map((c) => (
            <Card key={c.title} className="border-border/40 bg-card/50">
              <CardContent className="p-6 flex flex-col h-full">
                <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center mb-4">
                  <c.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">{c.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4 flex-1">{c.description}</p>
                <Button variant="outline" size="sm" asChild className="w-fit gap-2">
                  <a href={`mailto:${c.email}?subject=${encodeURIComponent(c.subject)}`}>
                    <Mail className="h-3.5 w-3.5" />
                    {c.email}
                  </a>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Data Protection Officer</h2>
          <p className="text-muted-foreground leading-relaxed">
            For data protection inquiries, data subject access requests, or to contact our Data Protection Officer, please email{" "}
            <a href={`mailto:${COMPLIANCE_EMAIL}?subject=${encodeURIComponent("[DPO Request] Fabric59")}`} className="text-primary hover:underline">{COMPLIANCE_EMAIL}</a>.
            We will respond to all inquiries within 2 business days.
          </p>
        </section>
      </div>
    </div>
  );
}
