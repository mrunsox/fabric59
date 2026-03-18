

# Fix AI Campaign Builder — Two Critical Issues

There are two problems causing the AI builder to fail:

## Issue 1: Wrong Route (404)

The "Create Campaign Setup" button navigates to `/admin/campaign-intake`, but the actual route is `/admin/campaigns/new`. This is the 404 error in the console logs.

**Fix**: Update `AIBlueprintBuilder.tsx` line 165 to navigate to `/admin/campaigns/new`.

## Issue 2: No Prefill Support in Campaign Intake Page

`CampaignIntakePage` never reads `location.state.prefill`, so even if the route was correct, the AI-generated data would be lost.

**Fix**: Add `useLocation()` to `CampaignIntakePage` and merge `location.state?.prefill` into the initial intake state so the form is pre-populated.

## Issue 3: Weak PDF Text Extraction

The `parse-blueprint-doc` edge function uses a naive regex parser for PDFs (`Tj`/`TJ` operator matching), which fails on most modern PDFs (compressed streams, CIDFont text, etc.). This means uploaded PDFs likely extract as `[Could not extract text from PDF...]`, giving the AI nothing to work with.

**Fix**: Replace the basic regex parser with Lovable AI vision — upload the PDF pages as images and use Gemini to extract text. Alternatively, use a proper PDF parsing library. The simplest reliable approach is to send PDF content to the AI gateway for OCR-based extraction using multimodal capabilities.

## Files to Change

| File | Change |
|------|--------|
| `src/components/campaigns/AIBlueprintBuilder.tsx` | Fix navigation path to `/admin/campaigns/new` |
| `src/pages/admin/CampaignIntakePage.tsx` | Add `useLocation()` and merge `prefill` state into intake |
| `supabase/functions/parse-blueprint-doc/index.ts` | Improve PDF extraction using a more robust approach |

