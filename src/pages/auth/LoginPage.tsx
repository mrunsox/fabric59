import { useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { AuthShell } from "@/shells/AuthShell";
import { isSuperadminSkipEmail } from "@/lib/superadmin-emails";

export default function LoginPage() {
  const { signIn, isAuthenticated, isLoading, user } = useAuth();
  const [params] = useSearchParams();
  const invite = params.get("invite");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Phase 2 — post-auth redirect goes through /launch so the smart
  // org+workspace routing matrix lives in one canonical place. Invite
  // tokens are forwarded through so /accept-invite continuity holds.
  // Superadmin skip emails go straight to /superadmin so they never get
  // stuck behind onboarding.
  if (isAuthenticated) {
    if (isSuperadminSkipEmail(user?.email)) {
      return <Navigate to="/superadmin" replace />;
    }
    const target = invite ? `/launch?invite=${encodeURIComponent(invite)}` : "/launch";
    return <Navigate to={target} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);
    const { error } = await signIn(email, password);
    if (error) setError(error.message);
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
          <div role="alert" className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
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
