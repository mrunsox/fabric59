import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDomain, useUpdateDomain, useDeleteDomain } from "@/hooks/useDomains";
import { useTestFive9Connection } from "@/hooks/useTestFive9Connection";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Save, Trash2, Loader2, Eye, EyeOff, Plug, CheckCircle2, XCircle, Clock, Info } from "lucide-react";
import type { Five9DomainStatus, WorkflowSettings } from "@/types/database";
import { format } from "date-fns";

export default function DomainDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { orgRole } = useAuth();
  const { data: domain, isLoading, error } = useDomain(id || "");
  const updateDomain = useUpdateDomain();
  const deleteDomain = useDeleteDomain();
  const testConnection = useTestFive9Connection();

  // General settings state
  const [displayName, setDisplayName] = useState("");
  const [status, setStatus] = useState<Five9DomainStatus>("active");
  const [greeting, setGreeting] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [primaryColor, setPrimaryColor] = useState("");
  
  // API Credentials state
  const [five9Username, setFive9Username] = useState("");
  const [five9Password, setFive9Password] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const [isInitialized, setIsInitialized] = useState(false);

  const canManage = orgRole === "owner" || orgRole === "admin";

  // Initialize form with domain data
  if (domain && !isInitialized) {
    setDisplayName(domain.display_name);
    setStatus(domain.status);
    setGreeting(domain.workflow_settings?.call_handling?.greeting || "");
    setCompanyName(domain.workflow_settings?.branding?.company_name || "");
    setPrimaryColor(domain.workflow_settings?.branding?.primary_color || "");
    setFive9Username(domain.five9_username || "");
    // Don't populate password - it should only be entered fresh for security
    setIsInitialized(true);
  }

  const handleSave = async () => {
    if (!id) return;

    const workflow_settings: WorkflowSettings = {
      ...domain?.workflow_settings,
      call_handling: {
        ...domain?.workflow_settings?.call_handling,
        greeting,
      },
      branding: {
        ...domain?.workflow_settings?.branding,
        company_name: companyName,
        primary_color: primaryColor,
      },
    };

    await updateDomain.mutateAsync({
      id,
      data: {
        display_name: displayName,
        status,
        workflow_settings,
      },
    });
  };

  const handleSaveCredentials = async () => {
    if (!id) return;

    await updateDomain.mutateAsync({
      id,
      data: {
        five9_username: five9Username,
        five9_password: five9Password,
      },
    });
    
    // Clear password after saving for security
    setFive9Password("");
  };

  const handleTestConnection = async () => {
    if (!id) return;

    await testConnection.mutateAsync({
      domainId: id,
      username: five9Username || undefined,
      password: five9Password || undefined,
    });
  };

  const handleDelete = async () => {
    if (!id) return;
    await deleteDomain.mutateAsync(id);
    navigate("/admin/domains");
  };

  const getConnectionStatusBadge = () => {
    const status = domain?.api_connection_status;
    
    switch (status) {
      case "connected":
        return (
          <Badge variant="default" className="bg-green-600 text-white">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Connected
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Failed
          </Badge>
        );
      case "pending":
      default:
        return (
          <Badge variant="secondary">
            <Clock className="mr-1 h-3 w-3" />
            Not Connected
          </Badge>
        );
    }
  };

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
        <p className="text-sm text-destructive">Failed to load domain: {error.message}</p>
      </div>
    );
  }

  if (isLoading || !domain) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32 mt-1" />
          </div>
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin/domains")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{domain.display_name}</h1>
            <p className="text-sm text-muted-foreground">{domain.domain}</p>
          </div>
        </div>
        {canManage && (
          <div className="flex items-center gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Domain</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this domain? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button onClick={handleSave} disabled={updateDomain.isPending}>
              {updateDomain.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Changes
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="api">API Credentials</TabsTrigger>
          <TabsTrigger value="workflow">Workflow</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Domain Settings</CardTitle>
              <CardDescription>Basic configuration for this Five9 domain</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    disabled={!canManage}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={status}
                    onValueChange={(v) => setStatus(v as Five9DomainStatus)}
                    disabled={!canManage}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="pending_verification">Pending Verification</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Domain URL</Label>
                <Input value={domain.domain} disabled />
                <p className="text-xs text-muted-foreground">
                  Domain URL cannot be changed after creation
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Five9 API Credentials</CardTitle>
              <CardDescription>
                Connect to Five9 Admin Web Services to sync contact fields, call variables, and dispositions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Connection Status */}
              <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Connection Status</p>
                  {domain.last_connection_test && (
                    <p className="text-xs text-muted-foreground">
                      Last tested: {format(new Date(domain.last_connection_test), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  )}
                </div>
                {getConnectionStatusBadge()}
              </div>

              {/* Credentials Form */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="five9Username">Five9 Username</Label>
                  <Input
                    id="five9Username"
                    type="text"
                    placeholder="yourusername"
                    value={five9Username}
                    onChange={(e) => setFive9Username(e.target.value)}
                    disabled={!canManage}
                  />
                  <p className="text-xs text-muted-foreground">
                    Your Five9 administrator username
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="five9Password">Five9 Password</Label>
                  <div className="relative">
                    <Input
                      id="five9Password"
                      type={showPassword ? "text" : "password"}
                      placeholder={domain.five9_password_encrypted ? "••••••••••••" : "Enter your Five9 password"}
                      value={five9Password}
                      onChange={(e) => setFive9Password(e.target.value)}
                      disabled={!canManage}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={!canManage}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Password is encrypted and stored securely
                    {domain.five9_password_encrypted && " • Leave blank to keep existing password"}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              {canManage && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={handleTestConnection}
                    disabled={testConnection.isPending || (!five9Username && !domain.five9_username)}
                  >
                    {testConnection.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Plug className="mr-2 h-4 w-4" />
                    )}
                    Test Connection
                  </Button>
                  <Button
                    onClick={handleSaveCredentials}
                    disabled={updateDomain.isPending || !five9Username}
                  >
                    {updateDomain.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Save Credentials
                  </Button>
                </div>
              )}

              {/* Help Text */}
              <div className="rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/50 p-4">
                <div className="flex gap-3">
                  <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div className="space-y-2 text-sm">
                    <p className="font-medium text-blue-900 dark:text-blue-100">
                      Where to find your Five9 API credentials
                    </p>
                    <ol className="list-decimal list-inside space-y-1 text-blue-800 dark:text-blue-200">
                      <li>Log in to your Five9 VCC Administrator portal</li>
                      <li>Navigate to User Management → Users</li>
                      <li>Use an admin user's credentials that has API access enabled</li>
                      <li>For REST API access, generate an API key under Actions → Generate API Key</li>
                    </ol>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflow" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Call Handling</CardTitle>
              <CardDescription>
                Configure how calls are handled for this domain
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="greeting">Default Greeting</Label>
                <Textarea
                  id="greeting"
                  placeholder="Thank you for calling [Company]. How may I help you today?"
                  value={greeting}
                  onChange={(e) => setGreeting(e.target.value)}
                  disabled={!canManage}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  The default greeting agents will use when answering calls
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branding" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Branding</CardTitle>
              <CardDescription>
                Customize the appearance for agents handling calls
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    placeholder="Your Company"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    disabled={!canManage}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primaryColor"
                      placeholder="#6366f1"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      disabled={!canManage}
                    />
                    {primaryColor && (
                      <div
                        className="h-10 w-10 rounded-md border"
                        style={{ backgroundColor: primaryColor }}
                      />
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
