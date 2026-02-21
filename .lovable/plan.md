

# Real-Time Log Streaming + AI-Led Call Flow Builder

## Overview

Two enhancements: (1) replace the 5-second polling on API Logs with true real-time streaming via Postgres changes, and (2) redesign the Call Flow Builder so the AI drives the conversation proactively, asking the user targeted questions step-by-step rather than waiting for open-ended input.

---

## 1. Real-Time Log Streaming for API Logs

### 1.1 Enable Realtime on api_logs Table

**New migration:**
```text
ALTER PUBLICATION supabase_realtime ADD TABLE public.api_logs;
```

### 1.2 Update useApiLogs Hook

**File: `src/hooks/useApiLogs.ts`**

- Keep the initial `useQuery` fetch for loading existing logs
- Remove `refetchInterval: 5000` (no more polling)
- Add a `useEffect` that subscribes to `supabase.channel('api-logs-realtime')` listening for `postgres_changes` (INSERT events on `api_logs`)
- On each new row, prepend it to the React Query cache via `queryClient.setQueryData`
- Clean up the subscription on unmount
- Add a live indicator state (`isLive: boolean`) exported from the hook
- Also invalidate `api-log-stats` query on new inserts

### 1.3 Update API Logs Page UI

**File: `src/pages/admin/ApiLogsPage.tsx`**

- Replace the "Refresh" button with a live/paused toggle
- Add a pulsing green dot indicator next to the page title when live streaming is active ("Live" badge)
- When paused, fall back to manual refresh
- New logs animate in with a brief highlight flash on the table row

### 1.4 Build Outline Update

**File: `src/data/buildMap.ts`**

- Change "Real-time Log Streaming" status from `planned` to `done`

---

## 2. AI-Led Call Flow Builder

### 2.1 Redesigned System Prompt

**File: `supabase/functions/ai-call-flow/index.ts`**

Update the system prompt so the AI takes the lead:

- On first message (or when conversation starts), AI introduces itself and asks the first question: "What industry or practice area is this call flow for?" with suggested options
- AI follows a structured interview flow:
  1. Industry/practice area
  2. What CRM they use (or want to use)
  3. What should happen when a call comes in (pre-call)
  4. What data needs to be captured during the call
  5. What should happen after the call ends (post-call)
  6. Which notification channels (Slack, email, calendar)
- After gathering enough info, AI generates the complete call flow configuration
- AI always provides clear options/suggestions the user can pick from rather than requiring free-form answers
- Uses a conversational, guided tone: "Great choice! Now let me ask about..."

### 2.2 Auto-Start Conversation

**File: `src/pages/admin/CallFlowBuilderPage.tsx`**

- When the AI Builder tab loads and messages are empty, automatically send an initial empty message (or a "start" trigger) so the AI greets and asks the first question
- Remove the suggestion buttons from the empty state (AI will provide its own suggestions inline)
- Replace the empty state with a brief loading animation while the AI's greeting streams in
- Add quick-reply buttons: when the AI asks a question with clear options, parse them and render as clickable chips below the message (user can click instead of typing)
- Add a "Start Over" button in the header to reset the conversation

### 2.3 Quick-Reply Chip Detection

**File: `src/pages/admin/CallFlowBuilderPage.tsx`**

- After AI finishes streaming a message, scan the content for patterns like numbered lists or bullet options
- If detected, render them as clickable `Button` chips below the message bubble
- Clicking a chip sends that option as the user's next message automatically
- This makes the experience feel more like a guided wizard than a blank chat

---

## Technical Details

- Realtime subscription uses the Supabase JS client's `.channel()` API with `postgres_changes` event type
- The realtime subscription respects existing RLS policies on `api_logs`
- Quick-reply parsing uses a simple regex to detect numbered/bulleted option patterns (e.g., "1. Legal" or "- Legal intake")
- The AI auto-start sends `[{ role: "user", content: "Start building a new call flow" }]` as the initial trigger, but the user message is hidden from the UI
- No new database tables or migrations needed beyond the realtime publication
- The system prompt update is the only change to the edge function

