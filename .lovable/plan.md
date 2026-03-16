

# Five9 API Documentation Audit — Fabric59 Cross-Reference

## Summary

After crawling Five9's Admin Web Services (WsAdminService) SOAP API documentation and cross-referencing every edge function, hook, and type in the codebase, the implementation is **strongly aligned** with Five9's official API. There are a few issues and opportunities worth addressing.

---

## Audit Results: What's Correct

### SOAP Envelope & Authentication
- All edge functions correctly use `http://service.admin.ws.five9.com/` namespace (`ser:` prefix) — matches the official WSDL
- Basic Authentication via `btoa(username:password)` is the documented auth method
- Username normalization (hyphens → spaces for non-email usernames) is a valid handling of Five9's plain-text username format

### User Management (Provisioning)
| Our Action | Five9 API Method | Status |
|---|---|---|
| `create` | `createUser(userInfo)` | Correct — uses `generalInfo`, `roles`, `password` structure |
| `deactivate` | N/A | **Issue** — see below |
| `getUserInfo` | `getUserInfo(userName)` | Correct |
| `getUsersGeneralInfo` | `getUsersGeneralInfo()` | Correct |
| `addSkillsToUser` | `addSkillsToUser(username, skills)` | Correct — uses `skillName` + `level` |

### Campaign Management
| Our Action | Five9 API Method | Status |
|---|---|---|
| `createInboundCampaign` | `createInboundCampaign(campaign)` | Correct |
| `createSkill` | `createSkill(skillInfo)` | Correct |
| `createCampaignProfile` | `createCampaignProfile(campaignProfile)` | Correct |
| `addSkillsToCampaign` | `addSkillsToCampaign(campaignName, skills)` | Correct |
| `addDNISToCampaign` | `addDNISToCampaign(campaignName, DNISList)` | Correct |
| `removeDNISFromCampaign` | `removeDNISFromCampaign(campaignName, DNISList)` | Correct |
| `removeSkillsFromCampaign` | `removeSkillsFromCampaign(campaignName, skills)` | Correct |
| `stopCampaign` | `stopCampaign(campaignName)` | Correct |
| `getCampaigns` | `getCampaigns()` | Correct |
| `getCampaignProfiles` | `getCampaignProfiles()` | Correct |
| `getCampaignDNISList` | `getCampaignDNISList(campaignName)` | Correct |
| `getInboundCampaign` | `getInboundCampaign(campaignName)` | Correct |
| `getCampaignDispositions` | N/A — not in API | **Issue** — see below |

### Dispositions
| Our Action | Five9 API Method | Status |
|---|---|---|
| `createDisposition` | `createDisposition(disposition)` | Correct |
| `getDispositions` | `getDispositions()` | Correct |
| `addDispositionsToCampaign` | `addDispositionsToCampaign(campaignName, dispositions)` | Correct |
| `modifyCampaignProfileDispositions` | `modifyCampaignProfileDispositions(profileName, ...)` | Correct — uses `addDispositionCounts` |

### Schema Discovery
| Our Action | Five9 API Method | Status |
|---|---|---|
| `getContactFields` | `getContactFields()` | Correct |
| `getCallVariables` | `getCallVariables()` | Correct |
| `getPrompts` | `getPrompts()` | Correct |
| `getSkills` | `getSkills()` | Correct |

### Contact/List Management
| Our Action | Five9 API Method | Status |
|---|---|---|
| `addRecordToList` | `addRecordToList(listName, listUpdateSettings, record)` | **Issue** — see below |

---

## Issues Found

### 1. API Version Inconsistency (five9-schema)
**File:** `supabase/functions/five9-schema/index.ts` line 175
**Problem:** Uses `https://api.five9.com/wsadmin/v2/AdminWebService` while all other functions use `v13`. Version 2 is very old and may lack newer fields/methods.
**Fix:** Change to `v13` to match the rest of the codebase.

### 2. `deactivate` Uses Wrong SOAP Method
**File:** `supabase/functions/five9-provisioning/index.ts` lines 126-133
**Problem:** Uses `<ser:setUserState>` but the Five9 API does not have a `setUserState` method. The correct approach is `modifyUser` with `<active>false</active>` in the `userGeneralInfo` element.
**Fix:** Replace with:
```xml
<ser:modifyUser>
  <userGeneralInfo>
    <userName>{username}</userName>
    <active>false</active>
  </userGeneralInfo>
</ser:modifyUser>
```

### 3. `getCampaignDispositions` May Not Exist
**File:** `supabase/functions/five9-provisioning/index.ts` line 503
**Problem:** The method `getCampaignDispositions` does not appear in the Five9 Admin API reference. The documented method is `getCampaignProfileDispositions(profileName)` which returns dispositions for a campaign profile, not a campaign directly.
**Fix:** Either use `getCampaignProfileDispositions` with the campaign's profile name, or remove this call and rely on the profile-level disposition query.

### 4. `addRecordToList` Missing `listUpdateSettings`
**File:** `supabase/functions/five9-provisioning/index.ts` lines 578-599
**Problem:** The Five9 API signature for `addRecordToList` requires three parameters: `listName`, `listUpdateSettings`, and `record`. Our implementation omits `listUpdateSettings`, which controls duplicate handling behavior (update on match, reject duplicates, etc.).
**Fix:** Add the required `listUpdateSettings` element:
```xml
<listUpdateSettings>
  <fieldsMapping>
    <columnNumber>0</columnNumber>
    <fieldName>number1</fieldName>
    <key>true</key>
  </fieldsMapping>
  <skipHeaderLine>false</skipHeaderLine>
  <cleanListBeforeUpdate>false</cleanListBeforeUpdate>
</listUpdateSettings>
```
Note: `addRecordToList` may actually work without explicit settings in some API versions — but for robustness and to match the WSDL contract, it should be included.

### 5. `createSkill` Uses Wrong Element Name
**File:** `supabase/functions/five9-provisioning/index.ts` lines 425-433
**Problem:** Uses `<skill><name>...</name></skill>` but the API expects `<skillInfo><name>...</name></skillInfo>` based on the `createSkill(skillInfo)` signature.
**Fix:** Change `<skill>` to `<skillInfo>`.

### 6. `createCampaignProfile` Uses Wrong Element Name
**File:** `supabase/functions/five9-provisioning/index.ts` lines 435-443
**Problem:** Uses `<profile><name>...</name></profile>` but the API expects `<campaignProfile><name>...</name></campaignProfile>` based on `createCampaignProfile(campaignProfile)`.
**Fix:** Change `<profile>` to `<campaignProfile>`.

---

## Opportunities — Five9 API Methods We Could Leverage

These are documented Five9 methods we don't currently use but align with existing Fabric59 features:

| Five9 Method | Fabric59 Feature It Would Enhance |
|---|---|
| `modifyUser` | Agent role changes, extension updates without recreating |
| `deleteUser` | Hard-delete during offboarding instead of just deactivating |
| `modifySkill` | Abandon Rate Engine — modify skill settings (queue callbacks) |
| `modifyIVRScript` | Abandon Rate Engine — inject callback modules into IVR scripts |
| `createWebConnector` | Auto-register Fabric59 webhook endpoints in Five9 |
| `getWebConnectors` | Verify webhook registration status |
| `runReport` / `getReportResult` | Pull Five9 reporting data into analytics dashboards |
| `getAgentGroups` / `modifyAgentGroup` | Manage agent groups for team-based provisioning |
| `getDNISList(selectUnassigned=true)` | Show available DNIS numbers during campaign setup |
| `createList` / `deleteList` | Manage dialing lists for web callback campaigns |
| `checkDncForNumbers` | Pre-validate numbers against DNC list before callback |
| `getCallCountersState` | Real-time call volume metrics for LiveMonitoringPanel |
| `getIVRScripts` | List IVR scripts for the call flow builder |
| `createIVRScript` | Push AI-generated call flows directly to Five9 |
| `getUserProfiles` | Fetch available user profiles for provisioning dropdown |
| `startCampaign` | Start campaigns from the Campaign Setup page |
| `forceStopCampaign` | Force-stop campaigns that won't respond to `stopCampaign` |
| `getReasonCode` / `createReasonCode` | Manage not-ready reason codes for agent status tracking |

---

## Implementation Plan

Fix the 6 issues identified above in `five9-provisioning/index.ts` and `five9-schema/index.ts`:

1. **`five9-schema`**: Change API URL from `v2` to `v13`
2. **`deactivate` action**: Replace `setUserState` with `modifyUser` using `active=false`
3. **`getCampaignDispositions`**: Replace with `getCampaignProfileDispositions` using the profile name from the campaign config
4. **`addRecordToList`**: Add `listUpdateSettings` element with sensible defaults
5. **`createSkill`**: Change `<skill>` to `<skillInfo>`
6. **`createCampaignProfile`**: Change `<profile>` to `<campaignProfile>`

No database changes needed. No new components. Pure edge function corrections.

