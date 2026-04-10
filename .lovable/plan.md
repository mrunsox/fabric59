

# Make Site Light Mode Only — White Background

## Changes Required

### 1. Update CSS variables in `src/index.css`
- Change `:root` `--background` from `220 20% 97%` to `0 0% 100%` (pure white)
- Keep the `.dark` block but it won't be activated anywhere

### 2. Remove `dark` class from all 13 files
Every file currently forces dark mode via `className="dark ..."`. Remove the `dark` class from each:

| File | Lines |
|------|-------|
| `src/pages/LandingPage.tsx` | line 100 |
| `src/pages/auth/LoginPage.tsx` | lines 38, 58 |
| `src/pages/auth/SignupPage.tsx` | lines 33, 55 |
| `src/pages/auth/ForgotPasswordPage.tsx` | line 36 |
| `src/pages/auth/ResetPasswordPage.tsx` | lines 66, 73 |
| `src/pages/auth/SystemAccessPage.tsx` | line 57 |
| `src/pages/OutlinePage.tsx` | line 54 |
| `src/pages/onboarding/OnboardingPage.tsx` | lines 67, 412 |
| `src/components/layout/MasterLayout.tsx` | line 31 |
| `src/components/auth/ProtectedRoute.tsx` | line 11 |
| `src/components/auth/MasterProtectedRoute.tsx` | line 11 |
| `src/components/marketing/MegaMenuHeader.tsx` | lines 54, 213 |
| `src/components/marketing/MegaFooter.tsx` | line 43 |

### 3. Fix marketing gradient backgrounds
The landing page, login, and signup pages use dark gradient backgrounds (e.g., `from-[#0a0f1c]`). These need to be updated to light equivalents — white/light gray gradients with the brand primary/accent colors as subtle accents.

### 4. Fix text colors
Dark-mode pages use `text-white`, `text-gray-300`, `text-gray-400` etc. These need to flip to `text-foreground`, `text-muted-foreground`, `text-gray-600` etc. for readability on white.

This is a straightforward find-and-replace across the 13 files — no structural changes, all functionality preserved.

