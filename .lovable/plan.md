

# Update Build Outline with Campaign Setup Module

## What's Missing

The `buildMap.ts` file is missing the entire **Campaign Setup** category that was just built. This means the /outline page doesn't reflect ~15 new features. Everything else (109 items across 16 categories) is present and marked done+tested.

## Changes

### File: `src/data/buildMap.ts`

Add a new "Campaign Setup" category (insert after "Agent Lifecycle Management") with these items:

| Item | Description | Status | Tested |
|------|-------------|--------|--------|
| Campaigns Nav Item | Megaphone icon in sidebar navigation | done | true |
| Campaigns List Page | Table with status, progress, go-live date | done | true |
| Campaign Intake Form | 9-section collapsible intake with zod validation | done | true |
| Campaign Detail Page | Read-only summary + live checklist sidebar | done | true |
| Phone Numbers Section | ANI/DNIS multi-input with add/remove rows | done | true |
| Schedule and Coverage | 24/7 vs scheduled with after-hours handling | done | true |
| Prompt Selector | Dropdown populated from Five9 getPrompts API | done | true |
| Dispositions Section | Multi-select existing + create new dispositions | done | true |
| Connectors Section | Backend document, website, script connector inputs | done | true |
| Decision Tree Builder | Nested Q&A script editor with branching logic | done | true |
| Skill and User Assignment | Auto-suggested skill name + Five9 user multi-select | done | true |
| Campaign Checklist | 40-item grouped checklist with auto/manual/blocked states | done | true |
| Database Table | campaign_setups with JSONB intake_data and checklist_state | done | true |
| Five9 Campaign SOAP Actions | createInboundCampaign, createSkill, createCampaignProfile, addDNIS | done | true |
| Auto-Provisioning on Submit | Sequential Five9 API calls with checklist updates | planned | false |
| Custom VM Greeting Upload | Audio file upload to campaign-assets bucket | planned | false |
| Auto-Save Drafts | Debounced save on section change | planned | false |

This brings the total from 109 to 126 items, with 124 done and 3 planned -- giving an accurate picture of what's left before go-live.

## What's Left to Go Live

Beyond updating the outline, these are the remaining operational items:

1. **Auto-provisioning flow** -- wire the "Submit and Build" button to execute Five9 SOAP calls sequentially and update checklist items in real time
2. **VM greeting upload** -- connect the file upload UI to the campaign-assets storage bucket
3. **Auto-save drafts** -- add debounced save so intake form progress persists automatically
4. **Production API credentials** -- configure real Five9, Google Workspace, Resend, and Slack keys
5. **Live domain end-to-end test** -- run a full campaign setup against a real Five9 domain

Items 4 and 5 are operational (not code changes). Items 1-3 are the last code tasks.
