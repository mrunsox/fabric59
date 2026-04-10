

# SEO + AEO Compliance Audit and Gap Closure

## Current State (What's Already Done)

| Checklist Item | Status |
|---|---|
| Clean URLs for public pages | DONE |
| robots.txt | PARTIAL (allows everything, doesn't block admin/auth/staging) |
| XML sitemap | PARTIAL (missing /privacy, /trust, /responsible-disclosure, /contact) |
| Canonical tags on each page | DONE (SEOHead component) |
| Unique title + meta per page | DONE |
| Semantic H1/H2/H3 structure | DONE |
| Organization + FAQPage schema | DONE (LandingPage) |
| SoftwareApplication schema | MISSING |
| llms.txt + ai.txt | DONE but STALE (missing /privacy, /trust, /contact, /responsible-disclosure) |
| AEO direct-answer paragraphs | MISSING on most pages |
| "What is Fabric59?" standalone page | MISSING (inline on landing only) |
| Internal topic cluster links | PARTIAL |
| Hero em dash in prose | Still present (line 144) |
| noindex on dashboards/admin | MISSING from SEOHead defaults |

---

## Changes to Implement

### 1. robots.txt: Block admin, auth, staging paths

Add `Disallow` rules for `/admin`, `/master`, `/onboarding`, `/forgot-password`, `/reset-password`, `/system-access` while keeping all public marketing paths open.

### 2. sitemap.xml: Add missing public pages

Add `/privacy`, `/trust`, `/responsible-disclosure`, `/contact` entries with appropriate priority values.

### 3. SoftwareApplication structured data

Add `SoftwareApplication` JSON-LD to `LandingPage.tsx` with name, description, category, pricing, and URL fields.

### 4. llms.txt + ai.txt: Update with new pages

Add entries for `/privacy`, `/trust`, `/responsible-disclosure`, `/contact` to both files.

### 5. AEO direct-answer paragraphs

Add a 40-60 word "direct answer" opening paragraph to the top of each major public page body:
- `/security`: "What security measures does Fabric59 use?"
- `/privacy`: "How does Fabric59 handle personal data?"
- `/trust`: "What compliance standards does Fabric59 follow?"
- `/terms`: Brief intro paragraph already exists, just needs tightening
- `/contact`: Already concise enough

### 6. noindex on admin/auth pages

Update `SEOHead` calls on login, signup, forgot-password, reset-password, onboarding, and the NotFound page to include `noindex` where not already set.

### 7. Fix remaining hero em dash

Replace the `—` on LandingPage line 144 with a comma.

### 8. Build map update

Add an "SEO & AEO Hardening" category to `buildMap.ts` tracking these items.

---

## Files to Change

| File | Action |
|---|---|
| `public/robots.txt` | Add Disallow rules for admin/auth paths |
| `public/sitemap.xml` | Add 4 missing public pages |
| `public/llms.txt` | Add new pages and update stale dash |
| `public/ai.txt` | Add new page entries |
| `src/pages/LandingPage.tsx` | Add SoftwareApplication LD, fix hero dash |
| `src/pages/SecurityPage.tsx` | Add AEO direct-answer opening paragraph |
| `src/pages/PrivacyPage.tsx` | Add AEO direct-answer opening paragraph |
| `src/pages/TrustPage.tsx` | Add AEO direct-answer opening paragraph |
| `src/pages/auth/LoginPage.tsx` | Add `noindex` to SEOHead (or add SEOHead with noindex) |
| `src/pages/auth/SignupPage.tsx` | Add `noindex` to SEOHead |
| `src/pages/auth/ForgotPasswordPage.tsx` | Add `noindex` to SEOHead |
| `src/pages/auth/ResetPasswordPage.tsx` | Add `noindex` to SEOHead |
| `src/pages/onboarding/OnboardingPage.tsx` | Add `noindex` to SEOHead |
| `src/data/buildMap.ts` | Add "SEO & AEO Hardening" category |

No backend changes. Content and metadata only.

