import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Fabric59Icon } from "@/components/brand/Fabric59Icon";

export default function TermsPage() {
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

        <div className="flex items-center gap-3 mb-8">
          <Fabric59Icon size="md" />
          <h1 className="text-3xl font-bold">Terms of Service</h1>
        </div>

        <div className="prose prose-invert prose-sm max-w-none space-y-6">
          <p className="text-muted-foreground">Last updated: February 21, 2026</p>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using Fabric59 ("the Platform"), you agree to be bound by these Terms of Service. 
              If you do not agree to these terms, you may not use the Platform.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">2. Description of Service</h2>
            <p className="text-muted-foreground leading-relaxed">
              Fabric59 provides integration and automation services for Five9 contact centers, including agent 
              lifecycle management, CRM field mapping, and third-party integrations. The Platform is operated 
              by UNSOX Digital.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">3. User Accounts</h2>
            <p className="text-muted-foreground leading-relaxed">
              You are responsible for maintaining the confidentiality of your account credentials and for all 
              activities that occur under your account. You must notify us immediately of any unauthorized use.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">4. Data Processing</h2>
            <p className="text-muted-foreground leading-relaxed">
              We process data on behalf of your organization in accordance with our Data Processing Agreement. 
              All data is encrypted at rest and in transit. We do not sell or share your data with third parties 
              except as required to provide the service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">5. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Platform is provided "as is" without warranties of any kind. In no event shall Fabric59 or 
              UNSOX Digital be liable for any indirect, incidental, or consequential damages arising from the 
              use of the Platform.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold">6. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about these terms, please contact us at{" "}
              <a href="mailto:hi@fabric59.com" className="text-primary hover:underline">
                hi@fabric59.com
              </a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
