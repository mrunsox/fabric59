

# Interactive Five9 Field Mapping Builder

## Overview

Build a visual, drag-and-drop field mapping system that:
1. Connects to Five9 API to pull available fields (contact fields, call variables, dispositions)
2. Provides an interactive canvas to visually connect Five9 fields to CRM/destination fields
3. Supports multiple output destinations (Clio, Workiz, Salesforce, webhook automation platforms)
4. Saves mappings per Five9 Domain + Tenant combination

---

## Architecture Flow

```text
+------------------+       +-------------------+       +------------------+
|   Five9 Domain   |       |  Mapping Builder  |       |   Destination    |
|    (Source)      |  -->  |    (Visual UI)    |  -->  |   (CRM/Webhook)  |
+------------------+       +-------------------+       +------------------+
       |                           |                          |
  API fields               Drag & Drop              Clio, Workiz,
  Call variables           connections             Zapier, Make, etc.
  Dispositions             Transform rules
  Custom fields
```

---

## Implementation Phases

### Phase 1: Five9 API Integration Edge Function

Create a backend function to fetch Five9 schema metadata:

| Endpoint | Description |
|----------|-------------|
| `GET /five9-schema?domain_id=xxx` | Fetch available fields from Five9 |

The function will:
1. Look up the Five9 domain's API credentials from the database
2. Call Five9 Admin Web Services API to retrieve:
   - Contact fields (name, phone, email, custom fields)
   - Call variables (ANI, DNIS, call duration, etc.)
   - Dispositions
   - Skills/Campaigns
3. Cache results for performance (with TTL)
4. Return a normalized schema structure

**Five9 API Methods to use:**
- `getContactFields` - Get all contact field definitions
- `getCallVariables` - Get call-level variables
- `getDispositions` - Get available dispositions
- `getSkills` - Get skill queue metadata

### Phase 2: Database Schema for Mappings

Add a new `field_mappings` table:

```sql
CREATE TABLE public.field_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  five9_domain_id UUID NOT NULL REFERENCES five9_domains(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  source_type TEXT NOT NULL DEFAULT 'five9', -- 'five9' or 'unified'
  destination_type TEXT NOT NULL, -- 'clio', 'workiz', 'salesforce', 'webhook'
  mappings JSONB NOT NULL DEFAULT '[]',
  transformations JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Mappings JSONB structure:**
```json
[
  {
    "id": "map_1",
    "sourceField": { "path": "contact.phone", "label": "Phone Number", "type": "string" },
    "targetField": { "path": "Contact.phone_numbers[0].number", "label": "Primary Phone", "type": "string" },
    "transform": null
  },
  {
    "id": "map_2", 
    "sourceField": { "path": "call.ANI", "label": "Caller ANI", "type": "string" },
    "targetField": { "path": "Matter.custom_field_values.caller_id", "label": "Caller ID", "type": "string" },
    "transform": { "type": "format_phone", "params": { "format": "E.164" } }
  }
]
```

### Phase 3: Visual Mapping Builder UI

Build an interactive canvas using **React Flow** (@xyflow/react):

**Left Panel - Source Fields (Five9):**
- Grouped by category (Contact, Call, Disposition)
- Draggable field nodes with type indicators
- Search/filter functionality
- "Refresh from Five9" button

**Center Canvas - Connection Area:**
- Draggable nodes representing field mappings
- Visual connections between source and target
- Click connection to add transformation
- Mini-map for navigation
- Zoom/pan controls

**Right Panel - Target Fields (CRM):**
- Based on selected CRM type (Clio, Workiz, etc.)
- Pre-defined field schemas per CRM
- Custom field support
- Validation indicators

**Top Toolbar:**
- Save mapping
- Test with sample data
- Export as JSON
- Duplicate mapping
- Version history

### Phase 4: CRM Field Schemas

Define target field schemas for each supported CRM:

**Clio Fields:**
```typescript
const clioSchema = {
  contact: [
    { path: "Contact.name", label: "Full Name", type: "string", required: true },
    { path: "Contact.email_addresses[0].address", label: "Email", type: "email" },
    { path: "Contact.phone_numbers[0].number", label: "Phone", type: "phone" },
    // ... more fields
  ],
  matter: [
    { path: "Matter.description", label: "Description", type: "text" },
    { path: "Matter.practice_area.name", label: "Practice Area", type: "string" },
    // ... more fields
  ]
};
```

**Workiz Fields:**
```typescript
const workizSchema = {
  client: [
    { path: "Client.name", label: "Client Name", type: "string", required: true },
    { path: "Client.phone", label: "Phone", type: "phone" },
    // ... more fields
  ],
  job: [
    { path: "Job.service_type", label: "Service Type", type: "string" },
    { path: "Job.priority", label: "Priority", type: "enum", options: ["low", "medium", "high"] },
    // ... more fields
  ]
};
```

### Phase 5: Transformation Rules

Support field transformations between mappings:

| Transform | Description | Example |
|-----------|-------------|---------|
| `format_phone` | Normalize phone format | `+14161234567` |
| `uppercase` | Convert to uppercase | `JOHN DOE` |
| `lowercase` | Convert to lowercase | `john@example.com` |
| `trim` | Remove whitespace | `John Doe` |
| `default` | Default value if empty | `N/A` |
| `template` | String template | `{first_name} {last_name}` |
| `lookup` | Map values | `high → Priority 1` |
| `regex_extract` | Extract with regex | `(\d{3})-(\d{4})` |

---

## UI Components to Build

| Component | Purpose |
|-----------|---------|
| `MappingBuilderPage.tsx` | Main page container |
| `FieldMappingCanvas.tsx` | React Flow canvas |
| `SourceFieldsPanel.tsx` | Left panel with Five9 fields |
| `TargetFieldsPanel.tsx` | Right panel with CRM fields |
| `FieldNode.tsx` | Custom node component |
| `MappingEdge.tsx` | Custom edge with transform indicator |
| `TransformDialog.tsx` | Modal to configure transformations |
| `MappingToolbar.tsx` | Top action bar |
| `TestMappingDialog.tsx` | Test with sample data |

---

## Files to Create/Modify

| File | Type | Description |
|------|------|-------------|
| `src/pages/admin/MappingBuilderPage.tsx` | Create | Visual mapping builder |
| `src/components/mapping-builder/FieldMappingCanvas.tsx` | Create | React Flow canvas |
| `src/components/mapping-builder/SourceFieldsPanel.tsx` | Create | Five9 fields sidebar |
| `src/components/mapping-builder/TargetFieldsPanel.tsx` | Create | CRM fields sidebar |
| `src/components/mapping-builder/nodes/FieldNode.tsx` | Create | Draggable field node |
| `src/components/mapping-builder/edges/MappingEdge.tsx` | Create | Connection edge |
| `src/components/mapping-builder/TransformDialog.tsx` | Create | Transform config modal |
| `src/hooks/useFieldMappings.ts` | Create | CRUD hooks for mappings |
| `src/hooks/useFive9Schema.ts` | Create | Fetch Five9 field schema |
| `src/lib/crm-schemas.ts` | Create | CRM field definitions |
| `supabase/functions/five9-schema/index.ts` | Create | Fetch Five9 metadata |
| Database migration | Create | Add `field_mappings` table |
| `src/App.tsx` | Modify | Add route |
| `src/components/layout/AdminLayout.tsx` | Modify | Add nav link |

---

## Dependencies to Add

| Package | Purpose |
|---------|---------|
| `@xyflow/react` | React Flow for visual connections |

---

## User Flow

1. **Navigate to Mapping Builder** → Select Five9 Domain
2. **System loads Five9 fields** → Displays in left panel grouped by category
3. **Select target CRM** → Loads CRM-specific fields in right panel
4. **Drag fields** → Create connections between source and target
5. **Add transforms** → Click connection to add data transformations
6. **Test mapping** → Try with sample data to validate
7. **Save** → Mapping stored and available for use in intakes

---

## Integration with Existing System

When an intake is processed:
1. Intake edge function receives unified payload
2. Loads active mapping for the tenant
3. Applies field mappings and transformations
4. Calls CRM adapter with mapped payload
5. Logs the result

This visual builder replaces the current JSON-based mapping in `MappingsPage.tsx` with an intuitive drag-and-drop interface, while maintaining backward compatibility with existing mapping configurations.

---

## Technical Considerations

**Five9 API Authentication:**
- Five9 uses SOAP/REST APIs with Basic Auth or API tokens
- Store encrypted credentials per domain
- Handle API rate limits with caching

**State Management:**
- React Flow handles canvas state internally
- Use React Query for API data
- Save to database on explicit save action

**Responsive Design:**
- Full-screen canvas mode for large workflows
- Mobile-friendly preview-only mode
- Collapsible panels for smaller screens

