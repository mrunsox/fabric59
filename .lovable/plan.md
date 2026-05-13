## Problem

The current header is cluttered and has duplicates:

- **Solutions** appears twice (mega menu trigger + primary link)
- **Personas** appears twice (mega menu trigger + primary link)
- **Customers** appears in both the Resources mega menu and as a primary link
- **Resources** mega menu surfaces sales/internal items (Pilot guide, Intake playbook, Five9+CRM blueprint, Docs) that route to `/contact?topic=…` — these are not client-facing nav, they are sales artifacts
- Result: 8 visible nav slots on desktop with overlap, and the `Fabric59 Integration Hub` wordmark wraps awkwardly at this width

## Proposed canonical header (final)

Desktop, after the logo:

1. **Solutions** — mega menu (5 motions, content unchanged)
2. **Personas** — mega menu (4 personas, content unchanged)
3. **Integrations** — direct link
4. **Pricing** — direct link
5. **Customers** — direct link

Right rail (unchanged): `Sign in` + `Start a pilot`.

## Removed from the header

- Duplicate "Solutions" primary link (kept only as mega menu)
- Duplicate "Personas" primary link (kept only as mega menu)
- Entire "Resources" mega menu, including Pilot guide / Intake playbook / Five9+CRM blueprint / Docs / Trust links
- Duplicate "Customers" entry inside Resources

These items remain reachable from the footer and from in-page CTAs — they are only demoted from the global header.

## Mobile drawer

Mirror the desktop nav exactly: Solutions group, Personas group, then direct links Integrations / Pricing / Customers, then Start a pilot + Sign in. Drop the Resources group and the duplicated primary-link block.

## Logo wrap fix

Lock the wordmark to a single line in the header so "Fabric59 / Integration Hub" cannot wrap at narrow desktop widths. Scoped to the header instance only, no change to `Fabric59Logo`.

## Files touched

- `src/components/marketing/MegaMenuHeader.tsx` — remove Resources mega menu, drop duplicate Solutions/Personas from `primaryLinks`, simplify mobile drawer, fix logo wrap
- `src/test/regressions/canonicalSurfaces.test.ts` — update Phase H assertions: header no longer renders Resources trigger; Solutions and Personas appear once in header source; remove header-level resource-link routing assertion (footer assertion, if any, kept)

## Out of scope

- Footer, mega menu internals, marketing page bodies
- Auth, onboarding, routing, backend, copy beyond the header
