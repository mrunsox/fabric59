import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Zap, Mail, MessageSquare, Bell, Plus, Clock,
  Volume2, AlertTriangle, Settings2, Shield, ChevronRight
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePostCallAutomations, useCreatePostCallAutomation, useUpdatePostCallAutomation } from "@/hooks/usePostCallAutomations";

const channelIcon = (ch: string) => {
  if (ch.includes("email")) return Mail;
  if (ch.includes("sms")) return MessageSquare;
  if (ch.includes("slack")) return Volume2;
  return Bell;
};

export function PostCallAutomationsContent() {
  const { organization } = useAuth();
  const orgId = organization?.id;
  const { data: rules = [], isLoading } = usePostCallAutomations();
  const createRule = useCreatePostCallAutomation();
  const updateRule = useUpdatePostCallAutomation();

  const [newOpen, setNewOpen] = useState(false);
  const [form, setForm] = useState({ name: "", disposition_match: "", action_type: "email", config_target: "" });

  const toggleRule = (id: string, currentEnabled: boolean) => {
    updateRule.mutate({ id, enabled: !currentEnabled });
  };

  const handleCreate = () => {
    if (!orgId || !form.name.trim() || !form.disposition_match.trim()) return;
    createRule.mutate({
      organization_id: orgId,
      name: form.name,
      disposition_match: form.disposition_match,
      action_type: form.action_type,
      config: { target: form.config_target },
    });
    setNewOpen(false);
    setForm({ name: "", disposition_match: "", action_type: "email", config_target: "" });
  };

  const activeRules = rules.filter(r => r.enabled).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Zap className="h-6 w-6" /> Post-Call Automations</h1>
          <p className="text-sm text-muted-foreground">Configure trigger conditions and notification channels per disposition</p>
        </div>
        <Dialog open={newOpen} onOpenChange={setNewOpen}>
          <DialogTrigger asChild>
            <Button className="gap-1.5"><Plus className="h-4 w-4" /> New Rule</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Automation Rule</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Rule name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              <Input placeholder="Disposition match (e.g. Intake Complete)" value={form.disposition_match} onChange={e => setForm(f => ({ ...f, disposition_match: e.target.value }))} />
              <Select value={form.action_type} onValueChange={v => setForm(f => ({ ...f, action_type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="slack">Slack</SelectItem>
                  <SelectItem value="crm">CRM Update</SelectItem>
                  <SelectItem value="task">Create Task</SelectItem>
                  <SelectItem value="callback">Schedule Callback</SelectItem>
                </SelectContent>
              </Select>
              <Textarea placeholder="Target / config (e.g. email address, Slack channel)" value={form.config_target} onChange={e => setForm(f => ({ ...f, config_target: e.target.value }))} rows={2} />
              <Button onClick={handleCreate} className="w-full">Create Rule</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><Zap className="h-4 w-4" /><span className="text-xs">Total Rules</span></div>
          <p className="text-2xl font-bold">{rules.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><Shield className="h-4 w-4" /><span className="text-xs">Active</span></div>
          <p className="text-2xl font-bold text-success">{activeRules}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><Mail className="h-4 w-4" /><span className="text-xs">Email Actions</span></div>
          <p className="text-2xl font-bold">{rules.filter(r => r.action_type === "email").length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><MessageSquare className="h-4 w-4" /><span className="text-xs">SMS Actions</span></div>
          <p className="text-2xl font-bold">{rules.filter(r => r.action_type === "sms").length}</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">Automation Rules</TabsTrigger>
          <TabsTrigger value="channels">Channel Preferences</TabsTrigger>
        </TabsList>

        <TabsContent value="rules" className="space-y-4">
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {rules.length === 0 && !isLoading && (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <Zap className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No automation rules yet. Create one to get started.</p>
            </CardContent></Card>
          )}
          {rules.map(rule => {
            const Icon = channelIcon(rule.action_type);
            return (
              <Card key={rule.id} className={!rule.enabled ? "opacity-60" : ""}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-4">
                    <Switch checked={rule.enabled} onCheckedChange={() => toggleRule(rule.id, rule.enabled)} />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-medium">{rule.name}</h4>
                        <Badge variant="outline" className="text-xs capitalize">{rule.action_type}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium">IF disposition =</span>
                        <Badge variant="outline" className="text-xs font-mono">{rule.disposition_match}</Badge>
                        <ChevronRight className="h-3 w-3" />
                        <Badge variant="default" className="text-xs gap-1"><Icon className="h-3 w-3" /> {rule.action_type}</Badge>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm"><Settings2 className="h-4 w-4" /></Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="channels" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Urgency-Based Channel Routing</CardTitle>
              <CardDescription>Configure primary and fallback notification channels by urgency level</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Urgency</TableHead>
                    <TableHead>Primary Channel</TableHead>
                    <TableHead>Fallback Channel</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    { urgency: "HIGH", primary: "SMS", fallback: "Slack" },
                    { urgency: "NORMAL", primary: "Slack", fallback: "Email" },
                    { urgency: "LOW", primary: "Email", fallback: "None" },
                  ].map((p, i) => (
                    <TableRow key={i}>
                      <TableCell><Badge variant={p.urgency === "HIGH" ? "destructive" : p.urgency === "NORMAL" ? "default" : "secondary"}>{p.urgency}</Badge></TableCell>
                      <TableCell>
                        <Select defaultValue={p.primary}>
                          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SMS">SMS</SelectItem>
                            <SelectItem value="Slack">Slack</SelectItem>
                            <SelectItem value="Email">Email</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select defaultValue={p.fallback}>
                          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SMS">SMS</SelectItem>
                            <SelectItem value="Slack">Slack</SelectItem>
                            <SelectItem value="Email">Email</SelectItem>
                            <SelectItem value="None">None</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function PostCallAutomationsPage() {
  return <PostCallAutomationsContent />;
}
