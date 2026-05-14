import { Navigate, useParams } from "react-router-dom";

/**
 * Tiny redirect helper for the retired /org/* shell. Substitutes the active
 * route params into the target template (e.g. "/admin/workspaces/:id") so
 * legacy /org/* deep links resolve to their canonical /admin/* equivalents.
 */
export function OrgParamRedirect({ to }: { to: string }) {
  const params = useParams();
  let resolved = to;
  for (const [k, v] of Object.entries(params)) {
    if (typeof v === "string") {
      resolved = resolved.replace(`:${k}`, v);
    }
  }
  return <Navigate to={resolved} replace />;
}
