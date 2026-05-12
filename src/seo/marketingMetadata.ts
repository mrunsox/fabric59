/**
 * Single source of truth for public marketing metadata —
 * canonical product positioning, structured data, and OG/SEO copy.
 *
 * Anything user-visible on a marketing page (title chrome, OG tags,
 * Organization JSON-LD, FAQ JSON-LD) should derive from this file
 * so we cannot drift between LandingPage, ProductTourPage,
 * IntegrationsIndexPage, and the static index.html shell.
 */

import {
  liveCrmSeoPhrase,
  liveCrmSubheadPhrase,
} from "@/data/integrationStatus";

// Canonical positioning ---------------------------------------------------

export const SITE_NAME = "Fabric59";
export const SITE_URL = "https://fabric59.com";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

/** Canonical short positioning line, used in titles and OG. */
export const CANONICAL_TAGLINE =
  "Operational Intelligence For Five9 Contact Centers";

/** Canonical long-form description used on the home OG card. */
export const canonicalSiteDescription = (): string =>
  `The multi-tenant operational-intelligence platform for Five9. Unify Five9 SOAP control, ${liveCrmSeoPhrase()}, visual mapping, decision-tree scripting, post-call automations, RLS-isolated tenancy, and audit-grade compliance export.`;

/** Short subhead-style phrase, e.g. "MyCase and Clio Grow intake". */
export const canonicalCrmSubhead = (): string => liveCrmSubheadPhrase();

// Per-page descriptions ---------------------------------------------------

export const productOverviewDescription = (): string =>
  `The canonical Fabric59 product overview. Every capability tagged Live, Partial, or Coming soon — Five9 SOAP, ${liveCrmSeoPhrase()}, visual mapping, decision-tree scripting, RLS-isolated tenancy, and audit-grade compliance export.`;

export const integrationsIndexDescription = (): string =>
  `Five9, ${liveCrmSeoPhrase()}, Slack, Zapier, and Make — all routed through one canonical, provider-agnostic integrations layer with per-tenant config inheritance.`;

// Structured data ---------------------------------------------------------

export const organizationLD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: `${SITE_URL}/`,
  description:
    "Multi-tenant operational-intelligence platform for Five9 contact centers and legal-intake operations.",
  contactPoint: {
    "@type": "ContactPoint",
    email: "hi@fabric59.com",
    contactType: "customer service",
  },
  parentOrganization: {
    "@type": "Organization",
    name: "UNSOX Digital",
    url: "https://unsox.com",
  },
} as const;

export const softwareApplicationLD = () =>
  ({
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: canonicalSiteDescription(),
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      price: "0",
      availability: "https://schema.org/PreOrder",
      description:
        "Founder-led onboarding today. Self-serve billing on the roadmap.",
    },
  }) as const;

export const buildFaqLD = (
  items: ReadonlyArray<{ question: string; answer: string }>,
) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: items.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer },
  })),
});
