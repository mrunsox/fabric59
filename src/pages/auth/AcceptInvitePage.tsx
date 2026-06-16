import { useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ArrowRight, MailCheck, Info } from "lucide-react";
import { AuthShell } from "@/shells/AuthShell";

/**
 * Phase 9 — Invite-accept landing.
 *
 * Tokenized invite acceptance is not yet wired to a server-side function.
 * Rather than silently routing recipients into /launch (where their token
 * is dropped on the floor), we now surface an explicit terminal state when
 * an authenticated user arrives with a token. This converts a silent
 * fall-off into an explainable next step.
 *
 * Unauthenticated visitors still get the sign-in / sign-up affordances and
 * the token is preserved through the URL for the day acceptance is wired.
 */
export default function AcceptInvitePage() {
  const [params] = useSearchParams();
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const token = params.get("token");

  // Authenticated + NO token: nothing to accept, route through /launch so
  // the smart matrix lands them in the right canonical destination.
  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated && !token) {
      navigate("/launch", { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, token]);

  // Authenticated + token present: render the honest terminal state.
  if (isAuthenticated && token) {
    return (
      <AuthShell
        title="Accept invite | Fabric59"
        description="Accept your Fabric59 workspace invite."
        heading={
          <span className="flex items-center gap-2.5">
            <MailCheck className="h-6 w-6 text-primary" />
            Invite received
          </span>
        }
        subheading="We received your invite token, but tokenized invite acceptance is not yet wired in this build."
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-border/60 bg-muted/20 p-4 flex gap-2.5">
            <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Ask your organization admin to add you from the in-app invite dialog. Your account is already signed in,
              so they can grant access immediately.
            </p>
          </div>
          <Button asChild className="w-full h-11">
            <Link to="/launch">
              Continue to your workspace <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </AuthShell>
    );
  }

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
