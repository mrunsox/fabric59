
# Three-Part Plan: Connection Test in Onboarding + Intent Question + Domain Credentials Update

## What's Being Built

Three improvements in one pass:

1. **Auto-test credentials during onboarding** — After saving the Five9 domain, automatically call the `test-five9-connection` edge function and show a result screen (success or failure with retry) before advancing to the next step.
2. **Intent question after connection** — Once credentials are verified, ask the user what they want to do next: "Provision agents" or "Set up a campaign integration" — with a clean card-based choice UI. This determines which onboarding path they follow.
3. **Domain Detail credentials are already there** — Checking the `DomainDetailPage.tsx`, the "API Credentials" tab already has Five9 Admin Username and Password fields with save + test buttons. No changes needed here — it's fully built.

---

## Step 1: Onboarding — Auto-Test After Domain Save

### New state added to `OnboardingPage.tsx`

```typescript
type Step = "org" | "domain" | "testing" | "intent" | "tenant" | "complete";

const [connectionStatus, setConnectionStatus] = useState<"testing" | "success" | "failed" | null>(null);
const [connectionMessage, setConnectionMessage] = useState("");
```

### Updated `handleCreateDomain` flow

```
1. Validate fields (display name, username, password)
2. Insert into five9_domains → get back domain ID
3. Immediately set step to "testing" (spinner shown)
4. Call test-five9-connection edge function with the new domain ID
5. If success → set connectionStatus = "success" → after 1.5s advance to "intent"
6. If failure → set connectionStatus = "failed" → show error + "Try Different Credentials" button
```

### New "testing" step card

```text
┌─────────────────────────────────────────┐
│  🔌  Verifying Connection               │
│  Connecting to Five9 Admin Web Services │
│                                         │
│   [spinner] Authenticating...           │  ← while testing
│                                         │
│   ✅  Connected successfully            │  ← on success
│   Advancing in a moment...              │
│                                         │
│   ❌  Connection failed                 │  ← on failure
│   "Authentication failed. Please        │
│    check your credentials."             │
│                                         │
│   [Try Again]  [Continue Anyway]        │  ← failure actions
└─────────────────────────────────────────┘
```

"Try Again" returns to the domain step with credentials pre-filled so the user can correct them. "Continue Anyway" advances to intent so they aren't completely blocked.

---

## Step 2: Intent Selection After Successful Connection

### New "intent" step card

After a successful connection test, show a clean choice screen before the tenant step:

```text
┌─────────────────────────────────────────┐
│  🎯  What would you like to set up?     │
│  Choose your primary use case           │
│                                         │
│  ┌──────────────────────────────────┐   │
│  │  👤  Agent Provisioning          │   │
│  │  Onboard and offboard call       │   │
│  │  center agents — create Five9    │   │
│  │  users, assign skills, send      │   │
│  │  credentials automatically.      │   │
│  └──────────────────────────────────┘   │
│                                         │
│  ┌──────────────────────────────────┐   │
│  │  🔗  CRM & Campaign Integration  │   │
│  │  Connect your clients' CRMs to   │   │
│  │  Five9 campaigns — map fields,   │   │
│  │  sync contacts, and route calls  │   │
│  │  to the right disposition.       │   │
│  └──────────────────────────────────┘   │
│                                         │
│  [→  Continue]   (selection required)   │
└─────────────────────────────────────────┘
```

Selecting a card highlights it. Clicking Continue advances to the "tenant" step regardless of choice — the selection is stored in state and used later to customize the complete screen's CTA (e.g., "Go to Agent Provisioning" vs "Go to Mapping Builder").

---

## Step 3: Domain Detail Page — Already Done

The `DomainDetailPage.tsx` already has a full "API Credentials" tab with:
- Five9 Admin Username field (pre-populated from saved data)
- Admin Password field (blank for security, with placeholder showing if a password exists)
- Save Credentials button
- Test Connection button
- Connection status badge
- Help text explaining where to find credentials

No changes needed to `DomainDetailPage.tsx`.

---

## Progress Indicator Update

The step indicator needs to account for the new steps. The visible steps for the progress bar will remain 4 dots (org, domain, clients, done) — the "testing" and "intent" steps happen within the domain step visually (step 2 stays highlighted during testing and intent selection).

---

## Files to Modify

| File | Change |
|---|---|
| `src/pages/onboarding/OnboardingPage.tsx` | Add "testing" + "intent" steps, auto-test logic, intent selection card UI |

No other files need changing. The `test-five9-connection` edge function already exists and is deployed. The `DomainDetailPage.tsx` already has credential management.

---

## Technical Implementation Notes

- The connection test uses a direct `fetch` to the edge function (same pattern as `useTestFive9Connection.ts`) — no need to import the hook since we need inline control over the step transition timing
- The 1.5 second delay on success gives the user a moment to see the green checkmark before moving on
- The "intent" selection is stored as `const [intent, setIntent] = useState<"provisioning" | "integration" | null>(null)` — used to customize the final complete screen CTA
- Progress dots: "testing" and "intent" steps both show step 2 (domain) as active so the visual progress stays clean and doesn't jump around with extra dots

