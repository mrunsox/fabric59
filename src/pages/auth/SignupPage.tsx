import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Check, ArrowLeft, Shield, Zap, GitBranch, Scale, Bot, Users } from "lucide-react";
import { Fabric59Icon } from "@/components/brand/Fabric59Icon";
import { SEOHead } from "@/components/seo/SEOHead";
import { motion } from "framer-motion";

const valueProps = [
  { icon: Zap, text: "One-click agent provisioning across Five9, Google & Slack" },
  { icon: GitBranch, text: "Visual CRM field mapping with 10+ provider support" },
  { icon: Scale, text: "Legal Connect for Clio & MyCase automation" },
  { icon: Bot, text: "AI-powered call flow design with templates" },
  { icon: Users, text: "Multi-tenant dashboard for BPOs" },
  { icon: Shield, text: "Enterprise-grade security with full audit trails" },
];

export default function SignupPage() {
  const { signUp, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/onboarding" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) { setError("Passwords don't match"); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setIsSubmitting(true);
    const { error } = await signUp(email, password, orgName);
    if (error) { setError(error.message); setIsSubmitting(false); }
    else { navigate("/onboarding"); }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <SEOHead title="Sign Up | Fabric59" description="Create a Fabric59 account." noindex />
      {/* Left - Value prop showcase */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,hsl(var(--primary)/0.12),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,hsl(var(--accent)/0.08),transparent_50%)]" />
        <div className="absolute inset-0" style={{
          backgroundImage: "radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)",
          backgroundSize: "32px 32px", opacity: 0.2,
        }} />

        <div className="relative flex flex-col justify-center p-12 max-w-lg mx-auto">
          <Link to="/" className="flex items-center gap-3 mb-12">
            <Fabric59Icon size="md" />
            <span className="text-lg font-extrabold tracking-tight text-foreground">Fabric59</span>
          </Link>

          <h2 className="text-3xl font-bold mb-3">
            Everything you need to
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
              automate Five9
            </span>
          </h2>
          <p className="text-muted-foreground mb-10 leading-relaxed">
            Join 50+ contact centers already using Fabric59 to streamline operations.
          </p>

          {/* Animated checklist */}
          <div className="space-y-4">
            {valueProps.map((item, i) => (
              <motion.div
                key={item.text}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.15, duration: 0.4 }}
                className="flex items-start gap-3"
              >
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <item.icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm text-foreground leading-relaxed">{item.text}</span>
              </motion.div>
            ))}
          </div>

          <div className="mt-10 flex items-center gap-3">
            <div className="flex -space-x-2">
              {["SM", "DC", "MR", "JL"].map((initials) => (
                <div key={initials} className="h-8 w-8 rounded-full bg-primary/10 border-2 border-background flex items-center justify-center text-[10px] font-bold text-primary">
                  {initials}
                </div>
              ))}
            </div>
            <span className="text-xs text-muted-foreground">Trusted by 50+ teams</span>
          </div>
        </div>
      </div>

      {/* Right - Signup form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-4">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          <Card className="w-full">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4 lg:hidden">
                <Fabric59Icon size="lg" className="h-12 w-12" />
              </div>
              <CardTitle className="text-2xl">Create your account</CardTitle>
              <CardDescription>Start automating your Five9 operations</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                {error && (
                  <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="orgName">Organization Name</Label>
                  <Input id="orgName" type="text" placeholder="Your Company Name" value={orgName} onChange={(e) => setOrgName(e.target.value)} required />
                  <p className="text-xs text-muted-foreground">Your call center or agency name</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input id="confirmPassword" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create account
                </Button>
                <p className="text-sm text-muted-foreground text-center">
                  Already have an account?{" "}
                  <Link to="/login" className="text-primary hover:underline">Sign in</Link>
                </p>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
