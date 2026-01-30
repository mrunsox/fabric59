

# Fix RLS Infinite Recursion on organization_members

## Problem Summary

The `/system-access` login pathway is working correctly and the master admin role has been assigned successfully. However, after login, the application fails to load the user's organizations due to an **infinite recursion error** in the RLS policies on `organization_members`.

**Error**: `infinite recursion detected in policy for relation "organization_members"`

## Root Cause

The current RLS policies on `organization_members` contain self-referential queries:

```sql
-- This policy causes recursion - it queries organization_members 
-- while already being inside an RLS check on organization_members
CREATE POLICY "Org owners and admins can manage members"
ON public.organization_members FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members  -- RECURSION!
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
)
```

When the database tries to check if a user can SELECT from `organization_members`, it runs the policy which queries `organization_members`, which triggers the policy again, causing infinite recursion.

## Solution

Replace the self-referential policies with versions that use a `SECURITY DEFINER` helper function. This function bypasses RLS when checking membership, breaking the recursion cycle.

---

## Database Changes

### 1. Create New Helper Function

Create a function to check if a user is an org owner/admin, using `SECURITY DEFINER` to bypass RLS:

```sql
CREATE OR REPLACE FUNCTION public.is_org_owner_or_admin(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_members
    WHERE user_id = _user_id
      AND organization_id = _org_id
      AND role IN ('owner', 'admin')
  )
$$;
```

### 2. Replace Recursive Policies

Drop the problematic policies and create new ones using the helper functions:

**organization_members policies:**
```sql
-- Drop existing recursive policies
DROP POLICY "Org members can view own org members" ON public.organization_members;
DROP POLICY "Org owners and admins can manage members" ON public.organization_members;

-- New policy: Users can view their own membership
CREATE POLICY "Users can view own membership"
ON public.organization_members FOR SELECT
USING (user_id = auth.uid());

-- New policy: Users can view other members in their org (via helper function)
CREATE POLICY "Members can view org colleagues"
ON public.organization_members FOR SELECT
USING (
  organization_id IN (SELECT public.get_user_org_ids(auth.uid()))
);

-- New policy: Insert allowed for org creation (user adding themselves)
CREATE POLICY "Users can create membership for themselves"
ON public.organization_members FOR INSERT
WITH CHECK (user_id = auth.uid());

-- New policy: Owners/admins can add others (via helper function)
CREATE POLICY "Org admins can add members"
ON public.organization_members FOR INSERT
WITH CHECK (
  public.is_org_owner_or_admin(auth.uid(), organization_id)
);

-- New policy: Owners/admins can update/delete members
CREATE POLICY "Org admins can update members"
ON public.organization_members FOR UPDATE
USING (public.is_org_owner_or_admin(auth.uid(), organization_id));

CREATE POLICY "Org admins can delete members"
ON public.organization_members FOR DELETE
USING (public.is_org_owner_or_admin(auth.uid(), organization_id));
```

### 3. Fix Similar Issues on Other Tables

The same pattern exists on `five9_domains` and `tenants`. Update those to use helper functions too:

```sql
-- Drop and recreate for five9_domains
DROP POLICY "Org owners and admins can manage domains" ON public.five9_domains;
CREATE POLICY "Org owners and admins can manage domains"
ON public.five9_domains FOR ALL
USING (public.is_org_owner_or_admin(auth.uid(), organization_id))
WITH CHECK (public.is_org_owner_or_admin(auth.uid(), organization_id));

-- Drop and recreate for tenants  
DROP POLICY "Org owners and admins can manage tenants" ON public.tenants;
CREATE POLICY "Org owners and admins can manage tenants"
ON public.tenants FOR ALL
USING (public.is_org_owner_or_admin(auth.uid(), organization_id))
WITH CHECK (public.is_org_owner_or_admin(auth.uid(), organization_id));
```

---

## Summary of Changes

| Action | File/Table | Purpose |
|--------|------------|---------|
| Migrate | Database | Create `is_org_owner_or_admin()` helper function |
| Migrate | Database | Drop and replace `organization_members` policies |
| Migrate | Database | Drop and replace `five9_domains` policies |
| Migrate | Database | Drop and replace `tenants` policies |

---

## After Fix - Expected Behavior

1. User logs in via `/system-access`
2. System checks `user_roles` for `master_admin` - **already works**
3. System loads organizations via `organization_members` - **currently failing, will work after fix**
4. Master admin is redirected to `/master` dashboard

