

# Campaign Blueprint Bin

## What We're Building

A "Campaign Blueprints" feature — a place to upload/paste agent scripts, agent guides, IVR trees, disposition lists, and department configurations from existing Five9 campaigns. This serves as a reference library that can later be used to clone or auto-populate new campaign setups.

## Why

You have a complex 5-department campaign already built on Five9. You want to document how it's structured so we can reverse-engineer the pattern and replicate it for future campaigns.

## Database

New table: `campaign_blueprints`

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| organization_id | uuid FK → organizations | |
| name | text | e.g. "Client X - 5 Dept Inbound" |
| description | text | Overview of the campaign |
| departments | jsonb | Array of department configs (name, IVR #, skills, decision trees) |
| agent_scripts | jsonb | Array of { department, script_text } entries |
| agent_guide | text | Full agent guide markdown/text |
| dispositions | jsonb | Array of disposition names + types + email configs |
| ivr_flow | jsonb | IVR routing description (greeting, menu options, after-hours) |
| phone_numbers | jsonb | ANI/DNIS lists |
| connectors | jsonb | Web connectors, backend docs, websites |
| notes | text | Free-form notes |
| tags | text[] | Searchable tags like "legal", "5-dept", "complex" |
| created_by | uuid | |
| created_at | timestamptz | |
| updated_at | timestamptz | |

RLS: org-scoped read/write for authenticated users.

## New Page: `/admin/campaign-blueprints`

A dedicated page with:

1. **Blueprint List** — Cards showing saved blueprints with tags, department count, description
2. **Create/Edit Blueprint** — Multi-section form:
   - **Overview**: Name, description, tags
   - **Departments**: Add departments with name, IVR prompt #, skill, and a large text area for the agent script per department
   - **Agent Guide**: Single large text area for the full agent guide (paste-friendly)
   - **Dispositions**: List dispositions with type and email routing
   - **IVR Flow**: Greeting text, menu structure, after-hours handling
   - **Phone Numbers**: ANI/DNIS entries
   - **Notes**: Free-form
3. **"Use as Template" button** — Pre-fills the Campaign Intake form from a blueprint

## Files to Create/Modify

- **New**: `src/pages/admin/CampaignBlueprintsPage.tsx` — List + create/edit UI
- **New**: `src/hooks/useCampaignBlueprints.ts` — CRUD hooks
- **Modify**: `src/App.tsx` — Add route `/admin/campaign-blueprints`
- **Modify**: `src/components/layout/AdminLayout.tsx` — Add nav link
- **Migration**: Create `campaign_blueprints` table with RLS

## Flow

```text
Paste scripts/guides → Save Blueprint → Review → "Use as Template" → Campaign Intake pre-filled
```

