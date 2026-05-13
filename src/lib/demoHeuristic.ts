/**
 * Conservative demo/test heuristic — must match the SQL pattern in
 * preview_workspace_demo_data() / (G2) reset_workspace_demo_data().
 *
 * Matches names containing: test, demo, sandbox, please_ignore
 * OR starting with: old_
 */
const PATTERN = /(test|demo|sandbox|please_ignore)|^old_/i;

export function isDemoName(name: string | null | undefined): boolean {
  if (!name) return false;
  return PATTERN.test(name.trim());
}

export function partitionDemo<T extends { name: string | null }>(rows: T[]): {
  real: T[];
  demo: T[];
} {
  const real: T[] = [];
  const demo: T[] = [];
  for (const r of rows) (isDemoName(r.name) ? demo : real).push(r);
  return { real, demo };
}
