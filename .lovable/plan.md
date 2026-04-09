

# Update /outline with Legal Connect Build Status

Based on the conversation history and codebase analysis, here's what has been built and what remains across all Legal Connect sessions plus the prior plan items.

## What's Been Built (mark as "done")

**Phase 1A** — Database schema (20 core tables + RLS)
**Phase 1B** — UI shell (10-tab LegalConnectPage, hooks, routing, nav)
**Session 1 (Multi-Tenant)** — `legal_connect_tenant_configs` table, client selector, onboarding wizard, `legal-connect-admin` edge function
**Session 1 (Webhook/Reliability)** — `legal_connect_failure_classifications` table, `legal-connect-webhooks` + `legal-connect-jobs` edge functions, ReliabilityPanel UI

## What Remains (mark as "planned" or "in-progress")

**Session 2 (Tenant Testing)** — test_runs/test_plans tables, `legal-connect-test` edge function, Testing tab UI, AI test plan generation
**Session 3 (Reporting/Reconciliation)** — call_records, billing_metrics, reconciliation tables, `legal-connect-reporting` edge function, Reporting tab UI
**Session 2 (Examples Library)** — examples table, seed data, Examples tab UI
**Session 3 (AI Prompt Packs)** — prompt_templates table, seed prompts, `legal-connect-ai` edge function, AI Setup overhaul, AgentContextPanel
**Phase 2** — Clio deep two-way sync (webhook ingestion, reverse sync, advanced disposition mapping, conflict management, operational dashboards)
**Phase 3** — MyCase capability-aware adapter
**Phase 4** — AI setup hardening + rollout readiness
**Phase 5** — Extensibility framework

## Changes to `src/data/buildMap.ts`

Add a new **"Legal Connect"** category with items reflecting all built and remaining work. This replaces scattering Legal Connect items across existing categories.

### Items to add:

| Item | Status |
|------|--------|
| Core Database Schema (20 tables + RLS) | done |
| UI Shell & Navigation (10-tab module) | done |
| CRUD Hooks (useLegalConnect) | done |
| Multi-Tenant Client Selector | done |
| Client Onboarding Wizard | done |
| Tenant Config & Security Hardening | done |
| Admin Edge Function (legal-connect-admin) | done |
| Webhook Receiver (legal-connect-webhooks) | done |
| Sync Job Processor (legal-connect-jobs) | done |
| Reliability Panel (Webhook Health, Dead Letter, Outage) | done |
| Failure Classification System | done |
| Tenant Testing Framework | planned |
| Five9 Reporting & Reconciliation | planned |
| Example Library & Seed Data | planned |
| AI Prompt Pack System | planned |
| AI Edge Function (legal-connect-ai) | planned |
| Agent Context Panel | planned |
| Clio Deep Two-Way Sync | planned |
| MyCase Capability-Aware Adapter | planned |
| Go-Live Readiness & Rollout Tools | planned |

Also update existing planned items:
- **Stripe Integration** (Billing) — stays planned
- **QR Code Inbound Routing** (Web Callback) — stays planned

## Technical Approach

Single edit to `src/data/buildMap.ts` — insert a new `"Legal Connect"` category object with 20 items after the existing categories (before the closing bracket). No other files need changes.

