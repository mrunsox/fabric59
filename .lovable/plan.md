
The user wants to move the "Required Secrets and API Keys" section to the bottom of the `/outline` page, and reframe it as "to be built later" (i.e., representing the integrations still needing setup).

Looking at `OutlinePage.tsx`, the section currently sits near the top, right after Overall Progress and before the Categories. The user wants it moved to the bottom (after all categories render).

Simple reorganization — no logic changes. Just move the JSX block.

# Move Required Secrets Section to Bottom of /outline

## Change
In `src/pages/OutlinePage.tsx`, relocate the "Required Secrets and API Keys" card from its current position (above the categories) to **below** all rendered categories at the bottom of the `<main>` block.

## Optional Polish
- Update the section heading to clarify intent: **"Required Secrets and API Keys (To Be Configured Later)"**
- Add a one-line subheading: *"These external credentials unlock the remaining planned features."*

## Files Edited
- `src/pages/OutlinePage.tsx` — move the secrets `<div>` block from above the `sortedCategories.map(...)` to after it; tweak heading copy.

No other files, no DB, no new components.
