import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Loader2, ChevronDown, ChevronRight, Users, Trash2, Palette, Plus, MoreVertical, Pencil } from "lucide-react";
import { toast } from "sonner";
import type { Organization } from "@/types/database";

interface OrgMember {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export default function OrganizationsOverviewPage() {
  const [expandedOrgId, setExpandedOrgId] = useState<string | null>(null);
  const [expandedBrandingOrgId, setExpandedBrandingOrgId] = useState<string | null>(null);
  const [brandingDraft, setBrandingDraft] = useState<Record<string, Record<string, string>>>({});
  const [dialog, setDialog] = useState<
    | { kind: "create" }
    | { kind: "rename"; org: Organization }
    | { kind: "delete"; org: Organization }
    | null
  >(null);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const queryClient = useQueryClient();

  const { data: organizations, isLoading } = useQuery({
    queryKey: ["master-organizations"],
    queryFn: async () => {
      const { data, error } = await db
        .from("organizations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((org: Record<string, unknown>) => ({
        id: org.id,
        name: org.name,
        billing_email: org.billing_email,
        plan: org.plan as Organization["plan"],
        status: org.status as Organization["status"],
        created_at: org.created_at,
        updated_at: org.updated_at,
        brand_name: org.brand_name ?? null,
        brand_logo_url: org.brand_logo_url ?? null,
        brand_primary_color: org.brand_primary_color ?? null,
        brand_from_email: org.brand_from_email ?? null,
        brand_reply_to: org.brand_reply_to ?? null,
      })) as Organization[];
    },
  });

  const { data: orgMembers } = useQuery({
    queryKey: ["master-org-members", expandedOrgId],
    enabled: !!expandedOrgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organization_members")
        .select("id, user_id, role, created_at")
        .eq("organization_id", expandedOrgId!);

      if (error) throw error;
      return (data || []) as OrgMember[];
    },
  });

  const updateOrgMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, string> }) => {
      const { error } = await db
        .from("organizations")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master-organizations"] });
      toast.success("Organization updated");
    },
    onError: () => toast.error("Failed to update organization"),
  });

  const updateMemberRoleMutation = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: string }) => {
      const { error } = await supabase
        .from("organization_members")
        .update({ role: role as "owner" | "admin" | "member" })
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master-org-members", expandedOrgId] });
      toast.success("Member role updated");
    },
    onError: () => toast.error("Failed to update member role"),
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from("organization_members")
        .delete()
        .eq("id", memberId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["master-org-members", expandedOrgId] });
      toast.success("Member removed");
    },
    onError: () => toast.error("Failed to remove member"),
  });

  const getBrandingDraft = (orgId: string, org: Organization) => {
    return brandingDraft[orgId] ?? {
      brand_name: org.brand_name ?? "",
      brand_logo_url: org.brand_logo_url ?? "",
      brand_primary_color: org.brand_primary_color ?? "#7c3aed",
      brand_from_email: org.brand_from_email ?? "",
      brand_reply_to: org.brand_reply_to ?? "",
    };
  };

  const updateBrandingDraft = (orgId: string, field: string, value: string) => {
    setBrandingDraft((prev) => ({
      ...prev,
      [orgId]: { ...prev[orgId], [field]: value },
    }));
  };

  const saveBranding = (orgId: string, org: Organization) => {
    const draft = getBrandingDraft(orgId, org);
    updateOrgMutation.mutate({
      id: orgId,
      updates: {
        brand_name: draft.brand_name,
        brand_logo_url: draft.brand_logo_url,
        brand_primary_color: draft.brand_primary_color,
        brand_from_email: draft.brand_from_email,
        brand_reply_to: draft.brand_reply_to,
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">White-Label Partners</h1>
        <p className="text-muted-foreground">Manage partner organizations and their branding</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organizations ({organizations?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Billing Email</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizations?.map((org) => (
                <>
                  <TableRow
                    key={org.id}
                    className="cursor-pointer"
                    onClick={() => setExpandedOrgId(expandedOrgId === org.id ? null : org.id)}
                  >
                    <TableCell>
                      {expandedOrgId === org.id
                        ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    </TableCell>
                    <TableCell className="font-medium">{org.name}</TableCell>
                    <TableCell>{org.billing_email || "-"}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Select
                        value={org.plan}
                        onValueChange={(val) => updateOrgMutation.mutate({ id: org.id, updates: { plan: val } })}
                      >
                        <SelectTrigger className="h-7 w-28 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">Free</SelectItem>
                          <SelectItem value="starter">Starter</SelectItem>
                          <SelectItem value="pro">Pro</SelectItem>
                          <SelectItem value="enterprise">Enterprise</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Select
                        value={org.status}
                        onValueChange={(val) => updateOrgMutation.mutate({ id: org.id, updates: { status: val } })}
                      >
                        <SelectTrigger className="h-7 w-28 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="suspended">Suspended</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {new Date(org.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>

                  {expandedOrgId === org.id && (
                    <TableRow key={`${org.id}-members`}>
                      <TableCell colSpan={6} className="bg-muted/30 p-0">
                        <div className="px-6 py-4 space-y-6">
                          {/* Members section */}
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                              <Users className="h-4 w-4" />
                              Members
                            </div>
                            {!orgMembers ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : orgMembers.length === 0 ? (
                              <p className="text-sm text-muted-foreground">No members found</p>
                            ) : (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>User ID</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Joined</TableHead>
                                    <TableHead></TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {orgMembers.map((member) => (
                                    <TableRow key={member.id}>
                                      <TableCell className="font-mono text-xs">
                                        {member.user_id.slice(0, 8)}…
                                      </TableCell>
                                      <TableCell>
                                        <Select
                                          value={member.role}
                                          onValueChange={(val) => updateMemberRoleMutation.mutate({ memberId: member.id, role: val })}
                                        >
                                          <SelectTrigger className="h-7 w-24 text-xs">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="owner">Owner</SelectItem>
                                            <SelectItem value="admin">Admin</SelectItem>
                                            <SelectItem value="member">Member</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </TableCell>
                                      <TableCell className="text-sm">
                                        {new Date(member.created_at).toLocaleDateString()}
                                      </TableCell>
                                      <TableCell>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 text-destructive hover:text-destructive"
                                          onClick={() => {
                                            if (confirm("Remove this member?")) {
                                              removeMemberMutation.mutate(member.id);
                                            }
                                          }}
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            )}
                          </div>

                          {/* White-Label Branding section */}
                          <div className="space-y-3 border-t border-border pt-4">
                            <button
                              type="button"
                              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full text-left"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedBrandingOrgId(expandedBrandingOrgId === org.id ? null : org.id);
                              }}
                            >
                              <Palette className="h-4 w-4" />
                              White-Label Branding
                              {(org.brand_name || org.brand_from_email) && (
                                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full ml-1">
                                  Configured
                                </span>
                              )}
                              {expandedBrandingOrgId === org.id
                                ? <ChevronDown className="h-3.5 w-3.5 ml-auto" />
                                : <ChevronRight className="h-3.5 w-3.5 ml-auto" />}
                            </button>

                            {expandedBrandingOrgId === org.id && (
                              <div
                                className="space-y-4 rounded-lg border border-border bg-background p-4"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <p className="text-xs text-muted-foreground">
                                  These settings control how outbound emails to this partner's clients are branded. Leave blank to use 24H Virtual defaults.
                                </p>

                                <div className="grid gap-4 sm:grid-cols-2">
                                  <div className="space-y-1.5">
                                    <Label className="text-xs">Brand Name</Label>
                                    <Input
                                      placeholder="e.g., Acme Services"
                                      value={getBrandingDraft(org.id, org).brand_name}
                                      onChange={(e) => updateBrandingDraft(org.id, "brand_name", e.target.value)}
                                      className="h-8 text-sm"
                                    />
                                    <p className="text-xs text-muted-foreground">Shown in email headers</p>
                                  </div>

                                  <div className="space-y-1.5">
                                    <Label className="text-xs">Primary Color</Label>
                                    <div className="flex items-center gap-2">
                                      <input
                                        type="color"
                                        value={getBrandingDraft(org.id, org).brand_primary_color || "#7c3aed"}
                                        onChange={(e) => updateBrandingDraft(org.id, "brand_primary_color", e.target.value)}
                                        className="h-8 w-10 rounded border border-border cursor-pointer bg-transparent"
                                      />
                                      <Input
                                        placeholder="#7c3aed"
                                        value={getBrandingDraft(org.id, org).brand_primary_color}
                                        onChange={(e) => updateBrandingDraft(org.id, "brand_primary_color", e.target.value)}
                                        className="h-8 text-sm flex-1"
                                      />
                                    </div>
                                    <p className="text-xs text-muted-foreground">Hex color for email accents</p>
                                  </div>

                                  <div className="space-y-1.5">
                                    <Label className="text-xs">From Email</Label>
                                    <Input
                                      placeholder="noreply@acme.com"
                                      value={getBrandingDraft(org.id, org).brand_from_email}
                                      onChange={(e) => updateBrandingDraft(org.id, "brand_from_email", e.target.value)}
                                      className="h-8 text-sm"
                                    />
                                    <p className="text-xs text-muted-foreground">Overrides the default sender address</p>
                                  </div>

                                  <div className="space-y-1.5">
                                    <Label className="text-xs">Reply-To</Label>
                                    <Input
                                      placeholder="support@acme.com"
                                      value={getBrandingDraft(org.id, org).brand_reply_to}
                                      onChange={(e) => updateBrandingDraft(org.id, "brand_reply_to", e.target.value)}
                                      className="h-8 text-sm"
                                    />
                                    <p className="text-xs text-muted-foreground">Where client replies go</p>
                                  </div>
                                </div>

                                <div className="space-y-1.5 sm:col-span-2">
                                  <Label className="text-xs">Logo URL</Label>
                                  <Input
                                    placeholder="https://cdn.acme.com/logo.png"
                                    value={getBrandingDraft(org.id, org).brand_logo_url}
                                    onChange={(e) => updateBrandingDraft(org.id, "brand_logo_url", e.target.value)}
                                    className="h-8 text-sm"
                                  />
                                  <p className="text-xs text-muted-foreground">Publicly accessible image URL shown in email header</p>
                                  {getBrandingDraft(org.id, org).brand_logo_url && (
                                    <img
                                      src={getBrandingDraft(org.id, org).brand_logo_url}
                                      alt="Brand logo preview"
                                      className="h-10 object-contain rounded border border-border mt-1"
                                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                                    />
                                  )}
                                </div>

                                <div className="flex justify-end">
                                  <Button
                                    size="sm"
                                    onClick={() => saveBranding(org.id, org)}
                                    disabled={updateOrgMutation.isPending}
                                  >
                                    {updateOrgMutation.isPending && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                                    Save Branding
                                  </Button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
              {(!organizations || organizations.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No organizations found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
