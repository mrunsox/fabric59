

# Fix: Redeploy five9-provisioning Edge Function

## Problem

The `five9-provisioning` edge function code already contains all the campaign provisioning actions (`createSkill`, `createInboundCampaign`, `createCampaignProfile`, `addSkillsToCampaign`, `addDNISToCampaign`) at lines 413-473. However, the **deployed version is stale** and doesn't include these actions, causing the "Unknown action: createSkill" error.

## Fix

No code changes needed. Simply **redeploy** the `five9-provisioning` edge function so the live version matches the code.

## Verification

After redeployment, call the function with `{"action": "createSkill", "skillName": "test-deploy-check"}` to confirm it no longer returns "Unknown action". The call will likely fail with a Five9 SOAP error (e.g., permission or duplicate), but that confirms the action routing is working correctly.

