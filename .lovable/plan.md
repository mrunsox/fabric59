
The user wants to finish item #5 from the remaining list: **Lifecycle Email Templates (Resend)**.

Per the transactional email guide, I should default to **Lovable Emails** (built-in) rather than Resend, since the user hasn't explicitly named Resend as their required provider. Lovable Emails is zero-config and uses the same underlying infrastructure without requiring API keys.

# Lifecycle Email Templates Implementation

## What This Builds

A complete app-email system for lifecycle notifications using Lovable's built-in email infrastructure (no API key, no domain setup blocking work, no third-party signup).

## Lifecycle Templates to Create

Based on the platform's existing notification triggers (visible in `useNotifications`, agent provisioning, campaign lifecycle, Legal Connect):

1. **welcome** — sent after signup completes
2. **agent-provisioned** — sent when an agent's Five9 credentials are created
3. **agent-deprovisioned** — sent when an agent is offboarded
4. **campaign-launched** — sent to client when their campaign goes live
5. **campaign-paused** — sent when outage mode pauses a campaign
6. **invite-team-member** — sent when an admin invites a new user
7. **password-changed** — security confirmation after password change
8. **weekly-summary** — weekly client digest (per-recipient, triggered by cron, one row per client)

## Setup Sequence

1. Run `email_domain--setup_email_infra` to create queues, RPC wrappers, suppression tables, cron job
2. Run `email_domain--scaffold_transactional_email` to scaffold `send-transactional-email`, `handle-email-unsubscribe`, `handle-email-suppression` Edge Functions
3. Create 8 React Email `.tsx` templates in `supabase/functions/_shared/transactional-email-templates/`, styled with Fabric59 brand (cyan #0EA5E9, white background, Inter font)
4. Register all 8 in `registry.ts` with `previewData` for dashboard preview
5. Create unsubscribe page at `/unsubscribe` (path determined by scaffold tool) matching brand styling
6. Wire trigger calls into existing flows:
   - `SignupPage` → welcome
   - `useProvisionAgent` hook → agent-provisioned
   - `useDeprovisionAgent` hook → agent-deprovisioned
   - Campaign start/stop actions → campaign-launched / campaign-paused
   - `invite-member` edge function → invite-team-member
   - Password change handler → password-changed
   - Skip cron-based weekly-summary trigger for now (just create template)
7. Deploy edge functions
8. Add an **Email Templates** admin page at `/admin/emails` listing all templates with preview links and the unsubscribe stats
9. Flip the Resend item in `buildMap.ts` from `planned` to `done` (rename to "Lifecycle Email Templates" since we're using Lovable Emails, not Resend)

## Files

**New (~12):**
- `supabase/functions/_shared/transactional-email-templates/welcome.tsx`
- `supabase/functions/_shared/transactional-email-templates/agent-provisioned.tsx`
- `supabase/functions/_shared/transactional-email-templates/agent-deprovisioned.tsx`
- `supabase/functions/_shared/transactional-email-templates/campaign-launched.tsx`
- `supabase/functions/_shared/transactional-email-templates/campaign-paused.tsx`
- `supabase/functions/_shared/transactional-email-templates/invite-team-member.tsx`
- `supabase/functions/_shared/transactional-email-templates/password-changed.tsx`
- `supabase/functions/_shared/transactional-email-templates/weekly-summary.tsx`
- `src/pages/UnsubscribePage.tsx`
- `src/pages/admin/EmailTemplatesPage.tsx`

**Edited (~8):**
- `supabase/functions/_shared/transactional-email-templates/registry.ts` (register all 8)
- `src/App.tsx` (add `/unsubscribe` and `/admin/emails` routes)
- `src/pages/auth/SignupPage.tsx` (welcome trigger)
- `src/hooks/useAgents.ts` or provisioning hook (agent triggers)
- Campaign start/stop flow file (campaign triggers)
- `supabase/functions/invite-member/index.ts` (invite trigger)
- Password change flow (security trigger)
- `src/data/buildMap.ts` (flip status to `done`)

## Domain Note

The user will need to set up an email sending domain via the Lovable Cloud Emails UI for emails to actually send to real addresses. The infrastructure, templates, and triggers all work without it; emails just queue until the domain is verified. I'll surface a clear note in the new Email Templates admin page explaining how to verify the sending domain.

## What This Is NOT

- Not Resend (Lovable Emails is the recommended built-in path; no API key needed)
- Not marketing/bulk emails (each template is 1:1 triggered by a specific event)
- Not a newsletter system

If you specifically want Resend instead of Lovable Emails, say "use Resend" and I'll swap the approach to connect the Resend connector and route through its gateway.
