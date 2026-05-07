/**
 * Legal Connect — In-product guide content.
 *
 * Two audiences:
 *  - `client` guides: plain English for law-firm admins.
 *  - `internal` playbooks: procedural steps for the Fabric59 team.
 *
 * The shape is deliberately reusable — adding a new legal software provider
 * later means appending a new entry here, not building new screens.
 */

export type GuideAudience = "client" | "internal";

export interface GuideSection {
  id: string;
  title: string;
  body: string[];          // paragraphs (plain English)
  bullets?: string[];      // optional bullet list under the body
  steps?: string[];        // optional ordered steps (procedural)
}

export interface ProviderGuide {
  /** Stable provider key. Matches values used in connections + tests. */
  provider: string;
  audience: GuideAudience;
  /** Short, human label. */
  title: string;
  /** One-line summary used in cards / drawers. */
  summary: string;
  /** Optional tags to help future filtering. */
  tags?: string[];
  /** Ordered, scannable sections. */
  sections: GuideSection[];
}

/* ------------------------------------------------------------------ */
/* Reusable section keys — used for deep-linking from Readiness/Tests  */
/* ------------------------------------------------------------------ */

export const SECTION = {
  WHAT: "what",
  PREREQ: "prereq",
  CONNECT: "connect",
  TEST: "test",
  SUCCESS: "success",
  ISSUES: "issues",
} as const;

/* ------------------------------------------------------------------ */
/* Client-facing quick-start guides                                    */
/* ------------------------------------------------------------------ */

export const CLIENT_GUIDES: ProviderGuide[] = [
  {
    provider: "clio_grow",
    audience: "client",
    title: "Clio Grow",
    summary: "Send qualified callers into your Clio Grow Lead Inbox automatically.",
    tags: ["intake", "lead", "email-fallback"],
    sections: [
      {
        id: SECTION.WHAT,
        title: "What this connection does",
        body: [
          "When a caller becomes a qualified intake, Fabric59 creates a new lead in your Clio Grow Lead Inbox so your team can pick it up immediately.",
          "If Clio Grow is not reachable for any reason, we send the same intake details to your email as a fallback so nothing is lost.",
        ],
      },
      {
        id: SECTION.PREREQ,
        title: "What you need before starting",
        bullets: [
          "A Clio Grow account with permission to receive leads in the Inbox.",
          "Your Clio Grow Inbox token (we will guide you to it during connection).",
          "An email address where fallback summaries should be sent.",
        ],
        body: [],
      },
      {
        id: SECTION.CONNECT,
        title: "Steps to connect it",
        steps: [
          "Open the Connections tab and choose Clio Grow.",
          "Paste your Inbox token when prompted.",
          "Save and wait for the connection to confirm as connected.",
        ],
        body: [],
      },
      {
        id: SECTION.TEST,
        title: "How to test it",
        steps: [
          "Open the Tests tab.",
          "Pick Clio Grow and run “Test connection.”",
          "Run “Test note or task write-back” to send a sample lead.",
          "Open Clio Grow and confirm the test lead appears in your Inbox.",
        ],
        body: [],
      },
      {
        id: SECTION.SUCCESS,
        title: "What success looks like",
        bullets: [
          "Test connection passes.",
          "A test lead appears in Clio Grow Inbox.",
          "Your Readiness checklist auto-ticks the relevant items.",
        ],
        body: [],
      },
      {
        id: SECTION.ISSUES,
        title: "Common issues",
        bullets: [
          "Token rejected — re-copy the Inbox token from Clio Grow, no extra spaces.",
          "Lead does not appear — confirm the Inbox is enabled in your Clio Grow account.",
          "Email fallback not received — check the email address on the Policies tab.",
        ],
        body: [],
      },
    ],
  },
  {
    provider: "clio",
    audience: "client",
    title: "Clio Manage",
    summary: "Look up callers, add notes, create tasks, and create intakes inside Clio Manage.",
    tags: ["lookup", "note", "task", "intake"],
    sections: [
      {
        id: SECTION.WHAT,
        title: "What this connection does",
        body: [
          "When a call comes in, Fabric59 can find the caller in Clio Manage so the agent sees existing matter context.",
          "After the call, depending on the outcome, Fabric59 can add a note to a matter, create a follow-up task, or create a new intake — without the agent leaving Five9.",
        ],
      },
      {
        id: SECTION.PREREQ,
        title: "What you need before starting",
        bullets: [
          "A Clio Manage administrator account.",
          "Permission to authorize Fabric59 to read contacts and create notes/tasks/matters.",
          "A short list of attorneys / case types you want intakes assigned to (optional but helpful).",
        ],
        body: [],
      },
      {
        id: SECTION.CONNECT,
        title: "Steps to connect it",
        steps: [
          "Open the Connections tab and choose Clio Manage.",
          "Click Connect and complete the Clio sign-in and authorization screen.",
          "Confirm the connection card shows as connected.",
        ],
        body: [],
      },
      {
        id: SECTION.TEST,
        title: "How to test it",
        steps: [
          "Open the Tests tab.",
          "Run “Test connection.”",
          "Run “Test caller lookup” using a phone number known to exist in Clio.",
          "Run “Test note or task write-back” and verify the note appears on that contact in Clio.",
        ],
        body: [],
      },
      {
        id: SECTION.SUCCESS,
        title: "What success looks like",
        bullets: [
          "Lookup test finds the contact.",
          "A test note appears on the matching Clio contact or matter.",
          "Delivery dashboard shows the test row as succeeded.",
        ],
        body: [],
      },
      {
        id: SECTION.ISSUES,
        title: "Common issues",
        bullets: [
          "Connection expired — reconnect Clio Manage from the Connections tab.",
          "Caller not found — confirm the phone number format matches what Clio stores.",
          "Permission denied — re-authorize and accept the requested scopes.",
        ],
        body: [],
      },
    ],
  },
  {
    provider: "mycase",
    audience: "client",
    title: "MyCase",
    summary: "Look up callers and create intakes, notes, or tasks in MyCase.",
    tags: ["lookup", "note", "task", "intake"],
    sections: [
      {
        id: SECTION.WHAT,
        title: "What this connection does",
        body: [
          "Fabric59 looks up callers in MyCase so agents see existing context.",
          "After a call, Fabric59 can add a note to the contact, create a follow-up task, or create a new intake based on the outcome.",
        ],
      },
      {
        id: SECTION.PREREQ,
        title: "What you need before starting",
        bullets: [
          "A MyCase admin account with API access enabled.",
          "Permission to create contacts, notes, and tasks via API.",
        ],
        body: [],
      },
      {
        id: SECTION.CONNECT,
        title: "Steps to connect it",
        steps: [
          "Open the Connections tab and choose MyCase.",
          "Provide the credentials the wizard requests.",
          "Save and wait for the connection card to show as connected.",
        ],
        body: [],
      },
      {
        id: SECTION.TEST,
        title: "How to test it",
        steps: [
          "Open the Tests tab.",
          "Run “Test connection.”",
          "Run “Test caller lookup” with a known phone number.",
          "Run “Test note or task write-back” and confirm the note appears in MyCase.",
        ],
        body: [],
      },
      {
        id: SECTION.SUCCESS,
        title: "What success looks like",
        bullets: [
          "Lookup test finds an existing contact.",
          "A test note or task appears in MyCase.",
          "Delivery dashboard shows the test row as succeeded.",
        ],
        body: [],
      },
      {
        id: SECTION.ISSUES,
        title: "Common issues",
        bullets: [
          "Auth fails — confirm the MyCase user has API access.",
          "Action not supported — Fabric59 will fall back to email-only automatically.",
          "Slow response — MyCase API rate limits may apply; wait and retry.",
        ],
        body: [],
      },
    ],
  },
  {
    provider: "post_call_email",
    audience: "client",
    title: "Post-call email (email-only flow)",
    summary: "Deliver intake or follow-up details by email when CRM write-back isn't used.",
    tags: ["email", "fallback"],
    sections: [
      {
        id: SECTION.WHAT,
        title: "What this connection does",
        body: [
          "After a call, Fabric59 sends a branded email summary describing the caller, the reason for the call, and any next steps.",
          "This is the default delivery method when no legal software is connected, or when safe-mode is set to email-only.",
        ],
      },
      {
        id: SECTION.PREREQ,
        title: "What you need before starting",
        bullets: [
          "An email address (or distribution list) that should receive the summaries.",
          "Optional: a branded template if you want firm-specific styling.",
        ],
        body: [],
      },
      {
        id: SECTION.CONNECT,
        title: "Steps to connect it",
        steps: [
          "Open the Policies tab and confirm the destination email address.",
          "Review the template under the Email Templates area.",
        ],
        body: [],
      },
      {
        id: SECTION.TEST,
        title: "How to test it",
        steps: [
          "Open the Tests tab.",
          "Run “Test email-only outcome.”",
          "Confirm an email arrives in the configured inbox within a minute.",
        ],
        body: [],
      },
      {
        id: SECTION.SUCCESS,
        title: "What success looks like",
        bullets: [
          "Test email-only outcome passes.",
          "A test summary email arrives at the destination address.",
        ],
        body: [],
      },
      {
        id: SECTION.ISSUES,
        title: "Common issues",
        bullets: [
          "Email did not arrive — check spam, then confirm the destination address.",
          "Wrong branding — review the email template under Policies.",
          "Missing fields — review the worksheet so caller_type and call_reason are captured.",
        ],
        body: [],
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Internal playbooks (Fabric59 implementers / ops)                    */
/* ------------------------------------------------------------------ */

export interface InternalPlaybook {
  id: string;
  title: string;
  audience: "internal";
  summary: string;
  steps: string[];
  notes?: string[];
}

export const INTERNAL_PLAYBOOKS: InternalPlaybook[] = [
  {
    id: "new-client-from-scratch",
    audience: "internal",
    title: "Onboarding a new client from scratch",
    summary: "End-to-end procedure for taking a new firm from intake form to live traffic.",
    steps: [
      "Create the client (tenant) record from the Clients page.",
      "Confirm the legal software the firm uses (Clio Manage, Clio Grow, MyCase, or none).",
      "Set the client to setup_in_progress on the Readiness tab.",
      "Open the Connections tab and connect the chosen provider.",
      "Open the Tests tab and run the connection test for that provider.",
      "Configure mappings and outcomes (Mappings + Policies tabs).",
      "Run write-back and email-only tests; confirm rows on the Delivery dashboard.",
      "Walk through the go-live checklist on the Readiness tab.",
      "Promote to ready_for_live, then live, only after every checklist item passes.",
    ],
  },
  {
    id: "connecting-a-provider",
    audience: "internal",
    title: "Connecting a provider",
    summary: "Standard procedure for connecting a CRM/legal software provider.",
    steps: [
      "Confirm the client has the necessary admin account and credentials available.",
      "Use the provider wizard from the Connections tab.",
      "After save, run the auth test from the Tests tab.",
      "If auth passes, run lookup (if supported) and write-back tests.",
      "If anything fails, link the client to the matching client guide and recovery steps.",
    ],
  },
  {
    id: "choosing-safe-mode",
    audience: "internal",
    title: "Choosing safe mode",
    summary: "When to use Full / Email-only / No write-back, and how to flip safely.",
    steps: [
      "Use Full mode by default for live clients with healthy provider connections.",
      "Switch to Email-only when a CRM write-back is broken or not yet trusted.",
      "Switch to No write-back when reads still work but writes fail (e.g. permission scope issue).",
      "Always document why safe-mode was changed in the client notes.",
      "Return to Full mode only after a successful write-back test.",
    ],
  },
  {
    id: "reviewing-readiness",
    audience: "internal",
    title: "Reviewing readiness state",
    summary: "How to interpret each readiness state and what gating they imply.",
    steps: [
      "draft → no provider connected, no live traffic.",
      "setup_in_progress → connection in flight, tests pending.",
      "test_passed → tests green, configuration not yet signed off.",
      "ready_for_live → checklist complete, awaiting promotion.",
      "live → outcomes route through the real adapter path.",
      "paused → all jobs and write-back are halted; investigate before resuming.",
    ],
  },
  {
    id: "outcome-routing-decisions",
    audience: "internal",
    title: "Deciding what each call should do",
    summary: "When a call should write to legal software, send email only, do both, or do neither.",
    steps: [
      "If caller is a current client with a known matter — write a note to the matter and notify the assigned attorney by email.",
      "If caller is a qualified new lead — create an intake in legal software AND send a confirmation email.",
      "If caller is a non-qualified inquiry — send email summary only; do not write to legal software.",
      "If caller is spam / wrong number — do nothing; record disposition only.",
      "If safe_mode = email_only, override CRM jobs to email regardless of outcome.",
    ],
  },
  {
    id: "running-guided-tests",
    audience: "internal",
    title: "Running guided tests",
    summary: "Standard test order during onboarding and after credential changes.",
    steps: [
      "Run Test connection first.",
      "Run Test caller lookup (Clio Manage / MyCase only).",
      "Run Test note/task write-back; confirm dashboard row reaches succeeded.",
      "Run Test email-only outcome.",
      "Confirm checklist items auto-ticked; manually tick the rest.",
    ],
  },
  {
    id: "deciding-go-live",
    audience: "internal",
    title: "Deciding when a client is ready for live traffic",
    summary: "Hard gates before promoting to live.",
    steps: [
      "Every checklist item is confirmed.",
      "At least one provider is connected and recent test runs are green.",
      "Mappings and outcome rules have been reviewed and signed off.",
      "Email fallback works.",
      "The client has been told what to expect and who to contact if something looks off.",
    ],
  },
  {
    id: "pause-safely",
    audience: "internal",
    title: "Pausing a client safely",
    summary: "When to pause and how to recover.",
    steps: [
      "If write-back failures spike or a provider outage is detected, set state = paused.",
      "Switch safe_mode to email_only as a backup so deliveries continue.",
      "Notify the client in plain English what is paused and what is still working.",
      "Investigate using the Delivery dashboard and provider Health panel.",
      "After fixing, run the full guided test sequence and resume.",
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Lookup helpers                                                      */
/* ------------------------------------------------------------------ */

export function getClientGuide(provider: string): ProviderGuide | undefined {
  return CLIENT_GUIDES.find((g) => g.provider === provider);
}

export function getPlaybook(id: string): InternalPlaybook | undefined {
  return INTERNAL_PLAYBOOKS.find((p) => p.id === id);
}
