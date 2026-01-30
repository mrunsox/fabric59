import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import type { Organization } from "@/types/database";

export default function OrganizationsOverviewPage() {
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
                <TableHead>Name</TableHead>
                <TableHead>Billing Email</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizations?.map((org) => (
                <TableRow key={org.id}>
                  <TableCell className="font-medium">{org.name}</TableCell>
                  <TableCell>{org.billing_email || "-"}</TableCell>
                  <TableCell>
                    <span className="capitalize">{org.plan}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={org.status === "active" ? "default" : "secondary"} className="capitalize">
                      {org.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(org.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
              {(!organizations || organizations.length === 0) && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
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
