
# Five9 API Credentials and SOAP Integration

## Overview

This plan implements secure Five9 API credential management and real SOAP API integration to dynamically fetch contact fields, call variables, and dispositions from connected Five9 domains.

---

## Architecture

### Five9 Admin Web Services API

Five9 uses a **SOAP-based API** with Basic Authentication:
- **Endpoint**: `https://api.five9.com/wsadmin/v2/AdminWebService`
- **Authentication**: HTTP Basic Auth (username:password base64 encoded)
- **Available Operations**: `getContactFields`, `getCallVariables`, `getDispositions`, `getCampaigns`

### Data Flow

```text
+------------------+     +-------------------+     +------------------+
|  Domain Detail   | --> |  test-five9-      | --> |  Five9 Admin     |
|  Page (UI)       |     |  connection       |     |  Web Services    |
+------------------+     +-------------------+     +------------------+
        |                        |                         |
        v                        v                         v
  Save Credentials         Validate Auth            Return Schema
        |                        |                         |
        v                        v                         v
+------------------+     +-------------------+     +------------------+
|  five9_domains   | <-- |  five9-schema     | <-- |  SOAP Response   |
|  (encrypted)     |     |  (fetch fields)   |     |  (parsed XML)    |
+------------------+     +-------------------+     +------------------+
```

---

## Database Changes

### Add New Columns to five9_domains Table

| Column | Type | Purpose |
|--------|------|---------|
| `five9_username` | text | Five9 admin username for API access |
| `five9_password_encrypted` | text | Encrypted password for API access |
| `api_connection_status` | text | Connection status: pending, connected, failed |
| `last_connection_test` | timestamptz | Timestamp of last successful connection test |

```sql
ALTER TABLE five9_domains
  ADD COLUMN IF NOT EXISTS five9_username text,
  ADD COLUMN IF NOT EXISTS five9_password_encrypted text,
  ADD COLUMN IF NOT EXISTS api_connection_status text DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS last_connection_test timestamptz;
```

---

## Files to Create/Modify

### New Files

| File | Purpose |
|------|---------|
| `supabase/functions/test-five9-connection/index.ts` | Test API credentials and return connection status |

### Modified Files

| File | Changes |
|------|---------|
| `src/pages/admin/DomainDetailPage.tsx` | Add "API Credentials" tab with credential form and test button |
| `src/types/database.ts` | Add new fields to Five9Domain interface |
| `src/hooks/useDomains.ts` | Update to handle new credential fields |
| `supabase/functions/five9-schema/index.ts` | Implement real SOAP API calls to Five9 |

---

## Detailed Implementation

### 1. DomainDetailPage.tsx - New API Credentials Tab

Add a fourth tab "API Credentials" to the existing tabs:

```tsx
<TabsList>
  <TabsTrigger value="general">General</TabsTrigger>
  <TabsTrigger value="api">API Credentials</TabsTrigger>  {/* NEW */}
  <TabsTrigger value="workflow">Workflow</TabsTrigger>
  <TabsTrigger value="branding">Branding</TabsTrigger>
</TabsList>
```

The API Credentials tab will contain:
- **Five9 Username** input field
- **Five9 Password** input field (password type, with show/hide toggle)
- **Connection Status** badge showing current status
- **Test Connection** button that calls the test endpoint
- **Last Tested** timestamp display
- Help text explaining where to find Five9 API credentials

### 2. test-five9-connection Edge Function

Creates a new backend function that:
1. Receives domain ID from the request
2. Fetches stored credentials from database
3. Makes a simple SOAP call to Five9 (`getContactFields`)
4. Returns success/failure status
5. Updates the domain's connection status in database

```typescript
// SOAP envelope for testing connection
const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:ser="http://service.admin.ws.five9.com/">
  <soapenv:Header/>
  <soapenv:Body>
    <ser:getContactFields/>
  </soapenv:Body>
</soapenv:Envelope>`;

// Make request with Basic Auth
const response = await fetch("https://api.five9.com/wsadmin/v2/AdminWebService", {
  method: "POST",
  headers: {
    "Content-Type": "text/xml;charset=UTF-8",
    "SOAPAction": "",
    "Authorization": `Basic ${btoa(`${username}:${password}`)}`
  },
  body: soapEnvelope
});
```

### 3. five9-schema Edge Function Update

Modify the existing function to:
1. Fetch credentials from the domain record
2. Construct SOAP requests for each schema type
3. Parse XML responses into JSON format
4. Return combined schema with real Five9 data

SOAP operations to implement:
- `getContactFields` - Returns custom contact fields
- `getCallVariables` - Returns call-attached data variables  
- `getDispositions` - Returns disposition codes

### 4. Type Updates

```typescript
// src/types/database.ts
export interface Five9Domain {
  id: string;
  organization_id: string;
  domain: string;
  display_name: string;
  api_key_encrypted: string | null;
  five9_username: string | null;           // NEW
  five9_password_encrypted: string | null; // NEW
  api_connection_status: string | null;    // NEW
  last_connection_test: string | null;     // NEW
  workflow_settings: WorkflowSettings;
  status: Five9DomainStatus;
  created_at: string;
  updated_at: string;
}

export interface Five9DomainFormData {
  domain: string;
  display_name: string;
  api_key?: string;
  five9_username?: string;      // NEW
  five9_password?: string;      // NEW
  workflow_settings?: WorkflowSettings;
}
```

---

## UI Design for API Credentials Tab

```text
+----------------------------------------------------------+
|  API Credentials                                          |
|  Connect to Five9 Admin Web Services                      |
+----------------------------------------------------------+
|                                                           |
|  Five9 Username                                           |
|  +----------------------------------------------+         |
|  | admin@yourdomain.five9.com                   |         |
|  +----------------------------------------------+         |
|  Your Five9 administrator username                        |
|                                                           |
|  Five9 Password                                           |
|  +----------------------------------------------+ [👁]    |
|  | ••••••••••••••••                             |         |
|  +----------------------------------------------+         |
|  Password is encrypted and stored securely                |
|                                                           |
|  +--------------------------------------------------+     |
|  |  Connection Status                                |     |
|  |  [🟢 Connected]  Last tested: Jan 30, 2026 2:45 PM|     |
|  +--------------------------------------------------+     |
|                                                           |
|  [Test Connection]  [Save Credentials]                    |
|                                                           |
|  ℹ️ Find your API credentials in Five9 VCC Administrator  |
|     under User Management > Users                         |
+----------------------------------------------------------+
```

---

## Security Considerations

1. **Password Storage**: Passwords are stored encrypted in the database using the existing `pgcrypto` pattern
2. **Credential Transmission**: All API calls use HTTPS
3. **Access Control**: Only org owners/admins can view and modify credentials
4. **Password Masking**: Passwords are never returned to the frontend after saving
5. **Audit Logging**: Connection tests are logged for security auditing

---

## Implementation Order

1. **Database Migration**: Add new columns to `five9_domains` table
2. **Type Updates**: Update TypeScript interfaces in `database.ts`
3. **Hook Updates**: Modify `useDomains.ts` to handle new fields
4. **UI Tab**: Add API Credentials tab to `DomainDetailPage.tsx`
5. **Test Connection Function**: Create `test-five9-connection` edge function
6. **Schema Function Update**: Modify `five9-schema` to use real API calls
7. **Testing**: Verify end-to-end credential flow

---

## Summary

This implementation adds secure Five9 API credential management through:
- A new "API Credentials" tab on the Domain Detail page
- Secure storage of Five9 username/password in the database
- A "Test Connection" button that validates credentials against Five9's SOAP API
- Real-time fetching of contact fields, call variables, and dispositions from the connected Five9 domain

The solution follows the existing security patterns (encrypted credential storage) and maintains the multi-tenant architecture where each organization manages their own Five9 domains independently.
