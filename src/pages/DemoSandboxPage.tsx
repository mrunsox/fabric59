import { Navigate } from "react-router-dom";

/**
 * Slice A — /demo is retired as a standalone page.
 * Compatibility redirect: forward to /contact with intent=demo so the
 * walkthrough request flow is the single canonical entry point.
 */
export default function DemoSandboxPage() {
  return <Navigate to="/contact?intent=demo" replace />;
}
