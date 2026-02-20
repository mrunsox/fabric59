import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ChevronDown, ChevronRight, Users, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Organization } from "@/types/database";

interface OrgMember {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
}

export default function OrganizationsOverviewPage() {
  const [expandedOrgId, setExpandedOrgId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: organizations, isLoading } = useQuery({
    queryKey: ["master-organizations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((org) => ({
        id: org.id,
        name: org.name,
        billing_email: org.billing_email,
        plan: org.plan as Organization["plan"],
        status: org.status as Organization["status"],
        created_at: org.created_at,
        updated_at: org.updated_at,
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
    mutationFn: async ({ id, field, value }: { id: string; field: string; value: string }) => {
      const { error } = await supabase
        .from("organizations")
        .update({ [field]: value })
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
        <h1 className="text-2xl font-bold text-foreground">All Organizations</h1>
        <p className="text-muted-foreground">View and manage all platform organizations</p>
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
                        onValueChange={(val) => updateOrgMutation.mutate({ id: org.id, field: "plan", value: val })}
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
                        onValueChange={(val) => updateOrgMutation.mutate({ id: org.id, field: "status", value: val })}
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
                        <div className="px-6 py-4 space-y-3">
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
