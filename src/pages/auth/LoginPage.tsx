import { useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { AuthShell } from "@/shells/AuthShell";
import { isSuperadminSkipEmail } from "@/lib/superadmin-emails";

export default function LoginPage() {
  const { signIn, signOut, isAuthenticated, isLoading, user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const invite = params.get("invite");
  const shouldContinue = params.get("continue") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Only auto-redirect authenticated users when an explicit ?continue=1
  // marker is present (set by a fresh sign-in submit, or by the "Continue"
  // button in the interstitial below). Without it, render the interstitial
  // so users who deliberately navigated to /login can sign out or pick a
  // different account instead of silently being shunted to /onboarding.
  if (isAuthenticated && shouldContinue) {
    if (isSuperadminSkipEmail(user?.email)) {
      return <Navigate to="/superadmin" replace />;
    }
    const target = invite ? `/launch?invite=${encodeURIComponent(invite)}` : "/launch";
    return <Navigate to={target} replace />;
  }

  if (isAuthenticated) {
    const continueTarget = invite
      ? `/launch?invite=${encodeURIComponent(invite)}`
      : "/launch";
    const handleContinue = () => {
      if (isSuperadminSkipEmail(user?.email)) {
        navigate("/superadmin", { replace: true });
      } else {
        navigate(continueTarget, { replace: true });
      }
    };
    const handleSwitch = async () => {
      setIsSigningOut(true);
      await signOut();
      setIsSigningOut(false);
    };
    return (
      <AuthShell
        title="Sign in | Fabric59"
        description="You are already signed in."
        heading="Already signed in"
        subheading={`You are signed in as ${user?.email ?? "your account"}.`}
      >
        <div className="space-y-3">
          <Button className="w-full h-11" onClick={handleContinue} disabled={isSigningOut}>
            Continue
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full h-11"
            onClick={handleSwitch}
            disabled={isSigningOut}
          >
            {isSigningOut && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign out and use a different account
          </Button>
        </div>
      </AuthShell>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    const { error } = await signIn(email, password);
    if (error) {
      setError(error.message);
      setIsSubmitting(false);
      return;
    }
    // Mark the post-signin redirect explicitly so the guard above forwards
    // to /launch on the next render.
    const next = invite
      ? `/login?continue=1&invite=${encodeURIComponent(invite)}`
      : `/login?continue=1`;
    navigate(next, { replace: true });
    setIsSubmitting(false);
  };

  return (
    <AuthShell
      title="Sign in | Fabric59"
      description="Sign in to your Fabric59 account."
      heading="Welcome back"
      subheading="Sign in to your Fabric59 workspace."
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              to="/forgot-password"
              className="text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="h-11"
          />
        </div>
        <Button type="submit" className="w-full h-11" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Sign in
        </Button>
        <p className="text-sm text-muted-foreground text-center">
          New to Fabric59?{" "}
          <Link to="/signup" className="text-primary hover:underline">
            Create an account
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
