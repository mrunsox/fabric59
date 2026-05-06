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
  { category: "Platform", question: "What is Fabric59?", answer: "Fabric59 is a Five9-native control plane and legal-intake bridge. It connects Five9 to legal CRMs (MyCase live, Clio adapter ready to activate), and gives operations teams visual field mapping, agent decision-tree scripting, multi-tenant management, and audit-grade reconciliation and compliance export." },
  { category: "Platform", question: "Who is Fabric59 for?", answer: "Legal-intake contact centers, BPOs, and agencies running Five9 that need a hardened bridge between Five9 and their CRM, plus the operational tooling around it." },
  { category: "Platform", question: "Can I manage multiple Five9 domains?", answer: "Yes. Multi-domain management with separate credentials, IVR settings, and connection tests per Five9 domain is shipped today." },
  { category: "Five9", question: "How does Fabric59 integrate with Five9?", answer: "Through the Five9 SOAP Admin API. Fabric59 ships 30+ SOAP actions covering agent provisioning, campaign management, skills, profiles, DNIS, call variables, and a webhook layer for pre-call ANI lookup and post-call events." },
  { category: "Five9", question: "What Five9 actions are supported?", answer: "Agent provisioning (create, update, deactivate), campaign management, skill creation, profile setup, DNIS management, call variable mapping, IVR configuration, and disposition routing — all live today." },
  { category: "CRM", question: "Which CRMs are supported today?", answer: "MyCase is live using per-client API key intake. The Clio adapter is built and waiting on OAuth credential activation. Additional CRMs are added per engagement through the same adapter pattern." },
  { category: "CRM", question: "What is Legal Connect?", answer: "Legal Connect is the Five9 → legal CRM bridge: pre-call ANI lookup, contact resolution, matter linking on MyCase (live), and a per-disposition policy engine with allow / block / redact field rules." },
  { category: "CRM", question: "Can I customize field mappings?", answer: "Yes. The visual field mapping builder lets you drag-and-drop fields, add transforms, and run a real Test execution against tenant configs before publishing." },
  { category: "Agents", question: "How does agent onboarding work?", answer: "Today, Fabric59 provisions Five9 agents and Slack workspaces from a single form. Google Workspace provisioning is on the roadmap." },
  { category: "Agents", question: "What about agent offboarding?", answer: "The deprovisioning workflow includes a configurable grace period, Slack workspace removal, Five9 user deactivation, and an audit trail entry." },
  { category: "Pricing", question: "How much does Fabric59 cost?", answer: "We are not publishing list prices yet. Onboarding is currently founder-led and scoped per engagement based on your Five9 footprint, CRMs, and rollout plan. Self-serve billing is on the roadmap." },
  { category: "Pricing", question: "Is there a free trial?", answer: "Not at this time. We run guided walkthroughs instead of self-serve trials while onboarding is founder-led." },
  { category: "Security", question: "Is Fabric59 secure?", answer: "Credentials are encrypted with pgcrypto (AES-256). Tenant data is isolated with Postgres Row-Level Security and SECURITY DEFINER role checks. A server-side compliance export bundles logs, config history, and an RLS snapshot." },
  { category: "Security", question: "Do you have SOC 2 or ISO 27001?", answer: "Not at this time. We do not claim SOC 2 or ISO 27001. Formal certifications will be pursued as the business matures and announced on the Trust page." },
  { category: "Security", question: "How are credentials stored?", answer: "All third-party credentials (Five9 admin, MyCase API key, Slack tokens) are encrypted at rest and decrypted only at the moment of an API call inside a backend function. They are never exposed to the browser." },
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
        canonical="https://fabric59.com/faq"
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
