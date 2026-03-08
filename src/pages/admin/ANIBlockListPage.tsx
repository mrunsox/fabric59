import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Ban, Search, Plus, Trash2, Shield, Phone, AlertTriangle,
  History, CheckCircle2, Bell, User
} from "lucide-react";
import { toast } from "sonner";

interface BlockedANI {
  id: string;
  ani: string;
  campaignProfile: string;
  blockedBy: string;
  blockedAt: string;
  reason: string;
  status: "active" | "unblocked";
}

const MOCK_BLOCKED: BlockedANI[] = [
  { id: "1", ani: "+18005551234", campaignProfile: "PI Intake Profile", blockedBy: "Alice Johnson", blockedAt: "2026-03-08 14:22", reason: "Block Caller disposition", status: "active" },
  { id: "2", ani: "+18005555678", campaignProfile: "Family Law Profile", blockedBy: "Bob Martinez", blockedAt: "2026-03-07 09:15", reason: "Repeated spam calls", status: "active" },
  { id: "3", ani: "+18005559012", campaignProfile: "PI Intake Profile", blockedBy: "Carol Thompson", blockedAt: "2026-03-06 16:45", reason: "Block Caller disposition", status: "active" },
  { id: "4", ani: "+18005553456", campaignProfile: "Workers Comp Profile", blockedBy: "Dan Lee", blockedAt: "2026-03-05 11:30", reason: "Harassing caller", status: "unblocked" },
  { id: "5", ani: "+18005557890", campaignProfile: "PI Intake Profile", blockedBy: "System", blockedAt: "2026-03-04 08:00", reason: "Auto-block: 5+ calls in 10 min", status: "active" },
];

const MOCK_AUDIT = [
  { time: "2026-03-08 14:22", action: "BLOCK", ani: "+18005551234", profile: "PI Intake", agent: "Alice Johnson", method: "Disposition trigger" },
  { time: "2026-03-07 09:15", action: "BLOCK", ani: "+18005555678", profile: "Family Law", agent: "Bob Martinez", method: "Manual" },
  { time: "2026-03-06 16:45", action: "BLOCK", ani: "+18005559012", profile: "PI Intake", agent: "Carol Thompson", method: "Disposition trigger" },
  { time: "2026-03-05 15:00", action: "UNBLOCK", ani: "+18005553456", profile: "Workers Comp", agent: "Admin", method: "Manual unblock" },
  { time: "2026-03-05 11:30", action: "BLOCK", ani: "+18005553456", profile: "Workers Comp", agent: "Dan Lee", method: "Disposition trigger" },
];

export default function ANIBlockListPage() {
  const [blocked, setBlocked] = useState(MOCK_BLOCKED);
  const [search, setSearch] = useState("");
  const [newANI, setNewANI] = useState("");
  const [autoBlockEnabled, setAutoBlockEnabled] = useState(true);
  const [notifyOnBlock, setNotifyOnBlock] = useState(true);

  const filteredBlocked = blocked.filter(b =>
    b.status === "active" && (
      !search || b.ani.includes(search) || b.campaignProfile.toLowerCase().includes(search.toLowerCase())
    )
  );

  const handleUnblock = (id: string) => {
    setBlocked(prev => prev.map(b => b.id === id ? { ...b, status: "unblocked" as const } : b));
    toast.success("Number unblocked");
  };

  const handleManualBlock = () => {
    if (!newANI) return;
    const formatted = newANI.startsWith("+1") ? newANI : `+1${newANI.replace(/\D/g, "")}`;
    const entry: BlockedANI = {
      id: crypto.randomUUID(),
      ani: formatted,
      campaignProfile: "All Profiles",
      blockedBy: "Admin",
      blockedAt: new Date().toISOString().replace("T", " ").slice(0, 16),
      reason: "Manual block",
      status: "active",
    };
    setBlocked(prev => [entry, ...prev]);
    setNewANI("");
    toast.success(`Blocked ${formatted}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Ban className="h-6 w-6" /> ANI Block List
          </h1>
          <p className="text-sm text-muted-foreground">Block and manage callers via Five9 campaign profile filtering</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><Ban className="h-4 w-4" /><span className="text-xs">Active Blocks</span></div>
          <p className="text-2xl font-bold">{blocked.filter(b => b.status === "active").length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><Shield className="h-4 w-4" /><span className="text-xs">Auto-Block</span></div>
          <p className="text-2xl font-bold text-success">{autoBlockEnabled ? "ON" : "OFF"}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><History className="h-4 w-4" /><span className="text-xs">Today's Blocks</span></div>
          <p className="text-2xl font-bold">2</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><CheckCircle2 className="h-4 w-4" /><span className="text-xs">Unblocked</span></div>
          <p className="text-2xl font-bold">{blocked.filter(b => b.status === "unblocked").length}</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">Blocked Numbers</TabsTrigger>
          <TabsTrigger value="audit">Audit Trail</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search ANI or campaign…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <Input placeholder="+18005551234" value={newANI} onChange={e => setNewANI(e.target.value)} className="w-48" onKeyDown={e => e.key === "Enter" && handleManualBlock()} />
              <Button size="sm" onClick={handleManualBlock} disabled={!newANI} className="gap-1">
                <Plus className="h-3.5 w-3.5" /> Block
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ANI</TableHead>
                    <TableHead>Campaign Profile</TableHead>
                    <TableHead>Blocked By</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBlocked.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No blocked numbers found</TableCell></TableRow>
                  ) : (
                    filteredBlocked.map(b => (
                      <TableRow key={b.id}>
                        <TableCell className="font-mono font-medium">{b.ani}</TableCell>
                        <TableCell><Badge variant="outline">{b.campaignProfile}</Badge></TableCell>
                        <TableCell className="text-sm">{b.blockedBy}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{b.blockedAt}</TableCell>
                        <TableCell className="text-sm">{b.reason}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" className="text-destructive gap-1" onClick={() => handleUnblock(b.id)}>
                            <Trash2 className="h-3.5 w-3.5" /> Unblock
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>ANI</TableHead>
                    <TableHead>Profile</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Method</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_AUDIT.map((a, i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm text-muted-foreground">{a.time}</TableCell>
                      <TableCell><Badge variant={a.action === "BLOCK" ? "destructive" : "default"}>{a.action}</Badge></TableCell>
                      <TableCell className="font-mono text-sm">{a.ani}</TableCell>
                      <TableCell>{a.profile}</TableCell>
                      <TableCell>{a.agent}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{a.method}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Block List Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <h4 className="text-sm font-medium">Disposition-Triggered Auto-Block</h4>
                  <p className="text-xs text-muted-foreground">Automatically block ANI when agent selects "Block Caller" disposition</p>
                </div>
                <Switch checked={autoBlockEnabled} onCheckedChange={setAutoBlockEnabled} />
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border p-4">
                <div>
                  <h4 className="text-sm font-medium">Block Confirmation Notifications</h4>
                  <p className="text-xs text-muted-foreground">Send Slack/email notification when a number is blocked</p>
                </div>
                <Switch checked={notifyOnBlock} onCheckedChange={setNotifyOnBlock} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
