

# Maximum Visibility: SEO, AEO, GEO, LLMO, AXO, VLM & AI-Era Optimization

## What These Mean for Your App

| Acronym | What It Does |
|---------|-------------|
| **SEO** | Traditional search engine ranking (Google, Bing) |
| **AEO** | Answer Engine Optimization -- getting featured in AI answer boxes, snippets, People Also Ask |
| **GEO** | Generative Engine Optimization -- appearing in AI-generated search results (Google AI Overviews, Bing Copilot) |
| **LLMO** | Large Language Model Optimization -- being cited by ChatGPT, Claude, Perplexity |
| **AXO** | AI Experience Optimization -- ensuring AI agents can navigate and understand your content |
| **VLM** | Vision Language Model -- making your pages parseable by screenshot-based AI models |
| **AI-Era** | Future-proofing for emerging AI discovery channels |

## Current Gaps

- Title tag is truncated ("...Agent Lifecycle M")
- No sitemap.xml
- No JSON-LD structured data
- No FAQ section (critical for AEO/GEO snippet extraction)
- No canonical URLs
- No semantic HTML landmarks (`<main>`, `<article>`, `<nav aria-label>`)
- No `llms.txt` or `ai.txt` for LLM crawlers
- robots.txt missing sitemap reference and AI bot directives
- No alt text strategy for VLM
- No "How It Works" or "Use Cases" content for LLMO citability

---

## Implementation Plan

### 1. Fix `index.html` -- Core Meta Tags

- Fix truncated title: "Fabric59 | Five9 Integration Hub for CRM & Agent Lifecycle Management"
- Add canonical link tag
- Add `robots` meta tag with `index, follow`
- Add proper `og:url`
- Add keywords meta (still used by some engines)
- Add `application-name` and `theme-color` meta

### 2. Create `public/sitemap.xml`

Static sitemap listing all public routes with priorities:

```text
/              priority 1.0
/outline       priority 0.7
/terms         priority 0.3
/security      priority 0.4
/login         priority 0.5
/signup        priority 0.6
```

### 3. Create `public/llms.txt` -- LLM Optimization

A plain-text file that AI crawlers (Perplexity, ChatGPT browse, etc.) read to understand your product. This is the LLMO equivalent of robots.txt:

```text
# Fabric59
> Five9 integration platform for agent lifecycle management and CRM field mapping

## What is Fabric59?
Fabric59 automates agent onboarding/offboarding across Five9, Google Workspace, and Slack...

## Key Features
- Agent Provisioning & Deprovisioning
- Visual CRM Field Mapping Builder
- 55+ Pre-built Integrations
- Real-time API Monitoring

## Use Cases
- BPO contact centers managing hundreds of agents
- Companies integrating Five9 with Salesforce, HubSpot, Clio, Workiz
...
```

### 4. Create `public/ai.txt` -- AI Agent Discoverability

Tells AI agents what this site is, what it can do, and how to interact:

```text
User-agent: *
Sitemap: https://fabric59.lovable.app/sitemap.xml
Description: Fabric59 is a Five9 integration platform...
Contact: hi@fabric59.com
```

### 5. Update `public/robots.txt` -- AI-Era Directives

- Add Sitemap reference
- Add AI crawler directives (GPTBot, PerplexityBot, ClaudeBot, Google-Extended)
- Keep everything allowed for maximum visibility

### 6. Add JSON-LD Structured Data to Landing Page

Inject structured data into `LandingPage.tsx` using a `<script type="application/ld+json">` via React Helmet pattern (or inline). Three schemas:

- **Organization** -- name, logo, URL, contact, sameAs
- **WebApplication** (SoftwareApplication) -- name, description, category, offers
- **FAQPage** -- question/answer pairs (critical for AEO)

### 7. Add FAQ Section to Landing Page (AEO/GEO Critical)

Add a visible FAQ section with 5-6 questions that directly answer common queries. This is the single most impactful change for AEO -- answer engines pull directly from FAQ content:

- "What is Fabric59?"
- "How does Fabric59 integrate with Five9?"
- "What CRMs does Fabric59 support?"
- "How does agent onboarding work?"
- "Is Fabric59 secure?"
- "How much does Fabric59 cost?"

Each answer uses clear, concise language optimized for snippet extraction.

### 8. Add "How It Works" Section to Landing Page (LLMO/GEO)

A 3-step process section that LLMs can cite as a clear explanation:

1. Connect your Five9 account
2. Configure integrations and map fields
3. Automate agent lifecycle and sync data

### 9. Semantic HTML & Accessibility (AXO/VLM)

Update `LandingPage.tsx` with proper semantic landmarks:

- Wrap hero in `<main>`
- Add `aria-label` to all `<nav>` elements
- Add `aria-label` to `<section>` elements
- Add `role="banner"` to header, `role="contentinfo"` to footer
- Ensure all images have descriptive `alt` text
- Add `aria-describedby` where appropriate

### 10. Create SEO Head Component

A reusable `<SEOHead>` component that other pages (Outline, Terms, Security) can use to set per-page:

- `<title>`
- `<meta name="description">`
- `<link rel="canonical">`
- Open Graph tags
- JSON-LD structured data

Uses `document.title` and DOM manipulation (or `react-helmet-async` if available, but we'll keep it dependency-free).

---

## Files Changed

| File | Change |
|------|--------|
| `index.html` | Fix title, add canonical, robots meta, theme-color, keywords, og:url |
| `public/robots.txt` | Add Sitemap, AI bot directives |
| `public/sitemap.xml` | New -- static sitemap for all public routes |
| `public/llms.txt` | New -- LLM-readable product summary |
| `public/ai.txt` | New -- AI agent discoverability file |
| `src/components/seo/SEOHead.tsx` | New -- reusable per-page SEO component |
| `src/components/seo/StructuredData.tsx` | New -- JSON-LD structured data component |
| `src/pages/LandingPage.tsx` | Add FAQ section, How It Works section, semantic HTML, structured data, SEOHead |
| `src/pages/OutlinePage.tsx` | Add SEOHead with page-specific meta |
| `src/pages/TermsPage.tsx` | Add SEOHead with page-specific meta |
| `src/pages/SecurityPage.tsx` | Add SEOHead with page-specific meta |
| `src/pages/NotFound.tsx` | Add proper 404 meta (noindex) |

