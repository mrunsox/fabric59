

# Add Admin Role for paul.joseph@outlook.com

## Overview

Add the admin role to the user `paul.joseph@outlook.com` so they can manage workflows and access admin features in Fabric59.

---

## User Details

| Field | Value |
|-------|-------|
| Email | paul.joseph@outlook.com |
| User ID | d06a7151-1163-448d-802e-61855681f9f9 |
| Current Roles | None |
| Role to Add | `admin` |

---

## What This Enables

With the `admin` role, this user will be able to:
- Create and manage tenants
- Configure CRM integrations
- Set up field mappings
- View API logs
- Manage notification settings
- Access the test console
- Create and manage API keys

---

## Implementation

Execute a single SQL insert to add the admin role:

```sql
INSERT INTO user_roles (user_id, role) 
VALUES ('d06a7151-1163-448d-802e-61855681f9f9', 'admin');
```

---

## Verification

After insertion, the user will:
1. Be able to log in at `/login`
2. Access the admin dashboard at `/admin`
3. See all admin menu items in the sidebar
4. Have full CRUD access to tenants, domains, and configurations

