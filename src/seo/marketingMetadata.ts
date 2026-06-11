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
  "The brain between Five9 and your client's system of record";

/** Canonical long-form description used on the home OG card. */
export const canonicalSiteDescription = (): string =>
  `Fabric59 is a multi-tenant guided call workspace platform for outsourced answering services and virtual receptionist providers. Five9 handles the call. Fabric59 structures every call around who called, what happened, what the outcome was, and who needs to be notified — then writes it back into the client's system of record. Multi-vertical by design, with a deep legal practice management pack live today (${liveCrmSeoPhrase()}, Smokeball on the roadmap).`;

/** Short subhead-style phrase, e.g. "MyCase and Clio Grow intake". */
export const canonicalCrmSubhead = (): string => liveCrmSubheadPhrase();

// Per-page descriptions ---------------------------------------------------

export const productOverviewDescription = (): string =>
  `Fabric59 structures every call around four questions: who called, what happened, what the outcome was, and who needs to be notified. Five9 handles the call. Fabric59 is the workflow layer between Five9 and downstream systems of record — legal practice management today (${liveCrmSeoPhrase()}), more vertical packs to come.`;

export const integrationsIndexDescription = (): string =>
  `Vertical integration packs for outsourced answering and virtual receptionist providers. Five9 telephony, the legal practice management pack (${liveCrmSeoPhrase()}, Smokeball on the roadmap), Slack, Zapier, and Make — all wired through one canonical outcome pipeline.`;

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
