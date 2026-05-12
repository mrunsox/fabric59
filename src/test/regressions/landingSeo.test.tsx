/**
 * SEO + OG regression checks for LandingPage.
 *
 * Guards that the canonical multi-tenant operational-intelligence
 * positioning, the live CRM phrasing derived from integrationStatus,
 * and the rendered badges stay aligned with marketingMetadata.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LandingPage from "@/pages/LandingPage";
import {
  CANONICAL_TAGLINE,
  canonicalCrmSubhead,
  canonicalSiteDescription,
  organizationLD,
  productOverviewDescription,
  softwareApplicationLD,
} from "@/seo/marketingMetadata";
import {
  STATUS_LABEL,
  comingSoonIntegrations,
  liveCrmSeoPhrase,
  queuedIntegrations,
} from "@/data/integrationStatus";

const renderLanding = () =>
  render(
    <MemoryRouter initialEntries={["/"]}>
      <LandingPage />
    </MemoryRouter>,
  );

const getMeta = (selector: string): string | null =>
  document.querySelector(selector)?.getAttribute("content") ?? null;

const getJsonLdBlocks = (): Array<Record<string, unknown>> =>
  Array.from(
    document.querySelectorAll<HTMLScriptElement>(
      'script[type="application/ld+json"]',
    ),
  ).flatMap((node) => {
    const parsed = JSON.parse(node.textContent ?? "null");
    return Array.isArray(parsed) ? parsed : [parsed];
  });

describe("LandingPage · SEO + OG regression", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
    document.title = "";
  });
  afterEach(() => cleanup());

  it("sets canonical title with the operational-intelligence tagline", () => {
    renderLanding();
    expect(document.title).toBe(`Fabric59 — ${CANONICAL_TAGLINE}`);
  });

  it("renders the canonical site description in <meta name=description>", () => {
    renderLanding();
    expect(getMeta('meta[name="description"]')).toBe(
      canonicalSiteDescription(),
    );
  });

  it("description includes the live CRM SEO phrase from integrationStatus", () => {
    renderLanding();
    const desc = getMeta('meta[name="description"]') ?? "";
    expect(desc).toContain(liveCrmSeoPhrase());
    // Defensive: must reflect both live CRMs by name.
    expect(desc).toMatch(/MyCase/);
    expect(desc).toMatch(/Clio Grow/);
  });

  it("emits aligned OG and Twitter title + description tags", () => {
    renderLanding();
    expect(getMeta('meta[property="og:title"]')).toBe(
      "Fabric59 — Operational intelligence for Five9 contact centers",
    );
    expect(getMeta('meta[property="og:description"]')).toBe(
      canonicalSiteDescription(),
    );
    expect(getMeta('meta[property="og:url"]')).toBe("https://fabric59.com/");
    expect(getMeta('meta[property="og:site_name"]')).toBe("Fabric59");
    expect(getMeta('meta[name="twitter:title"]')).toBe(
      getMeta('meta[property="og:title"]'),
    );
    expect(getMeta('meta[name="twitter:description"]')).toBe(
      getMeta('meta[property="og:description"]'),
    );
    expect(getMeta('meta[name="twitter:card"]')).toBe("summary_large_image");
  });

  it("emits canonical link rel=canonical for the home URL", () => {
    renderLanding();
    const canonical = document
      .querySelector('link[rel="canonical"]')
      ?.getAttribute("href");
    expect(canonical).toBe("https://fabric59.com/");
  });

  it("emits Organization, SoftwareApplication, and FAQ JSON-LD", () => {
    renderLanding();
    const blocks = getJsonLdBlocks();
    const types = blocks.map((b) => b["@type"]);
    expect(types).toEqual(
      expect.arrayContaining(["Organization", "SoftwareApplication", "FAQPage"]),
    );

    const org = blocks.find((b) => b["@type"] === "Organization");
    expect(org).toMatchObject({
      name: organizationLD.name,
      url: organizationLD.url,
      description: organizationLD.description,
    });

    const sw = blocks.find((b) => b["@type"] === "SoftwareApplication");
    expect(sw?.description).toBe(softwareApplicationLD().description);
    expect(sw?.description).toBe(canonicalSiteDescription());

    const faq = blocks.find((b) => b["@type"] === "FAQPage") as
      | { mainEntity: Array<{ name: string; acceptedAnswer: { text: string } }> }
      | undefined;
    expect(faq).toBeDefined();
    const crmQ = faq!.mainEntity.find((q) =>
      /CRMs/i.test(q.name),
    );
    expect(crmQ?.acceptedAnswer.text).toMatch(/MyCase/);
    expect(crmQ?.acceptedAnswer.text).toMatch(/Clio Grow/);
    expect(crmQ?.acceptedAnswer.text).toMatch(/Clio Manage/);
  });

  it("hero copy uses the canonical tagline and live-CRM subhead phrase", () => {
    renderLanding();
    // H1 split across spans — assert on aria-level=1 element textContent.
    const h1 = document.querySelector("h1");
    expect(h1?.textContent ?? "").toMatch(
      /Operational intelligence for\s+Five9 contact centers/,
    );
    // Subhead uses canonicalCrmSubhead() — guard the live-CRM phrase appears.
    expect(document.body.textContent).toContain(canonicalCrmSubhead());
  });

  it("hero badge advertises the canonical positioning chip", () => {
    renderLanding();
    expect(
      screen.getByText(/Multi-tenant · Five9-native · Legal-intake ready/i),
    ).toBeInTheDocument();
  });

  it("renders one Coming-soon card per non-live integration with the correct status label", () => {
    renderLanding();
    const expected = [...queuedIntegrations(), ...comingSoonIntegrations()];

    for (const entry of expected) {
      // Title appears at least once.
      expect(screen.getAllByText(entry.name).length).toBeGreaterThan(0);
    }

    // Badge labels: every Queued/Coming-soon entry should render its
    // STATUS_LABEL exactly once on the page in uppercase tracking-style.
    // Status labels are rendered both in the Coming-soon grid and again
    // in the legal-intake spotlight bullets — assert "at least N" so we
    // catch missing labels without locking in render duplication.
    const queuedCount = queuedIntegrations().length;
    const comingCount = comingSoonIntegrations().length;
    if (queuedCount > 0) {
      expect(
        screen.getAllByText(STATUS_LABEL.queued).length,
      ).toBeGreaterThanOrEqual(queuedCount);
    }
    if (comingCount > 0) {
      expect(
        screen.getAllByText(STATUS_LABEL.coming_soon).length,
      ).toBeGreaterThanOrEqual(comingCount);
    }
  });

  it("keeps marketingMetadata exports internally consistent", () => {
    // canonicalSiteDescription and productOverviewDescription must both
    // reflect the same live CRM seo phrase so cross-page copy doesn't drift.
    const phrase = liveCrmSeoPhrase();
    expect(canonicalSiteDescription()).toContain(phrase);
    expect(productOverviewDescription()).toContain(phrase);
  });
});
