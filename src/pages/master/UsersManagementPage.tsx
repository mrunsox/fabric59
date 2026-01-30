import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface UserWithRoles {
  user_id: string;
  organization_id: string;
  organization_name: string;
  role: string;
  created_at: string;
}

export default function UsersManagementPage() {
  const { data: members, isLoading } = useQuery({
    queryKey: ["master-users"],
    queryFn: async () => {
      // Get all organization members with org details
      const { data: membersData, error: membersError } = await supabase
        .from("organization_members")
        .select(`
          user_id,
          organization_id,
          role,
          created_at,
          organizations!inner(name)
        `)
        .order("created_at", { ascending: false });

      if (membersError) throw membersError;

      return (membersData || []).map((m) => ({
        user_id: m.user_id,
        organization_id: m.organization_id,
        organization_name: (m.organizations as { name: string })?.name || "Unknown",
        role: m.role,
        created_at: m.created_at,
      })) as UserWithRoles[];
    },
  });

  // Get platform roles (admin, ops_team, etc.)
  const { data: platformRoles } = useQuery({
    queryKey: ["master-platform-roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
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
        <h1 className="text-2xl font-bold text-foreground">User Management</h1>
        <p className="text-muted-foreground">View all users across organizations</p>
      </div>

      {/* Platform Roles */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Roles ({platformRoles?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User ID</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Assigned</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {platformRoles?.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-mono text-xs">
                    {role.user_id}
                  </TableCell>
                  <TableCell>
                    <Badge variant={role.role === "master_admin" ? "default" : "secondary"}>
                      {role.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(role.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
              {(!platformRoles || platformRoles.length === 0) && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No platform roles assigned
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Organization Members */}
      <Card>
        <CardHeader>
          <CardTitle>Organization Members ({members?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User ID</TableHead>
                <TableHead>Organization</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members?.map((member, index) => (
                <TableRow key={`${member.user_id}-${member.organization_id}-${index}`}>
                  <TableCell className="font-mono text-xs">
                    {member.user_id}
                  </TableCell>
                  <TableCell>{member.organization_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {member.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(member.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
              {(!members || members.length === 0) && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No organization members found
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
