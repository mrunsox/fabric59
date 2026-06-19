/**
 * BbPermissionDenied — Phase 1.
 *
 * Used for real, existing, permission-gated Brain resources (e.g. Settings,
 * Health). True unknown routes still fall through to the global 404 — do not
 * use this component for those.
 */
import { ReactNode } from "react";
import { BbStateBlock } from "./BbStateBlock";

interface Props {
  /** What the user was trying to reach, e.g. "Brain Settings". */
  resource: string;
  /** Role(s) required, e.g. "workspace admin or owner". */
  requiredRole: string;
  /** Optional surface-specific action (e.g. a "Back to Brain" link). */
  action?: ReactNode;
}

export function BbPermissionDenied({ resource, requiredRole, action }: Props) {
  return (
    <BbStateBlock
      kind="noPermission"
      data-testid="bb-permission-denied"
      title={`You don't have access to ${resource}.`}
      description={<>Ask your {requiredRole} to grant access or open it for you.</>}
      action={action}
    />
  );
}

export default BbPermissionDenied;
