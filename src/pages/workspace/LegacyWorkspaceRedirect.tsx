import { Navigate, useLocation, useParams } from "react-router-dom";

/**
 * Single-hop redirect: /app/workspaces/:workspaceId/* -> /w/:workspaceId/*
 * Preserves trailing path + search/hash for any legacy bookmark.
 */
export default function LegacyWorkspaceRedirect() {
  const { workspaceId } = useParams();
  const { pathname, search, hash } = useLocation();
  const prefix = `/app/workspaces/${workspaceId ?? ""}`;
  const tail = pathname.startsWith(prefix) ? pathname.slice(prefix.length) : "";
  const target = `/w/${workspaceId ?? ""}${tail || "/home"}${search}${hash}`;
  return <Navigate to={target} replace />;
}
