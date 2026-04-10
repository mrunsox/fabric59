

# Privacy, Trust, and Compliance Pages Implementation

## Overview

Implement 4 new public pages (`/privacy`, `/trust`, `/responsible-disclosure`, `/contact`), expand the existing `/security` and `/terms` pages with full professional content, add a "Legal & Compliance" admin settings tab, update all footers and nav, and add incident reporting hooks.

## Variables

- `PRODUCT_NAME` = Fabric59
- `PRODUCT_DESCRIPTION` = The all-in-one Five9 integration platform for BPOs and contact centers
- `PRIMARY_DOMAIN` = fabric59.lovable.app
- `COMPLIANCE_EMAIL` = security@fabric59.com

## Files to Create

| File | Route | Purpose |
|------|-------|---------|
| `src/pages/PrivacyPage.tsx` | `/privacy` | Full privacy policy with data collection, retention, GDPR, US/CA sections, subprocessor table |
| `src/pages/TrustPage.tsx` | `/trust` | Compliance center: SOC 2 status, controls overview, data handling, DDQ instructions, cross-links |
| `src/pages/ResponsibleDisclosurePage.tsx` | `/responsible-disclosure` | Security research policy, scope, safe harbor, reporting instructions |
| `src/pages/ContactPage.tsx` | `/contact` | Compliance/DPO contact, sales placeholder, pre-filled mailto links |

## Files to Rewrite

| File | Changes |
|------|---------|
| `src/pages/SecurityPage.tsx` | Expand from 4 cards to full sections: Architecture & Data Protection, Access Control & Audit, Enterprise Features (SSO/SCIM coming soon, IP allowlisting, API tokens), Incident Response with mailto link |
| `src/pages/TermsPage.tsx` | Expand from 5 sections to full ToS: Introduction/parties, Eligibility, Account responsibilities, Service availability, Fees/billing, Prohibited activities, IP, Disclaimers, Limitation of liability, Governing law placeholders |

## Files to Edit

| File | Changes |
|------|---------|
| `src/App.tsx` | Add routes: `/privacy`, `/trust`, `/responsible-disclosure`, `/contact` |
| `src/components/marketing/MegaFooter.tsx` | Add Privacy, Trust, Responsible Disclosure, Contact to company links |
| `src/components/marketing/MegaMenuHeader.tsx` | Add Trust/Compliance link under Resources dropdown |
| `src/components/layout/AdminLayout.tsx` | No change needed (Settings tab approach below) |
| `src/pages/admin/SettingsPage.tsx` | Add "Legal & Compliance" tab with: external links to all trust pages, org data retention summary (placeholder config), "System of Record Export" stub button, and "Report an Incident" mailto button |
| `src/data/buildMap.ts` | Add "Privacy & Trust" category with all 8 items (4 new pages + 2 rewrites + admin tab + footer links) |

## Shared Layout

All new public pages use the same pattern as existing `/security` and `/terms`: back-to-home link, Fabric59 icon + title, `SEOHead`, prose sections with consistent typography.

## In-App Compliance Hooks

1. **Settings > Legal & Compliance tab** — links to all 6 trust pages, retention summary card, export stub, incident report mailto
2. **Incident mailto template** — pre-fills subject with `[Security Incident] Fabric59 — {org name}` and body with org/tenant name, user email, current route, description placeholder
3. **Footer links** — both MegaFooter (marketing) and AdminLayout footer get: Security, Privacy, Terms, Trust, Responsible Disclosure, Contact

## Content Approach

All copy will be professional B2B SaaS boilerplate with clear `[PLACEHOLDER]` markers where legal counsel review is needed (jurisdiction, specific retention periods, subprocessor list). No binding promises; uses "designed to support" and "in progress" language for certifications.

## No Backend Changes

This is purely pages, content, and navigation. No database migrations, no edge functions, no auth changes.

