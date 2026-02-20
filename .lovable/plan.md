
# Fix: Domain Connection Retry Flow (Duplicate Insert Bug)

## What's Broken

When a domain connection test fails (e.g. wrong credentials), the dialog shows a "Try Different Credentials" button. Clicking it resets the UI back to the form — but the domain record **has already been inserted** into the database with the first attempt.

When the user fills in corrected credentials and clicks "Connect Domain" again, `handleAddDomain` runs another **INSERT** instead of **updating** the existing record. This creates a second orphaned domain row in the database every retry attempt.

The fix must turn the retry submit into an **UPDATE + re-test** rather than an INSERT.

## Root Cause

In `DomainsPage.tsx`, `handleAddDomain`:

1. Inserts the domain → saves `createdDomainId`
2. Runs the connection test
3. On failure, `handleRetryCredentials()` resets `connectionStatus` to `"idle"` but does **not** clear `createdDomainId`
4. On re-submit, `handleAddDomain` ignores `createdDomainId` and does a fresh `INSERT`

## Fix

In `handleAddDomain`, check if `createdDomainId` already has a value. If it does, **UPDATE** the existing record instead of inserting a new one:

```typescript
const handleAddDomain = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!organization) return;
  setIsSubmitting(true);

  const derivedDomain = five9Username.includes("@")
    ? five9Username.split("@")[1]
    : newDisplayName.toLowerCase().replace(/\s+/g, "-");

  try {
    let domainId: string;

    if (createdDomainId) {
      // Domain was already created on a previous attempt — update it
      const { error: updateError } = await supabase
        .from("five9_domains")
        .update({
          display_name: newDisplayName,
          five9_username: five9Username,
          five9_password_encrypted: five9Password,
        })
        .eq("id", createdDomainId);

      if (updateError) throw updateError;
      domainId = createdDomainId;
    } else {
      // First attempt — insert
      const { data, error: insertError } = await supabase
        .from("five9_domains")
        .insert({
          organization_id: organization.id,
          domain: derivedDomain,
          display_name: newDisplayName,
          five9_username: five9Username,
          five9_password_encrypted: five9Password,
        })
        .select()
        .single();

      if (insertError) throw insertError;
      domainId = data.id;
      setCreatedDomainId(domainId);
    }

    setConnectionStatus("testing");
    setIsSubmitting(false);

    // Run connection test with the saved domain ID
    try {
      const { data: session } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-five9-connection`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.session?.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ domain_id: domainId }),
        }
      );
      const result = await response.json();
      // ... rest unchanged
    }
  }
};
```

## What the Fix Does

- On **first submit**: inserts the domain, saves the ID, runs the test.
- On **retry** (after "Try Different Credentials"): updates the **same** domain row with corrected credentials, re-runs the test — no duplicate.
- On **success**: auto-closes as before.
- On **"Save Anyway"**: closes as before. The single domain record persists.

## Also: Delete the orphaned domain on dialog cancel

Currently, if the user closes the dialog mid-retry (with a `createdDomainId` already saved and status `"failed"`), the domain record remains in the DB in a failed state — which is correct, since the user can update credentials in Domain Settings. No change needed here.

## Files to Modify

| File | Change |
|---|---|
| `src/pages/admin/DomainsPage.tsx` | Rewrite `handleAddDomain` to branch on `createdDomainId`: UPDATE on retry, INSERT on first attempt |

No edge function changes. No database schema changes. No migration needed.
