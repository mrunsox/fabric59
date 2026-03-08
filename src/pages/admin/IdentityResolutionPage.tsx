import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { RefreshCw, Loader2, Users, Building2, Search, Link2, Unlink, Zap } from "lucide-react";

interface IdentityXref {
  id: string;
  organization_id: string;
  person_type: string;
  internal_id: string;
  external_system: string;
  external_id: string;
  synced_at: string | null;
}

export default function IdentityResolutionPage() {
  const { organization } = useAuth();
  const [xrefs, setXrefs] = useState<IdentityXref[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState("");

  const loadXrefs = async () => {
    if (!organization?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("identity_xrefs")
      .select("*")
      .eq("organization_id", organization.id)
      .order("synced_at", { ascending: false })
      .limit(500);
    if (error) toast.error("Failed to load identity records");
    setXrefs(data || []);
    setLoading(false);
  };

  useEffect(() => { loadXrefs(); }, [organization?.id]);

  const runSync = async () => {
    setSyncing(true);
    try {
      // Sync agents → identity_xrefs
      const { data: agents } = await supabase.from("agents").select("id, five9_user_id, slack_user_id, google_user_id").neq("status", "deprovisioned");
      if (agents) {
        for (const agent of agents) {
          const systems: { system: string; id: string | null }[] = [
            { system: "five9", id: agent.five9_user_id },
            { system: "slack", id: agent.slack_user_id },
            { system: "google", id: agent.google_user_id },
          ];
          for (const { system, id } of systems) {
            if (!id) continue;
            await supabase.from("identity_xrefs").upsert({
              organization_id: organization!.id,
              person_type: "agent",
              internal_id: agent.id,
              external_system: system,
              external_id: id,
              synced_at: new Date().toISOString(),
            }, { onConflict: "id" });
          }
        }
      }
      toast.success("Identity sync complete");
      await loadXrefs();
    } catch {
      toast.error("Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const agentXrefs = xrefs.filter((x) => x.person_type === "agent");
  const clientXrefs = xrefs.filter((x) => x.person_type === "client");

  const filteredXrefs = xrefs.filter((x) =>
    !search || x.external_id.toLowerCase().includes(search.toLowerCase()) ||
    x.external_system.toLowerCase().includes(search.toLowerCase()) ||
    x.internal_id.toLowerCase().includes(search.toLowerCase())
  );

  const systemColors: Record<string, string> = {
    five9: "bg-blue-500/10 text-blue-500",
    slack: "bg-purple-500/10 text-purple-500",
    google: "bg-red-500/10 text-red-500",
    stripe: "bg-green-500/10 text-green-500",
    clio: "bg-orange-500/10 text-orange-500",
    mycase: "bg-cyan-500/10 text-cyan-500",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Identity Resolution</h1>
          <p className="text-sm text-muted-foreground mt-1">Cross-reference internal records with Five9, Slack, Google, and CRM identifiers</p>
        </div>
        <Button onClick={runSync} disabled={syncing}>
          {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Sync Identities
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><Link2 className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-2xl font-bold">{xrefs.length}</p>
                <p className="text-xs text-muted-foreground">Total Xrefs</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10"><Users className="h-5 w-5 text-success" /></div>
              <div>
                <p className="text-2xl font-bold">{agentXrefs.length}</p>
                <p className="text-xs text-muted-foreground">Agent Links</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10"><Building2 className="h-5 w-5 text-warning" /></div>
              <div>
                <p className="text-2xl font-bold">{clientXrefs.length}</p>
                <p className="text-xs text-muted-foreground">Client Links</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent"><Zap className="h-5 w-5 text-accent-foreground" /></div>
              <div>
                <p className="text-2xl font-bold">{new Set(xrefs.map((x) => x.external_system)).size}</p>
                <p className="text-xs text-muted-foreground">Systems Linked</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Identity Cross-References</CardTitle>
              <CardDescription>Maps internal agent/client IDs to external platform identifiers</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search IDs or systems..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filteredXrefs.length === 0 ? (
            <div className="text-center py-12">
              <Unlink className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No identity cross-references found</p>
              <p className="text-xs text-muted-foreground mt-1">Click "Sync Identities" to populate from agents and tenants</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Person Type</TableHead>
                  <TableHead>Internal ID</TableHead>
                  <TableHead>External System</TableHead>
                  <TableHead>External ID</TableHead>
                  <TableHead>Last Synced</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredXrefs.map((x) => (
                  <TableRow key={x.id}>
                    <TableCell>
                      <Badge variant="outline" className={x.person_type === "agent" ? "text-primary" : "text-warning"}>
                        {x.person_type === "agent" ? <Users className="h-3 w-3 mr-1" /> : <Building2 className="h-3 w-3 mr-1" />}
                        {x.person_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{x.internal_id.slice(0, 8)}…</TableCell>
                    <TableCell>
                      <Badge className={`border-0 ${systemColors[x.external_system] || "bg-muted text-muted-foreground"}`}>
                        {x.external_system}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{x.external_id}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {x.synced_at ? new Date(x.synced_at).toLocaleString() : "Never"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
