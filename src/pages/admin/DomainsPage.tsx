import { useState } from "react";
import { useDomains, useDeleteDomain } from "@/hooks/useDomains";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Plus,
  Globe,
  Trash2,
  Settings,
  Loader2,
  Eye,
  EyeOff,
  Wifi,
  CheckCircle,
  XCircle,
  ShieldAlert,
  KeyRound,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import type { Five9DomainStatus } from "@/types/database";

type ConnectionStatus = "idle" | "testing" | "success" | "failed";
type ErrorType = "auth" | "permission" | "unknown";

export default function DomainsPage() {
  const { organization, orgRole, isMasterAdmin, isLoading: isAuthLoading } = useAuth();
  const { data: domains, isLoading, error } = useDomains();
  const deleteDomain = useDeleteDomain();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState("");
  const [five9Username, setFive9Username] = useState("");
  const [five9Password, setFive9Password] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("idle");
  const [connectionMessage, setConnectionMessage] = useState("");
  const [connectionErrorType, setConnectionErrorType] = useState<ErrorType>("unknown");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdDomainId, setCreatedDomainId] = useState<string | null>(null);

  const canManage = isAuthLoading ? false : (orgRole === "owner" || orgRole === "admin" || isMasterAdmin);

  const resetDialog = () => {
    setNewDisplayName("");
    setFive9Username("");
    setFive9Password("");
    setShowPassword(false);
    setConnectionStatus("idle");
    setConnectionMessage("");
    setConnectionErrorType("unknown");
    setCreatedDomainId(null);
    setIsSubmitting(false);
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) resetDialog();
    setIsAddDialogOpen(open);
  };

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization) return;
    setIsSubmitting(true);

    const derivedDomain = five9Username.includes("@")
      ? five9Username.split("@")[1]
      : newDisplayName.toLowerCase().replace(/\s+/g, "-");

    try {
      let domainId: string;

      if (createdDomainId) {
        // Domain was already created on a previous attempt — update it instead of inserting
        const { error: updateError } = await supabase
          .from("five9_domains")
          .update({
            display_name: newDisplayName,
            five9_username: five9Username,
            five9_password_encrypted: five9Password,
          })
          .eq("id", createdDomainId);

        if (updateError) throw updateError;
        domainId = createdDomainId;
      } else {
        // First attempt — insert a new domain record
        const { data, error: insertError } = await supabase
          .from("five9_domains")
          .insert({
            organization_id: organization.id,
            domain: derivedDomain,
            display_name: newDisplayName,
            five9_username: five9Username,
            five9_password_encrypted: five9Password,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        domainId = data.id;
        setCreatedDomainId(domainId);
      }

      setConnectionStatus("testing");
      setIsSubmitting(false);

      try {
        const { data: session } = await supabase.auth.getSession();
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/test-five9-connection`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.session?.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ domain_id: domainId }),
          }
        );

        const result = await response.json();

        if (result.success) {
          setConnectionStatus("success");
          setConnectionMessage(result.message || "Successfully connected to Five9 Admin Web Services");
          setTimeout(() => {
            setIsAddDialogOpen(false);
            resetDialog();
          }, 1500);
        } else {
          setConnectionStatus("failed");
          setConnectionMessage(result.message || "Authentication failed. Please check your credentials.");
          setConnectionErrorType(result.errorType || "unknown");
        }
      } catch {
        setConnectionStatus("failed");
        setConnectionMessage("Could not reach Five9. Please check your credentials and try again.");
        setConnectionErrorType("unknown");
      }
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to connect domain");
      setIsSubmitting(false);
    }
  };

  const handleRetryCredentials = () => {
    setConnectionStatus("idle");
    setConnectionMessage("");
    setFive9Password("");
    // Keep display name + username so user only needs to fix password
  };

  const handleSaveAnyway = () => {
    toast.success("Domain saved. You can update credentials in Domain Settings.");
    setIsAddDialogOpen(false);
    resetDialog();
  };

  const handleDeleteDomain = async (id: string) => {
    await deleteDomain.mutateAsync(id);
  };

  const getStatusVariant = (status: Five9DomainStatus): "active" | "pending_verification" | "inactive" => {
    return status;
  };

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
        <p className="text-sm text-destructive">Failed to load domains: {error.message}</p>
      </div>
    );
  }

  const isTestingOrResult = connectionStatus !== "idle";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Five9 Domains</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your connected Five9 accounts and their workflow settings
          </p>
        </div>
        {canManage && (
          <Dialog open={isAddDialogOpen} onOpenChange={handleDialogOpenChange}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Domain
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              {!isTestingOrResult ? (
                /* ── Form State ── */
                <form onSubmit={handleAddDomain}>
                  <DialogHeader className="mb-4">
                    <DialogTitle>Connect Five9 Domain</DialogTitle>
                    <DialogDescription>
                      Sign in with your Five9 admin account to connect your domain
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="displayName">Display Name</Label>
                      <Input
                        id="displayName"
                        type="text"
                        placeholder="Main Call Center"
                        value={newDisplayName}
                        onChange={(e) => setNewDisplayName(e.target.value)}
                        required
                      />
                      <p className="text-xs text-muted-foreground">A friendly name to identify this domain</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="five9Username">Five9 Admin Username</Label>
                      <Input
                        id="five9Username"
                        type="text"
                        placeholder="admin@yourcompany.com or John Smith"
                        value={five9Username}
                        onChange={(e) => setFive9Username(e.target.value.trimStart())}
                        autoComplete="username"
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter exactly as shown in Five9 — e.g. <code className="bg-muted px-1 rounded">admin@company.com</code> or <code className="bg-muted px-1 rounded">John Smith</code> (with a space, not a hyphen)
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="five9Password">Admin Password</Label>
                      <div className="relative">
                        <Input
                          id="five9Password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••••••"
                          value={five9Password}
                          onChange={(e) => setFive9Password(e.target.value)}
                          autoComplete="current-password"
                          className="pr-10"
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                          tabIndex={-1}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Used to sync agent skills, call variables, and dispositions from your Five9 domain
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-6">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleDialogOpenChange(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Connect Domain
                    </Button>
                  </div>
                </form>
              ) : (
                /* ── Testing / Result State ── */
                <div>
                  <DialogHeader className="mb-6">
                    <div className="flex justify-center mb-4">
                      <div className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-xl",
                        connectionStatus === "success" ? "bg-success/10" :
                        connectionStatus === "failed" ? "bg-destructive/10" :
                        "bg-primary/10"
                      )}>
                        {connectionStatus === "testing" && <Wifi className="h-6 w-6 text-primary animate-pulse" />}
                        {connectionStatus === "success" && <CheckCircle className="h-6 w-6 text-success" />}
                        {connectionStatus === "failed" && <XCircle className="h-6 w-6 text-destructive" />}
                      </div>
                    </div>
                    <DialogTitle className="text-center">
                      {connectionStatus === "testing" && "Verifying Connection"}
                      {connectionStatus === "success" && "Connected!"}
                      {connectionStatus === "failed" && connectionErrorType === "permission" && "Permission Denied"}
                      {connectionStatus === "failed" && connectionErrorType !== "permission" && "Authentication Failed"}
                    </DialogTitle>
                    <DialogDescription className="text-center">
                      {connectionStatus === "testing" && "Connecting to Five9 Admin Web Services…"}
                      {connectionStatus === "success" && connectionMessage}
                    </DialogDescription>
                  </DialogHeader>

                  <div>
                    {connectionStatus === "testing" && (
                      <div className="flex items-center justify-center gap-3 py-4 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="text-sm">Authenticating with Five9…</span>
                      </div>
                    )}

                    {connectionStatus === "success" && (
                      <div className="flex items-center justify-center gap-3 py-4 text-muted-foreground">
                        <span className="text-sm">Closing in a moment…</span>
                      </div>
                    )}

                    {connectionStatus === "failed" && (
                      <div className="space-y-4 pt-1">
                        {connectionErrorType === "permission" ? (
                          <Alert className="border-warning/30 bg-warning/10 text-warning-foreground">
                            <ShieldAlert className="h-4 w-4 !text-warning" />
                            <AlertTitle className="text-warning">AdminWebService Access Required</AlertTitle>
                            <AlertDescription className="text-warning text-xs leading-relaxed opacity-90">
                              {connectionMessage}
                            </AlertDescription>
                          </Alert>
                        ) : (
                          <Alert className="border-destructive/30 bg-destructive/10 text-destructive">
                            <KeyRound className="h-4 w-4 !text-destructive" />
                            <AlertTitle>Wrong Credentials</AlertTitle>
                            <AlertDescription className="text-xs leading-relaxed">
                              {connectionMessage}
                            </AlertDescription>
                          </Alert>
                        )}
                        <Button variant="default" className="w-full" onClick={handleRetryCredentials}>
                          Try Different Credentials
                        </Button>
                        <Button variant="outline" className="w-full" onClick={handleSaveAnyway}>
                          Save Anyway
                        </Button>
                        <p className="text-xs text-center text-muted-foreground">
                          You can update your credentials later in Domain Settings.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Domains table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Domain</TableHead>
              <TableHead>Display Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              {canManage && <TableHead className="w-[100px]">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  {canManage && <TableCell><Skeleton className="h-8 w-16" /></TableCell>}
                </TableRow>
              ))
            ) : domains && domains.length > 0 ? (
              domains.map((domain) => (
                <TableRow key={domain.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-foreground">{domain.domain}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-foreground">{domain.display_name}</TableCell>
                  <TableCell>
                    <StatusBadge variant={getStatusVariant(domain.status)}>
                      {domain.status.replace("_", " ")}
                    </StatusBadge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(domain.created_at).toLocaleDateString()}
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" asChild>
                          <Link to={`/admin/domains/${domain.id}`}>
                            <Settings className="h-4 w-4" />
                          </Link>
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Domain</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{domain.display_name}"? This will
                                also disconnect all tenants associated with this domain.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteDomain(domain.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={canManage ? 5 : 4} className="text-center py-8">
                  <div className="flex flex-col items-center gap-2">
                    <Globe className="h-8 w-8 text-muted-foreground/50" />
                    <p className="text-muted-foreground">No domains connected yet</p>
                    {canManage && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsAddDialogOpen(true)}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add your first domain
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
