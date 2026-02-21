
# Add Domain Disconnect Option

## Overview

Add a "Disconnect Domain" action below the API credentials section on the Domain Detail page. This clears the stored Five9 credentials and resets the connection status back to "Not Connected" without deleting the domain itself.

## What It Does

When clicked, shows a confirmation dialog explaining the action will:
- Clear the Five9 username and password
- Reset the connection status to "pending"
- Keep the domain record and all other settings intact

## Technical Changes

### File: `src/pages/admin/DomainDetailPage.tsx`

1. Add a `handleDisconnect` function that calls `updateDomain.mutateAsync` with:
   - `five9_username: ""`
   - `five9_password: ""`
   - And resets `api_connection_status` to `"pending"` via a separate update or by clearing the credential fields (the status column needs updating too)

2. Add a new section after the Help Text block (around line 445), inside the API tab content, wrapped in an `AlertDialog` for confirmation:
   - A destructive-styled card with an `Unplug` icon
   - Title: "Disconnect Domain"
   - Description: "Remove API credentials and disconnect from Five9. The domain record and all other settings will be preserved."
   - A "Disconnect" button that triggers the confirmation dialog
   - Only visible when `canManage` is true and `api_connection_status === "connected"`

3. The confirmation dialog warns that active integrations relying on this connection will stop working.

### File: `src/hooks/useDomains.ts`

Update `useUpdateDomain` to also support setting `api_connection_status` in the update payload (add it to the `updateData` mapping if `data.api_connection_status` is provided). This requires adding `api_connection_status` to the accepted data shape.

## Files Changed

| File | Change |
|------|--------|
| `src/pages/admin/DomainDetailPage.tsx` | Add Disconnect card + confirmation dialog in API tab |
| `src/hooks/useDomains.ts` | Allow `api_connection_status` in update mutation |
