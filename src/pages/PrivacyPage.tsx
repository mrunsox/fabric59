import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Fabric59Icon } from "@/components/brand/Fabric59Icon";
import { SEOHead } from "@/components/seo/SEOHead";

const PRODUCT_NAME = "Fabric59";
const COMPLIANCE_EMAIL = "security@fabric59.com";
const LAST_UPDATED = "April 10, 2026";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        title="Privacy Policy | Fabric59"
        description="Learn how Fabric59 collects, uses, and protects your data. Our privacy policy covers data handling, retention, GDPR, and your rights."
        canonical="https://fabric59.lovable.app/privacy"
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
          <h1 className="text-3xl font-bold">Privacy Policy</h1>
        </div>

        <p className="text-muted-foreground mb-10">Last updated: {LAST_UPDATED}</p>

        <div className="prose prose-sm max-w-none space-y-8">
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              {PRODUCT_NAME} ("we", "us", or "our") operates a B2B SaaS integration platform for contact centers and BPOs. This Privacy Policy describes how we collect, use, store, and protect information when you use our platform, website, and related services (collectively, the "Service"). By using the Service, you acknowledge this policy.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">2. Data We Collect</h2>
            <h3 className="text-base font-semibold text-foreground">2.1 Account Data</h3>
            <p className="text-muted-foreground leading-relaxed">
              When you create an account, we collect your name, email address, organization name, role, and any other information you provide during registration or onboarding.
            </p>
            <h3 className="text-base font-semibold text-foreground">2.2 Product Usage Data</h3>
            <p className="text-muted-foreground leading-relaxed">
              We collect information about how you interact with the Service, including features used, pages visited, actions taken (e.g., provisioning agents, creating campaigns), and timestamps.
            </p>
            <h3 className="text-base font-semibold text-foreground">2.3 Logs and Telemetry</h3>
            <p className="text-muted-foreground leading-relaxed">
              We automatically collect server logs, API request/response metadata, error reports, IP addresses, browser type, and device information for security monitoring and service improvement.
            </p>
            <h3 className="text-base font-semibold text-foreground">2.4 Support Data</h3>
            <p className="text-muted-foreground leading-relaxed">
              When you contact us for support, we may collect additional information you provide in your communications, including screenshots, configuration details, and system identifiers.
            </p>
            <h3 className="text-base font-semibold text-foreground">2.5 Integration Data</h3>
            <p className="text-muted-foreground leading-relaxed">
              When you connect third-party services (e.g., Five9, CRMs, Slack), we process data exchanged between those services and {PRODUCT_NAME} on your behalf. We act as a data processor for this information.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">3. How We Use Data</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong className="text-foreground">Service delivery:</strong> To provide, operate, and maintain the Service, including processing integrations, provisioning agents, and executing automations.</li>
              <li><strong className="text-foreground">Security:</strong> To detect, prevent, and respond to fraud, abuse, security incidents, and technical issues.</li>
              <li><strong className="text-foreground">Analytics:</strong> To understand usage patterns, improve the Service, and develop new features.</li>
              <li><strong className="text-foreground">Communications:</strong> To send transactional emails (e.g., account verification, security alerts) and, with your consent, product updates or marketing communications.</li>
              <li><strong className="text-foreground">Legal compliance:</strong> To comply with applicable laws, regulations, and legal processes.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">4. Data Retention and Deletion</h2>
            <p className="text-muted-foreground leading-relaxed">
              We retain your data for as long as your account is active or as needed to provide the Service. When you request account deletion, we will remove or anonymize your personal data within 30 days, except where retention is required for legal, regulatory, or legitimate business purposes (e.g., audit logs, billing records).
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Certain data may be archived in immutable storage for compliance and legal reasons. Archived data is retained for the minimum period required by applicable law or regulation. <span className="text-primary">[PLACEHOLDER: Specify exact retention periods after legal review]</span>
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">5. Data Subject Rights</h2>
            <p className="text-muted-foreground leading-relaxed">
              Depending on your jurisdiction, you may have the right to access, correct, delete, or port your personal data, as well as the right to object to or restrict certain processing activities. To exercise any of these rights, please contact us at{" "}
              <a href={`mailto:${COMPLIANCE_EMAIL}`} className="text-primary hover:underline">{COMPLIANCE_EMAIL}</a>.
              We will respond to verified requests within the timeframes required by applicable law (typically 30 days).
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">6. Subprocessors and Data Locations</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use third-party service providers ("subprocessors") to help us operate and deliver the Service. All subprocessors are bound by data processing agreements that require them to protect your data consistent with this policy.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-border rounded-md">
                <thead>
                  <tr className="bg-muted/30">
                    <th className="text-left p-3 text-foreground font-semibold">Provider</th>
                    <th className="text-left p-3 text-foreground font-semibold">Purpose</th>
                    <th className="text-left p-3 text-foreground font-semibold">Location</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-t border-border"><td className="p-3">Supabase (Backend)</td><td className="p-3">Database, authentication, storage</td><td className="p-3">United States</td></tr>
                  <tr className="border-t border-border"><td className="p-3">Vercel / Lovable</td><td className="p-3">Hosting, edge functions</td><td className="p-3">United States / Global CDN</td></tr>
                  <tr className="border-t border-border"><td className="p-3">Five9</td><td className="p-3">Contact center integration</td><td className="p-3">United States</td></tr>
                  <tr className="border-t border-border"><td className="p-3 text-primary">[Additional subprocessors]</td><td className="p-3 text-primary">[PLACEHOLDER]</td><td className="p-3 text-primary">[PLACEHOLDER]</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">7. Region-Specific Disclosures</h2>
            <h3 className="text-base font-semibold text-foreground">7.1 United States</h3>
            <p className="text-muted-foreground leading-relaxed">
              If you are a resident of California, you may have additional rights under the California Consumer Privacy Act (CCPA), including the right to know what personal information we collect, to delete it, and to opt out of its sale. We do not sell personal information. To exercise your rights, contact{" "}
              <a href={`mailto:${COMPLIANCE_EMAIL}`} className="text-primary hover:underline">{COMPLIANCE_EMAIL}</a>.
            </p>
            <h3 className="text-base font-semibold text-foreground">7.2 Canada</h3>
            <p className="text-muted-foreground leading-relaxed">
              We comply with the Personal Information Protection and Electronic Documents Act (PIPEDA) and applicable provincial privacy legislation. Canadian users may contact our privacy office to exercise rights under Canadian law.
            </p>
            <h3 className="text-base font-semibold text-foreground">7.3 European Economic Area (EEA) / GDPR</h3>
            <p className="text-muted-foreground leading-relaxed">
              If you are located in the EEA, we process your data under lawful bases including contract performance, legitimate interest, and consent. You have the right to lodge a complaint with your local supervisory authority. For cross-border data transfers, we rely on Standard Contractual Clauses (SCCs) or other approved mechanisms. <span className="text-primary">[PLACEHOLDER: Update with specific transfer mechanisms and DPA details after legal review]</span>
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">8. Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We implement industry-standard technical and organizational measures to protect your data, including encryption at rest (AES-256) and in transit (TLS 1.3), access controls, and regular security assessments. For more details, see our{" "}
              <Link to="/security" className="text-primary hover:underline">Security page</Link>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">9. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of material changes by posting a notice on our website or by email. Your continued use of the Service after changes take effect constitutes acceptance of the revised policy.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">10. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us at{" "}
              <a href={`mailto:${COMPLIANCE_EMAIL}`} className="text-primary hover:underline">{COMPLIANCE_EMAIL}</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
