

# Multi-Select Quick Replies for Call Flow Builder

## Problem

Currently, quick-reply chips are single-select only -- clicking one immediately sends it as the user's answer. For questions like Pre-Call, During Call, Post-Call, and Notifications, users often need to select multiple options (e.g., both "CRM lookup" and "Screen pop").

## Solution

Two changes: update Alex's prompt to indicate which questions allow multiple selections, and update the UI to support toggle-style multi-select chips with a "Continue" button.

---

## 1. System Prompt Update

**File: `supabase/functions/ai-call-flow/index.ts`**

Update steps 3-6 in the interview flow to include "(select all that apply)" in the question text. Steps 1 and 2 (Industry, CRM) remain single-select since you can only be in one industry and use one primary CRM.

The prompt will instruct Alex to append "(select all that apply)" to multi-select questions so the frontend can detect which mode to use.

## 2. Frontend Multi-Select Mode

**File: `src/pages/admin/CallFlowBuilderPage.tsx`**

- Add a detection function: if the last assistant message contains "select all that apply" (case-insensitive), render chips in multi-select mode
- Add `selectedChips` state (`string[]`) to track toggled options
- In multi-select mode:
  - Chips act as toggles (outlined when unselected, filled/primary when selected)
  - A "Continue" button appears below the chips, enabled only when at least one chip is selected
  - Clicking "Continue" sends all selected options as a comma-separated string (e.g., "CRM lookup, Screen pop, Priority routing")
  - Reset `selectedChips` after sending
- In single-select mode (no "select all that apply"): chips behave as before -- click sends immediately

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/ai-call-flow/index.ts` | Add "(select all that apply)" to steps 3-6 in system prompt |
| `src/pages/admin/CallFlowBuilderPage.tsx` | Add `selectedChips` state, multi-select chip toggle logic, and "Continue" button |

