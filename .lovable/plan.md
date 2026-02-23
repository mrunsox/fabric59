

# Build, Finish & Test: 3 Remaining Planned Features

These are the last 3 items marked "planned" on the /outline page. After implementing them, the outline will be at 100%.

---

## 1. Auto-Save Drafts (Campaign Intake Form)

**What it does:** Automatically saves the intake form as a draft every few seconds so users don't lose work.

**Changes to `src/pages/admin/CampaignIntakePage.tsx`:**
- Add a `useRef` to hold a debounce timer and track the last-saved state
- Add a `useEffect` that watches `intake` and `selectedDomainId` changes
- After 2 seconds of no changes, auto-save as "draft" silently (no toast spam)
- Show a subtle "Auto-saved" indicator near the header (small text with timestamp)
- Only auto-save when: (a) campaign name and client name are filled, AND (b) there's an existing `id` or the form has been saved at least once
- Skip auto-save if the form is pristine (matches the last saved state)

---

## 2. Custom VM Greeting Upload

**What it does:** Connects the file upload input in Section 4 (Prompts) to the `campaign-assets` storage bucket so audio files are actually uploaded and stored.

**Changes to `src/pages/admin/CampaignIntakePage.tsx`:**
- When the user selects a file via the "Upload custom" radio option, upload it immediately to the `campaign-assets` bucket using `supabase.storage.from('campaign-assets').upload()`
- Use a path like `vm-greetings/{orgId}/{timestamp}-{filename}`
- Get the public URL after upload and store it in `intake.vmGreetingFileUrl`
- Show a loading spinner during upload and a success indicator after
- Display the uploaded file name with a small "play" or "remove" action

**Changes to `src/hooks/useCampaignSetup.ts`:**
- Add a `useUploadVmGreeting` mutation hook that handles the storage upload logic

**Storage policy:** Check if the bucket has appropriate policies. If not, add an INSERT policy for authenticated users.

---

## 3. Auto-Provisioning on Submit

**What it does:** When the user clicks "Submit and Build", execute Five9 SOAP API calls sequentially and update the campaign checklist in real-time as each step completes.

**Changes to `src/hooks/useCampaignSetup.ts`:**
- Add a `useAutoProvision` mutation hook that:
  1. Calls `createSkill` with the intake's `skillName` -- updates checklist `obj_skill`
  2. Calls `createInboundCampaign` -- updates checklist `obj_campaign`
  3. Calls `createCampaignProfile` -- updates checklist `obj_profile`
  4. Calls `addSkillsToCampaign` -- updates checklist `sk_campaign`
  5. Calls `addDNISToCampaign` for each DNIS number -- updates checklist `cmp_dnis`
  6. Calls `createDispositions` for new dispositions -- updates checklist `cmp_dispos`
  7. Calls `addDispositionsToCampaign` -- links dispositions to campaign
  - Each step updates the checklist state in the database after completion
  - Returns a progress callback so the UI can show real-time step status

**Changes to `src/pages/admin/CampaignIntakePage.tsx`:**
- Modify the "Submit and Build" button handler to trigger auto-provisioning after saving
- Show a modal/stepper overlay with the provisioning progress (similar to the agent onboarding workflow stepper)

**Changes to `src/pages/admin/CampaignDetailPage.tsx`:**
- Add a "Run Provisioning" button for campaigns in "submitted" status that haven't been provisioned yet

---

## 4. Update Build Map

**Changes to `src/data/buildMap.ts`:**
- Change all 3 planned items to `status: "done", tested: true`

---

## Technical Sequence

1. Auto-Save Drafts (simplest, no backend changes)
2. VM Greeting Upload (storage integration)
3. Auto-Provisioning (most complex, sequential API calls + real-time UI)
4. Update buildMap.ts to mark all 3 as done

