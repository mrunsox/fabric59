import { Navigate } from "react-router-dom";

/**
 * Slice A — /faq is folded into /trust (canonical answers about platform,
 * security, CRMs, onboarding live there) with /contact as the fallback
 * for anything not covered. This route stays mounted as a compatibility
 * redirect so external links don't 404.
 */
export default function FaqPage() {
  return <Navigate to="/trust" replace />;
}
