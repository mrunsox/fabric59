

# Add SaaS Feature Roadmap to Build Outline

## Overview

After analyzing the prompt against the current build map (15 categories, ~130 items), I identified 8 major new feature areas to add. Everything else in the prompt is already built or covered by existing categories.

## New Build Map Categories

### 1. Report59 -- Advanced Reporting (6 items)

Extends the existing Reports page with upload-based reporting, KPI dashboards, and automation monitoring.

| Item | Description | Status |
|------|-------------|--------|
| CSV/XLSX Upload Parser | Drag-drop file upload with column detection and preview | planned |
| Column Exclusion Editor | Select/deselect columns before import with saved presets | planned |
| KPI Dashboard Cards | Real-time stat cards for call volume, handle time, SLA, abandonment | planned |
| Automation Status Monitor | Visual status of post-call automations (email, CRM push, SMS) | planned |
| Report Charts | Recharts visualizations (bar, line, pie) for uploaded/live data | planned |
| Report Templates | Saved report configurations with one-click regeneration | planned |

### 2. Scripter Runtime (7 items)

An agent-facing call script console -- the core tool agents use during live calls.

| Item | Description | Status |
|------|-------------|--------|
| Script Preview Console | Retro monospace terminal-style script viewer for active calls | planned |
| Script Wizard Mode | Step-by-step guided script flow with branching navigation | planned |
| Call Timer Widget | Live call duration timer with hold/transfer/ACW phase tracking | planned |
| Knowledge Base Sidebar | Collapsible sidebar with searchable KB articles during calls | planned |
| After-Call Work (ACW) Panel | Post-call disposition entry, notes, and wrap-up form | planned |
| Callback Scheduler | Schedule follow-up callbacks with date/time and notes | planned |
| Script Variable Injection | Auto-populate script fields from Five9 call variables | planned |

### 3. Agent Dashboard (5 items)

A personalized retro-styled dashboard for individual agents (extends the existing User Dashboard).

| Item | Description | Status |
|------|-------------|--------|
| Agent Task Queue | Personal task list with priority, due dates, and status | planned |
| Call History Table | Agent's own call log with disposition, duration, timestamps | planned |
| Training Widget | Embedded training modules with progress tracking | planned |
| Performance Stats Cards | Personal metrics: calls handled, avg handle time, adherence | planned |
| Retro Bento Grid Layout | Responsive bento-style grid with monospace/terminal aesthetic | planned |

### 4. Supervisor Views (5 items)

Real-time monitoring dashboards for team leads and supervisors.

| Item | Description | Status |
|------|-------------|--------|
| Live Agent Status Board | Real-time view of agent states (available, on-call, ACW, break) | planned |
| Script Management Panel | View/edit/assign scripts to campaigns from supervisor view | planned |
| Disposition Stats Dashboard | Real-time disposition breakdown charts per campaign | planned |
| Agent Performance Rankings | Leaderboard with key metrics and trend indicators | planned |
| Queue Monitor | Live queue depth, wait times, and service level indicators | planned |

### 5. QA & Analytics (4 items)

Quality assurance tools for analyzing script adherence and call outcomes.

| Item | Description | Status |
|------|-------------|--------|
| Script Path Analysis | Visualize which script branches agents follow most | planned |
| Script Completion Rates | Track percentage of scripts completed vs. abandoned | planned |
| Call Quality Scoring | Configurable scoring rubric for call evaluations | planned |
| QA Review Queue | Flagged calls for supervisor review with annotation tools | planned |

### 6. Billing Module (5 items)

Per-minute billing and invoice management, Stripe-ready.

| Item | Description | Status |
|------|-------------|--------|
| Per-Minute Rate Config | Set billing rates per client/partner with tier support | planned |
| Invoice Generator | Auto-generate invoices from call duration data | planned |
| Invoice History | Searchable list of all invoices with status and PDF download | planned |
| Partner Billing Rollup | Aggregate billing across a partner's clients | planned |
| Stripe Integration | Connect Stripe for payment processing and subscription management | planned |

### 7. Post-Call Automations (4 items)

Automated actions triggered after call completion.

| Item | Description | Status |
|------|-------------|--------|
| AI Email Summary | Generate and send AI-powered call summary emails post-call | planned |
| SMS Notifications | Trigger SMS alerts via Twilio on specific dispositions | planned |
| Push Notifications | Browser/mobile push for urgent call outcomes | planned |
| Automation Rules Engine | Configure trigger conditions and action chains per campaign | planned |

### 8. Platform Utilities (3 items)

Cross-cutting infrastructure features.

| Item | Description | Status |
|------|-------------|--------|
| AI59 Import Tool | Import scripts, templates, and configs from AI59 exports | planned |
| Pabbly Five9 Auth Bridge | Proxy Five9 admin login via Pabbly for restricted API access | planned |
| Role-Based View Switcher | Sidebar role switcher (Agent/Supervisor/Admin/Client views) | planned |

## Technical Details

### File: `src/data/buildMap.ts`

Append 8 new `BuildCategory` entries to the `buildMap` array, adding 39 new planned items. All items will have `status: "planned"`. No existing categories or items will be modified.

### No Other Changes

- No database changes
- No edge function changes
- No route changes
- Only the build map data file is updated

## Summary

| Metric | Before | After |
|--------|--------|-------|
| Categories | 15 | 23 |
| Total Items | ~130 | ~169 |
| Done | ~130 | ~130 |
| Planned | 0 | 39 |
| Progress | ~100% | ~77% |

