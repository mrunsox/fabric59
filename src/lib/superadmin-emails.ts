/**
 * Hard-coded superadmin emails that always get a deterministic skip path
 * out of /onboarding (and a direct route to /superadmin from /launch and
 * /login), regardless of whether `isMasterAdmin` has resolved yet.
 */
export const SUPERADMIN_SKIP_EMAILS = [
  "pauljoseph@24hvirtual.com",
  "dev@unsox.com",
] as const;

export function isSuperadminSkipEmail(email?: string | null): boolean {
  if (!email) return false;
  return (SUPERADMIN_SKIP_EMAILS as readonly string[]).includes(
    email.toLowerCase()
  );
}
