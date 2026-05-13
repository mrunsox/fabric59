import { useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ArrowRight, MailCheck } from "lucide-react";
import { AuthShell } from "@/shells/AuthShell";

/**
 * Phase 9 — Invite-accept landing.
 * Honest minimal stub: invites are issued via the in-app InviteMemberDialog.
 * Authenticated users are forwarded into workspace bootstrap; unauthenticated
 * users are sent to signup with the invite preserved.
 */
export default function AcceptInvitePage() {
  const [params] = useSearchParams();
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const token = params.get("token");

  // Phase 2 — authenticated invite recipients route through /launch so the
  // smart org+workspace decision matrix lands them in the right canonical
  // destination. Invite token is preserved for downstream consumption.
  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated) {
      const target = token ? `/launch?invite=${encodeURIComponent(token)}` : "/launch";
      navigate(target, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, token]);

  return (
    <AuthShell
      title="Accept invite | Fabric59"
      description="Accept your Fabric59 workspace invite."
      heading={
        <span className="flex items-center gap-2.5">
          <MailCheck className="h-6 w-6 text-primary" />
          You've been invited
        </span>
      }
      subheading="Sign in or create an account to accept your invitation and land inside your workspace."
    >
      <div className="space-y-3">
        <Button asChild className="w-full h-11">
          <Link to={`/signup${token ? `?invite=${encodeURIComponent(token)}` : ""}`}>
            Create account <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="outline" className="w-full h-11">
          <Link to={`/login${token ? `?invite=${encodeURIComponent(token)}` : ""}`}>
            I already have an account
          </Link>
        </Button>
        <p className="text-[11px] text-muted-foreground pt-2 leading-relaxed">
          Workspace invites are currently provisioned by an organization admin from the in-app
          invite dialog. Tokenized self-serve invite links land here once the backend wiring is in.
        </p>
      </div>
    </AuthShell>
  );
}
