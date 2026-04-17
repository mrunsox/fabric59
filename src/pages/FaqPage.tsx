import { Link } from "react-router-dom";
import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { SEOHead } from "@/components/seo/SEOHead";
import { StructuredData } from "@/components/seo/StructuredData";
import { MegaMenuHeader } from "@/components/marketing/MegaMenuHeader";
import { MegaFooter } from "@/components/marketing/MegaFooter";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface FaqEntry {
  category: string;
  question: string;
  answer: string;
}

const faqEntries: FaqEntry[] = [
  { category: "Platform", question: "What is Fabric59?", answer: "Fabric59 is an all-in-one Five9 integration platform that automates agent onboarding, offboarding, CRM field mapping, and 55+ third-party integrations. It is built specifically for BPOs and contact centers to reduce manual provisioning from hours to minutes." },
  { category: "Platform", question: "Who is Fabric59 for?", answer: "Fabric59 is built for BPOs, contact centers, legal intake firms, home service companies, and any organization running Five9 that wants automated agent provisioning, CRM sync, and integrated workflows." },
  { category: "Platform", question: "Can I manage multiple Five9 domains?", answer: "Yes. Fabric59 supports multi-domain management with separate credentials, branding, and IVR settings per domain. You can manage multiple clients from a single dashboard." },
  { category: "Five9", question: "How does Fabric59 integrate with Five9?", answer: "Fabric59 connects directly to your Five9 domain via SOAP API credentials. It supports 30+ SOAP actions for provisioning agents, managing campaigns, skills, profiles, DNIS, call variables, disposition mapping, and pre-call lookup with screen-pop via webhook connectors." },
  { category: "Five9", question: "What Five9 actions are supported?", answer: "Agent provisioning (create, update, deactivate), campaign management, skill creation, profile setup, DNIS management, call variable mapping, IVR configuration, disposition routing, and webhook event delivery." },
  { category: "CRM", question: "What CRMs does Fabric59 support?", answer: "Salesforce, HubSpot, Clio, MyCase, Workiz, Zendesk, and any CRM with a REST API. Legal Connect provides deep Clio and MyCase integration with automated contact resolution, matter linking, and disposition writebacks." },
  { category: "CRM", question: "What is Legal Connect?", answer: "Legal Connect is the deep integration module for law firms. It connects Five9 calls with Clio and MyCase, providing automated contact lookup, matter linking, disposition-to-action mapping, and a policy engine with field-level allow, block, and redact rules." },
  { category: "CRM", question: "Can I customize field mappings?", answer: "Yes. The visual field mapping builder lets you drag and drop Five9 fields to CRM target fields, add transformations such as date formatting and phone normalization, and validate mappings against sample data before publishing." },
  { category: "Agents", question: "How does agent onboarding work?", answer: "Enter the agent's details once, and Fabric59 provisions their accounts across Five9, Google Workspace, and Slack simultaneously. Credentials are auto-generated and delivered securely. The entire process takes under a minute." },
  { category: "Agents", question: "What about agent offboarding?", answer: "The deprovisioning workflow includes a configurable grace period, data transfer step (Google Drive ownership transfer), Slack channel removal, Five9 user deactivation, and an HR notification email — all logged in an immutable audit trail." },
  { category: "Pricing", question: "How much does Fabric59 cost?", answer: "Three plans are offered: Starter at $197 per month, Professional at $497 per month, and Enterprise with custom pricing. Contact hi@fabric59.com for Enterprise pricing." },
  { category: "Pricing", question: "Is there a free trial?", answer: "Yes. Sign up to start a free trial. No credit card is required to evaluate the platform." },
  { category: "Security", question: "Is Fabric59 secure?", answer: "Yes. AES-256 encryption at rest and TLS 1.3 in transit. Role-based access control with organization-level data isolation, row-level security at the database layer, and full audit trails." },
  { category: "Security", question: "How are credentials stored?", answer: "All third-party credentials (Five9 admin password, Google service account keys, Slack tokens) are encrypted at rest. They are decrypted only at the moment of an API call inside a backend function and are never exposed to the browser." },
  { category: "Security", question: "Where is my data hosted?", answer: "Customer data is hosted in our managed cloud backend. See the Trust page for compliance details, current certifications in progress, and the responsible disclosure policy." },
];

const faqLD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqEntries.map((f) => ({
    "@type": "Question",
    name: f.question,
    acceptedAnswer: { "@type": "Answer", text: f.answer },
  })),
};

export default function FaqPage() {
  const [query, setQuery] = useState("");
  const categories = useMemo(() => Array.from(new Set(faqEntries.map((f) => f.category))), []);
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return faqEntries;
    return faqEntries.filter(
      (f) =>
        f.question.toLowerCase().includes(q) ||
        f.answer.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEOHead
        title="FAQ | Fabric59 Five9 Integration Platform"
        description="Answers to common questions about Fabric59, our Five9 integrations, CRM connectors, agent provisioning, pricing, and security."
        canonical="https://fabric59.lovable.app/faq"
      />
      <StructuredData data={faqLD} />

      <MegaMenuHeader />

      <main className="max-w-4xl mx-auto px-6 py-16">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-extrabold tracking-tight mb-3">Frequently Asked Questions</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Quick answers about Fabric59, Five9 integration, CRM workflows, agent provisioning, pricing, and security.
          </p>
        </header>

        <div className="relative mb-8">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search questions..."
            className="pl-10 h-11"
          />
        </div>

        {categories.map((cat) => {
          const items = filtered.filter((f) => f.category === cat);
          if (items.length === 0) return null;
          return (
            <section key={cat} className="mb-10">
              <h2 className="text-lg font-bold text-primary mb-3 uppercase tracking-wider text-xs">{cat}</h2>
              <Accordion type="single" collapsible className="space-y-2">
                {items.map((item, i) => (
                  <AccordionItem
                    key={item.question}
                    value={`${cat}-${i}`}
                    className="border border-border/40 rounded-lg px-4 bg-card/30"
                  >
                    <AccordionTrigger className="text-sm font-medium hover:no-underline text-left">
                      {item.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          );
        })}

        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-12">
            No matches. Try a different search term or <Link to="/contact" className="text-primary hover:underline">contact us</Link>.
          </p>
        )}
      </main>

      <MegaFooter />
    </div>
  );
}
