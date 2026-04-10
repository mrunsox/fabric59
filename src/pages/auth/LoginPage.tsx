import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, Shield, Zap, Users, GitBranch, Scale, Bot, Check } from "lucide-react";
import { Fabric59Icon } from "@/components/brand/Fabric59Icon";
import { motion, AnimatePresence } from "framer-motion";

const features = [
  { icon: Zap, title: "Agent Provisioning", desc: "One-click across Five9, Google & Slack" },
  { icon: GitBranch, title: "CRM Field Mapping", desc: "Visual drag-and-drop builder" },
  { icon: Scale, title: "Legal Connect", desc: "Deep Clio & MyCase integration" },
  { icon: Bot, title: "AI Call Flows", desc: "Chat-driven flow design with simulator" },
  { icon: Users, title: "Multi-Tenant", desc: "Manage multiple clients from one dashboard" },
  { icon: Shield, title: "Enterprise Security", desc: "AES-256, RLS, full audit trails" },
];

export default function LoginPage() {
  const { signIn, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);

  // Rotate features
  useState(() => {
    const interval = setInterval(() => setActiveFeature((p) => (p + 1) % features.length), 3000);
    return () => clearInterval(interval);
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/admin" replace />;
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
    <div className="min-h-screen bg-background flex">
      {/* Left - Feature showcase */}
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
            The Five9 platform
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
              your team deserves
            </span>
          </h2>
          <p className="text-muted-foreground mb-10 leading-relaxed">
            Automate agent provisioning, CRM integrations, and campaign management from a single dashboard.
          </p>

          {/* Rotating feature cards */}
          <div className="space-y-3">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                animate={{
                  opacity: i === activeFeature ? 1 : 0.4,
                  scale: i === activeFeature ? 1 : 0.98,
                  borderColor: i === activeFeature ? "hsl(var(--primary) / 0.4)" : "hsl(var(--border) / 0.3)",
                }}
                transition={{ duration: 0.3 }}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card/30 cursor-pointer"
                onClick={() => setActiveFeature(i)}
              >
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                  i === activeFeature ? "bg-primary/20" : "bg-muted/30"
                }`}>
                  <f.icon className={`h-4 w-4 ${i === activeFeature ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">{f.title}</div>
                  <div className="text-xs text-muted-foreground">{f.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-10 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> 50+ contact centers</span>
            <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-primary" /> 55+ integrations</span>
          </div>
        </div>
      </div>

      {/* Right - Login form */}
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
              <CardTitle className="text-2xl">Welcome back</CardTitle>
              <CardDescription>Sign in to your Fabric59 account</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                {error && (
                  <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                      Forgot password?
                    </Link>
                  </div>
                  <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign in
                </Button>
                <p className="text-sm text-muted-foreground text-center">
                  Don't have an account?{" "}
                  <Link to="/signup" className="text-primary hover:underline">Sign up</Link>
                </p>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}
