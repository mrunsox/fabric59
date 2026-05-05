# Dev Guide page (Superadmin → Settings)

Internal developer reference for the Five9-native legal integration platform. Reachable from `Superadmin Dashboard → Settings → Dev Guide` and at `/admin/dev-guide`.

## 1. New page: `src/pages/admin/DevGuidePage.tsx`

Docs-style layout with a sticky left section nav (active section tracked via `IntersectionObserver`) and a max-width content column. Uses the same admin shell, semantic tokens, and Card components as `RunsPage` / `SettingsPage`. Reuses the exact terminology used in the flow builder: **Trigger → Filters → Mapping → Action → Failure Policy → Test → Review**, and the entity names **Flow Templates, Flows, Connectors, Connector Capabilities, Connector Actions, Deployments, Runs**.

Top of page: an "Internal" badge plus the developer-facing summary callout from the brief.

The chain is stated explicitly and consistently across sections:

```
Five9 event ─► Flow Template ─► Flow (Trigger → Filters → Mapping → Action → Failure Policy)
                                       │                                      │
                                       ▼                                      ▼
                                 Deployment scope                Connector instance + Capability + Action
                                       │                                      │
                                       └──────────────► Run ──────────────────┘
                                          request/response, idempotency_key,
                                          source_event_id, retry_of, external_record_id
```

Sections:

1. **Overview** — what Fabric59 is becoming, why Five9 is the event spine, why legal systems (Clio, MyCase, Lawmatics, Litify, CosmoLex, PracticePanther, Smokeball) are connectors, why the product is template- and flow-driven. Calls out that the same architecture must serve client-owned Five9 accounts and shared workspace Five9.
2. **Core architecture** — defines each entity in the chain (Five9 event → Flow Template → Flow → Deployment → Connector + Capability + Action → Run) with one-line definitions and the ASCII diagram above.
3. **Flow types** — the five templates, each with Trigger / Purpose / Input shape / Output shape:
   - Disposition Webhook Flow
   - CRM Action Flow
   - Inbound Lookup Flow
   - Callback / Task Flow
   - Custom Relay Flow
4. **Connector model** — connector type, auth/config state, supported actions, capabilities, health checks. Examples: Clio, MyCase, Webhook, Custom HTTP. Notes that capabilities gate which templates and actions are selectable in the FlowBuilder.
5. **Deployment model** — why a saved flow is not live, scope dimensions (workspace, client, Five9 domain, campaign, queue, disposition, connector instance pinning), and why scope must support both shared and client-owned Five9.
6. **Runs and reliability** — `request_payload`, `response_payload`, `source_event_id`, `idempotency_key` (sha256 of `deployment_id:source_event_id`, reused on replay), `retry_of` chain, retry classification (retriable / non-retriable / unknown), `external_record_id`, Run Report export (JSON/CSV) bundling the full retry chain.
7. **MVP build priorities** — ordered: template selector → template-aware FlowBuilder → webhook/Custom HTTP execution with test-mode dispatch preview → Deployments scoping → Runs UI with retry/replay + idempotency-key search + Run Report → Connector capabilities surface → CRM action stubs → real CRM actions.
8. **Guardrails** — explicit "do not" list: no one-off Clio/MyCase admin pages, no canvas/node builder this phase, no breaking schema rewrites, no per-CRM mega-builders, no scope creep.

Content is embedded in the component for now but structured as data arrays (one entry per flow type, one per section) so it can move to markdown or a CMS later without touching layout.

## 2. Routing in `src/App.tsx`

Inside the existing admin route group, add:

```tsx
<Route path="dev-guide" element={<DevGuidePage />} />
<Route path="settings/dev-guide" element={<DevGuidePage />} />
```

Both `/admin/dev-guide` and `/admin/settings/dev-guide` resolve to the same page so the Settings deep-link and a direct URL both work.

## 3. Surface under Settings — `src/pages/admin/SettingsPage.tsx`

The existing Settings page uses a `Tabs` strip. Add a new **Dev Guide** tab (gated to master admins via `isMasterAdmin`) whose content is a single intro Card describing what the guide is, plus a primary "Open Dev Guide" button that navigates to `/admin/dev-guide`. This satisfies "easy to find under Settings → Dev Guide" without bloating SettingsPage with the full doc body.

## Acceptance check

- Master admins see a **Dev Guide** tab in Superadmin Settings; the button opens the dedicated page.
- `/admin/dev-guide` renders the full guide with working anchor nav and active-section highlighting.
- Five9 → Flow Template → Flow → Deployment → Connector → Run chain is stated identically in the diagram, the architecture section, and the flow-type entries; terminology matches the FlowBuilder steps.
- Visual style matches the rest of the admin shell (semantic tokens only, no custom colors).

## Out of scope

- Markdown/CMS backing (structure-only; content stays in the component).
- Public `/dev-guide` route (admin-only as specified).
- Editing UI for the doc content.
