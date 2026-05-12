/**
 * Slice A regression suite — Marketing convergence.
 *
 * Locks in the canonical contracts established by Slice A so future edits to
 * the public chrome or compatibility pages cannot silently regress them:
 *
 *  - R-18: GET /demo → /contact?intent=demo (permanent)
 *  - R-19: GET /faq  → /trust              (permanent)
 *  - MegaMenuHeader and MegaFooter must never link to /#anchor hrefs.
 *  - Public chrome must never link to /admin/* or /master/*.
 *  - REDIRECT_TABLE rows R-18 and R-19 must match the rendered behavior.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { render } from "@testing-library/react";
import {
  MemoryRouter,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";

import DemoSandboxPage from "@/pages/DemoSandboxPage";
import FaqPage from "@/pages/FaqPage";
import { REDIRECT_TABLE } from "@/data/surfaceAudit";

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function LocationProbe({ onChange }: { onChange: (loc: { pathname: string; search: string; hash: string }) => void }) {
  const loc = useLocation();
  onChange({ pathname: loc.pathname, search: loc.search, hash: loc.hash });
  return null;
}

function renderRoute(initialPath: string, target: string, element: JSX.Element) {
  let captured = { pathname: "", search: "", hash: "" };
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path={target} element={element} />
        <Route path="*" element={<LocationProbe onChange={(l) => (captured = l)} />} />
      </Routes>
    </MemoryRouter>,
  );
  return captured;
}

const REPO = process.cwd();
const HEADER_SRC = readFileSync(path.join(REPO, "src/components/marketing/MegaMenuHeader.tsx"), "utf8");
const FOOTER_SRC = readFileSync(path.join(REPO, "src/components/marketing/MegaFooter.tsx"), "utf8");

/* ------------------------------------------------------------------ */
/* R-18 — /demo → /contact?intent=demo                                */
/* ------------------------------------------------------------------ */

describe("Slice A · R-18 /demo redirect", () => {
  it("redirects /demo to /contact with intent=demo", () => {
    const loc = renderRoute("/demo", "/demo", <DemoSandboxPage />);
    expect(loc.pathname).toBe("/contact");
    expect(loc.search).toBe("?intent=demo");
  });

  it("matches the REDIRECT_TABLE entry for R-18", () => {
    const row = REDIRECT_TABLE.find((r) => r.id === "R-18");
    expect(row).toBeDefined();
    expect(row!.from).toBe("/demo");
    expect(row!.to).toBe("/contact?intent=demo");
    expect(row!.kind).toBe("permanent");
  });
});

/* ------------------------------------------------------------------ */
/* R-19 — /faq → /trust                                               */
/* ------------------------------------------------------------------ */

describe("Slice A · R-19 /faq redirect", () => {
  it("redirects /faq to /trust", () => {
    const loc = renderRoute("/faq", "/faq", <FaqPage />);
    expect(loc.pathname).toBe("/trust");
  });

  it("matches the REDIRECT_TABLE entry for R-19", () => {
    const row = REDIRECT_TABLE.find((r) => r.id === "R-19");
    expect(row).toBeDefined();
    expect(row!.from).toBe("/faq");
    expect(row!.to).toBe("/trust");
    expect(row!.kind).toBe("permanent");
  });
});

/* ------------------------------------------------------------------ */
/* CTA alignment — public chrome never points at /#anchor or /admin   */
/* ------------------------------------------------------------------ */

describe("Slice A · public chrome CTA alignment", () => {
  // Match `to="/#…"` or `href="/#…"` (the anti-pattern we removed).
  const ANCHOR_HREF = /\b(?:to|href)\s*=\s*["']\/#[A-Za-z0-9_-]/;
  // Match `to="/admin…"` / `to="/master…"` and the href equivalents.
  const PRIVATE_ROUTE = /\b(?:to|href)\s*=\s*["'](?:\/admin|\/master)\b/;

  it("MegaMenuHeader has no /#anchor hrefs", () => {
    expect(HEADER_SRC).not.toMatch(ANCHOR_HREF);
  });

  it("MegaMenuHeader has no /admin or /master CTAs", () => {
    expect(HEADER_SRC).not.toMatch(PRIVATE_ROUTE);
  });

  it("MegaFooter has no /#anchor hrefs", () => {
    expect(FOOTER_SRC).not.toMatch(ANCHOR_HREF);
  });

  it("MegaFooter has no /admin or /master CTAs", () => {
    expect(FOOTER_SRC).not.toMatch(PRIVATE_ROUTE);
  });

  it("MegaMenuHeader exposes the canonical primary IA links", () => {
    for (const href of ["/solutions", "/personas", "/pricing", "/integrations", "/customers", "/trust", "/contact", "/login", "/product"]) {
      expect(HEADER_SRC).toContain(`"${href}"`);
    }
  });

  it("MegaFooter Product column uses canonical IA destinations", () => {
    for (const href of ["/solutions", "/personas", "/pricing", "/integrations", "/customers", "/product", "/trust", "/contact"]) {
      expect(FOOTER_SRC).toContain(`"${href}"`);
    }
  });
});
