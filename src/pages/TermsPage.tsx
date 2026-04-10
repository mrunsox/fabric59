import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Fabric59Icon } from "@/components/brand/Fabric59Icon";
import { SEOHead } from "@/components/seo/SEOHead";

const PRODUCT_NAME = "Fabric59";
const COMPLIANCE_EMAIL = "security@fabric59.com";
const GENERAL_EMAIL = "hi@fabric59.com";
const LAST_UPDATED = "April 10, 2026";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        title="Terms of Service — Fabric59"
        description="Terms of service for Fabric59, the Five9 integration platform by UNSOX Digital."
        canonical="https://fabric59.lovable.app/terms"
      />
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

        <div className="prose prose-sm max-w-none space-y-8">
          <p className="text-muted-foreground">Last updated: {LAST_UPDATED}</p>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">1. Introduction and Parties</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms of Service ("Terms") constitute a legally binding agreement between you (the "Customer", "you", or "your") and {PRODUCT_NAME}, operated by UNSOX Digital ("we", "us", or "our"). These Terms govern your access to and use of the {PRODUCT_NAME} platform, including all associated services, APIs, integrations, and documentation (collectively, the "Service").
            </p>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using the Service, you agree to be bound by these Terms. If you are using the Service on behalf of an organization, you represent that you have the authority to bind that organization to these Terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">2. Eligibility and Permitted Use</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service is designed for business use (B2B) and is intended for organizations operating contact centers, BPOs, and related operations. By using the Service, you confirm that you are at least 18 years of age and have the legal capacity to enter into a binding agreement. The Service is not directed at or intended for individual consumers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">3. Account Responsibilities and Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must promptly notify us at{" "}
              <a href={`mailto:${COMPLIANCE_EMAIL}`} className="text-primary hover:underline">{COMPLIANCE_EMAIL}</a>{" "}
              of any unauthorized use or suspected security breach. We reserve the right to suspend or terminate accounts involved in unauthorized activity.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              You agree to provide accurate and complete information during registration and to keep your account information current.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">4. Service Availability and Limitations</h2>
            <p className="text-muted-foreground leading-relaxed">
              We strive to maintain high availability of the Service but do not guarantee uninterrupted or error-free operation. We may perform scheduled maintenance, deploy updates, or temporarily suspend access for security or operational reasons. We will make reasonable efforts to provide advance notice of planned downtime.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              The Service integrates with third-party platforms (e.g., Five9, CRMs, communication tools). We are not responsible for the availability, accuracy, or performance of third-party services.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">5. Fees and Billing</h2>
            <p className="text-muted-foreground leading-relaxed">
              Access to certain features of the Service may require a paid subscription. Fees are as described in your order form, invoice, or the pricing page at the time of purchase. All fees are non-refundable except as expressly stated in these Terms or required by applicable law.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              We reserve the right to modify pricing with 30 days' written notice. Continued use of the Service after a price change constitutes acceptance of the new pricing. <span className="text-primary">[PLACEHOLDER: Add specific billing terms, payment methods, and currency details after finalization]</span>
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">6. Prohibited Activities and Acceptable Use</h2>
            <p className="text-muted-foreground leading-relaxed">You agree not to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Use the Service for any unlawful purpose or in violation of any applicable law or regulation</li>
              <li>Attempt to gain unauthorized access to the Service, other accounts, or underlying systems</li>
              <li>Reverse engineer, decompile, or disassemble any part of the Service</li>
              <li>Interfere with or disrupt the integrity or performance of the Service</li>
              <li>Upload or transmit malicious code, viruses, or harmful data</li>
              <li>Use the Service to harass, abuse, or harm others</li>
              <li>Resell, sublicense, or redistribute the Service without our prior written consent</li>
              <li>Scrape, mine, or extract data from the Service beyond normal use</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">7. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              The Service, including all software, content, trademarks, and documentation, is owned by UNSOX Digital or its licensors and is protected by intellectual property laws. These Terms do not grant you any ownership rights in the Service.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              You retain ownership of all data you submit to the Service ("Customer Data"). You grant us a limited, non-exclusive license to process Customer Data solely to provide and improve the Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">8. Data Processing</h2>
            <p className="text-muted-foreground leading-relaxed">
              We process data on behalf of your organization in accordance with our{" "}
              <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>{" "}
              and any applicable Data Processing Agreement. All data is encrypted at rest and in transit. We do not sell or share your data with third parties except as required to provide the Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">9. Disclaimers</h2>
            <p className="text-muted-foreground leading-relaxed">
              THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, OR ERROR-FREE.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">10. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL {PRODUCT_NAME} OR UNSOX DIGITAL BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, REVENUE, DATA, OR BUSINESS OPPORTUNITIES, ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE, REGARDLESS OF THE THEORY OF LIABILITY.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              OUR TOTAL AGGREGATE LIABILITY FOR ALL CLAIMS ARISING OUT OF OR RELATED TO THESE TERMS OR THE SERVICE SHALL NOT EXCEED THE AMOUNTS PAID BY YOU TO US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM. <span className="text-primary">[PLACEHOLDER: Review liability cap with legal counsel]</span>
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">11. Termination</h2>
            <p className="text-muted-foreground leading-relaxed">
              Either party may terminate the agreement at any time with written notice. We may suspend or terminate your access immediately if you violate these Terms or if required by law. Upon termination, your right to use the Service ceases, and we may delete your data after a reasonable retention period, subject to our{" "}
              <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">12. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms shall be governed by and construed in accordance with the laws of <span className="text-primary">[PLACEHOLDER: Jurisdiction, e.g., the State of Delaware, United States]</span>, without regard to its conflict of law provisions. Any disputes shall be resolved in the courts of <span className="text-primary">[PLACEHOLDER: Venue]</span>.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">13. Changes to These Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update these Terms from time to time. We will notify you of material changes by posting a notice on our website or by email at least 30 days before the changes take effect. Your continued use of the Service after changes take effect constitutes acceptance of the revised Terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-foreground">14. Contact</h2>
            <p className="text-muted-foreground leading-relaxed">
              For questions about these Terms, please contact us at{" "}
              <a href={`mailto:${GENERAL_EMAIL}`} className="text-primary hover:underline">{GENERAL_EMAIL}</a>.
              For security and compliance inquiries, contact{" "}
              <a href={`mailto:${COMPLIANCE_EMAIL}`} className="text-primary hover:underline">{COMPLIANCE_EMAIL}</a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
