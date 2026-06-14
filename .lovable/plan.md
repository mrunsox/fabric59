### Summary
Three tiny data-only changes to make the Assureway seed button always reachable, reflect re-run vs fresh load state, and add a console verification log.

### Changes

1. **WorkspaceCampaignsPage.tsx**
   - Remove `showSeed` gate and `useSearchParams` import.
   - Always render `<SeedAssurewayButton variant="secondary" hasExistingAssureway={campaigns.some(c => c.name === "Assureway")} />` next to the "New campaign" button.

2. **SeedAssurewayButton.tsx**
   - Accept new `hasExistingAssureway?: boolean` prop.
   - Show `RotateCw` icon + "Re-run Assureway sample" label when true; otherwise `Download` icon + "Load Assureway sample".
   - Replace `Sparkles` with `Loader2` / `Icon` pattern.

3. **useSeedAssurewaySample.ts**
   - At the end of `mutationFn`, add a `console.log("[seed-assureway] complete", { workspaceId, campaignId, campaignName: "Main Reception", stepCounts })` with the expected step count breakdown.

### Verification
- Navigate to `/w/<id>/campaigns` — both buttons visible.
- Click seed — console shows exact step counts object.
- Campaign list shows "Main Reception". Re-running is safe (idempotent).