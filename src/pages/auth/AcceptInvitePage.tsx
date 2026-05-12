import { useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SEOHead } from "@/components/seo/SEOHead";
import { MailCheck, ArrowRight } from "lucide-react";

/**
 * Phase 9 — Invite-accept landing.
 *
 * Honest minimal stub: today, invites are issued via the in-app InviteMemberDialog
 * and an admin adds the user to organization_members directly. This page is the
 * canonical landing target for any future tokenized invite link, so we never send
 * users into a dead route. Authenticated users are forwarded into workspace
 * bootstrap; unauthenticated users are sent to signup with the invite preserved.
 */
export default function AcceptInvitePage() {
  const [params] = useSearchParams();
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const token = params.get("token");

  useEffect(() => {
    if (isLoading) return;
    if (isAuthenticated) {
      navigate("/onboarding/workspace", { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <SEOHead title="Accept invite | Fabric59" description="Accept your Fabric59 workspace invite." noindex />
      <Card className="w-full max-w-md card-elevated border-0 shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-4 ring-primary/5">
              <MailCheck className="h-7 w-7 text-primary" />
            </div>
          </div>
          <CardTitle className="text-xl tracking-tight">You've been invited</CardTitle>
          <CardDescription>
            Sign in or create an account to accept your invitation and land inside your workspace.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-2">
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
          <p className="text-[11px] text-center text-muted-foreground pt-2">
            Workspace invites are currently provisioned by an organization admin from the in-app
            invite dialog. Tokenized self-serve invite links land here once the backend wiring is in.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
