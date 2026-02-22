

# Update Landing Page with All Built Features

## What's Missing

The landing page currently showcases only 4 platform features and 2 hero cards. The build map has 14 categories of completed features. Key omissions:

| Missing Feature | Impact |
|----------------|--------|
| AI Call Flow Builder | Major differentiator -- AI-powered, interactive simulator |
| Five9 Domain Management | Core product capability (multi-domain) |
| RBAC / Granular Permissions | Enterprise selling point |
| Multi-Tenant Management | BPO-critical feature |
| Master Admin Platform | Multi-org oversight for platform operators |
| Google Workspace + Slack Automation | Part of agent lifecycle but not called out |

## Changes

### 1. Expand `platformFeatures` array (4 to 8 features)

Add four new feature cards to the grid:

- **AI Call Flow Builder** -- "Design call flows with AI assistance. Chat-driven configuration with an interactive step-through simulator for legal, home services, healthcare, and insurance scenarios."
- **Five9 Domain Management** -- "Manage multiple Five9 domains with per-domain credentials, branding, IVR settings, and real-time connection testing."
- **Role-Based Access Control** -- "Granular permission system with per-user tab access, organization-level isolation, and row-level security at the database layer."
- **Multi-Tenant Platform** -- "Manage multiple clients from a single dashboard. Tag tenants by CRM type, configure per-client integrations, and oversee all organizations from the master admin console."

### 2. Update `featureCards` hero section (2 to 3 cards)

Add a third hero card:

- **AI-Powered Call Flow Design** -- "Build intelligent call flows with AI chat assistance and test them with an interactive simulator. Pre-built templates for legal, home services, healthcare, and insurance."

Switch to a 3-column grid on desktop.

### 3. Update FAQ items

Add two new FAQ entries:

- **"What is the AI Call Flow Builder?"** -- Explains the Gemini-powered chat interface, interactive simulator, and practice area templates.
- **"Can I manage multiple Five9 domains and clients?"** -- Explains multi-domain support, multi-tenant management, and the master admin console.

### 4. Update JSON-LD structured data

- Add "AI Call Flow Builder", "Role-Based Access Control", and "Multi-Tenant Management" as `featureList` items in the `SoftwareApplication` schema.
- Add the two new FAQ entries to the `FAQPage` schema.

### 5. Update `llms.txt` and `ai.txt`

Add the missing features to the Key Features and capabilities sections so LLM crawlers surface accurate, complete information.

### 6. Update `buildMap.ts`

Add a new category for the SEO/AEO/GEO/LLMO work we just completed:

- **"SEO & AI Visibility"** category with items: SEOHead component, JSON-LD structured data, sitemap.xml, llms.txt, ai.txt, robots.txt AI directives, FAQ section, How It Works section, semantic HTML landmarks.

## Files Changed

| File | Change |
|------|--------|
| `src/pages/LandingPage.tsx` | Add 4 new platform features, 1 new hero card, 2 new FAQ items, update structured data |
| `public/llms.txt` | Add missing features (Call Flow Builder, RBAC, Multi-Tenant, Domain Management) |
| `public/ai.txt` | Add missing capabilities |
| `src/data/buildMap.ts` | Add "SEO & AI Visibility" category with all new items |

## Technical Details

### LandingPage.tsx Changes

- `featureCards` array: add 3rd card for AI Call Flow, change grid to `md:grid-cols-3`
- `platformFeatures` array: add 4 entries (AI Call Flow Builder, Domain Management, RBAC, Multi-Tenant Platform), change grid to `lg:grid-cols-4` (stays 4-col but with 8 items = 2 rows)
- `faqItems` array: append 2 new Q&A entries
- `softwareLD`: add `featureList` property with all 8 platform features listed
- `faqLD`: automatically picks up new FAQ items (already maps from `faqItems`)

### Import additions

- Add `Bot`, `Shield`, `Building2`, `Globe` icons from lucide-react for the new feature cards

