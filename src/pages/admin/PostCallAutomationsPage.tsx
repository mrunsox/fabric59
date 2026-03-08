import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Zap, Mail, MessageSquare, Bell, Plus, ArrowRight, Clock,
  Volume2, AlertTriangle, Settings2, Shield, ChevronRight
} from "lucide-react";

interface AutomationRule {
  id: string;
  name: string;
  trigger: string;
  conditions: string[];
  actions: { type: string; channel: string; config: string }[];
  enabled: boolean;
  campaign: string;
}

const MOCK_RULES: AutomationRule[] = [
  {
    id: "1", name: "Intake Email to Attorney", trigger: "disposition", campaign: "PI Intake",
    conditions: ["disposition = 'Intake Complete'"],
    actions: [{ type: "email", channel: "Email", config: "Send to attorney@firm.com with intake summary" }],
    enabled: true,
  },
  {
    id: "2", name: "Urgent SMS Alert", trigger: "disposition", campaign: "All Campaigns",
    conditions: ["disposition = 'Emergency'", "urgency = 'HIGH'"],
    actions: [
      { type: "sms", channel: "SMS", config: "Send via Twilio to on-call attorney" },
      { type: "slack", channel: "Slack", config: "Post to #urgent-intake channel" },
    ],
    enabled: true,
  },
  {
    id: "3", name: "Callback Reminder", trigger: "disposition", campaign: "Family Law",
    conditions: ["disposition = 'Callback Requested'"],
    actions: [{ type: "email", channel: "Email", config: "Schedule follow-up email after 30 min" }],
    enabled: false,
  },
  {
    id: "4", name: "AI Call Summary", trigger: "call_end", campaign: "All Campaigns",
    conditions: ["duration > 60"],
    actions: [{ type: "ai_email", channel: "AI Email", config: "Generate AI summary and email to client" }],
    enabled: true,
  },
  {
    id: "5", name: "No Answer Notification", trigger: "disposition", campaign: "Workers Comp",
    conditions: ["disposition = 'No Answer'"],
    actions: [{ type: "slack", channel: "Slack", config: "Post missed call to #missed-calls" }],
    enabled: true,
  },
];

const MOCK_QUIET_HOURS = { start: "22:00", end: "07:00", timezone: "America/New_York", enabled: true };

const MOCK_CHANNEL_PREFS = [
  { urgency: "HIGH", primary: "SMS", fallback: "Slack", icon: AlertTriangle },
  { urgency: "NORMAL", primary: "Slack", fallback: "Email", icon: Bell },
  { urgency: "LOW", primary: "Email", fallback: "None", icon: Mail },
];

const channelIcon = (ch: string) => {
  if (ch.includes("Email") || ch.includes("AI")) return Mail;
  if (ch.includes("SMS")) return MessageSquare;
  if (ch.includes("Slack")) return Volume2;
  return Bell;
};

export default function PostCallAutomationsPage() {
  const [rules, setRules] = useState(MOCK_RULES);
  const [quietHours, setQuietHours] = useState(MOCK_QUIET_HOURS);

  const toggleRule = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const activeRules = rules.filter(r => r.enabled).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6" /> Post-Call Automations
          </h1>
          <p className="text-sm text-muted-foreground">Configure trigger conditions and notification channels per campaign</p>
        </div>
        <Button className="gap-1.5"><Plus className="h-4 w-4" /> New Rule</Button>
      </div>

      {/* Summary */}
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
          <p className="text-2xl font-bold">{rules.flatMap(r => r.actions).filter(a => a.type.includes("email")).length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><MessageSquare className="h-4 w-4" /><span className="text-xs">SMS Actions</span></div>
          <p className="text-2xl font-bold">{rules.flatMap(r => r.actions).filter(a => a.type === "sms").length}</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">Automation Rules</TabsTrigger>
          <TabsTrigger value="channels">Channel Preferences</TabsTrigger>
          <TabsTrigger value="quiet">Quiet Hours</TabsTrigger>
          <TabsTrigger value="dispositions">Disposition Mapping</TabsTrigger>
        </TabsList>

        {/* Rules Engine */}
        <TabsContent value="rules" className="space-y-4">
          {rules.map(rule => (
            <Card key={rule.id} className={!rule.enabled ? "opacity-60" : ""}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-4">
                  <Switch checked={rule.enabled} onCheckedChange={() => toggleRule(rule.id)} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-medium">{rule.name}</h4>
                      <Badge variant="outline" className="text-xs">{rule.campaign}</Badge>
                      <Badge variant="secondary" className="text-xs capitalize">on {rule.trigger.replace("_", " ")}</Badge>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                      <span className="font-medium">IF:</span>
                      {rule.conditions.map((c, i) => (
                        <span key={i}>
                          <Badge variant="outline" className="text-xs font-mono">{c}</Badge>
                          {i < rule.conditions.length - 1 && <span className="mx-1">AND</span>}
                        </span>
                      ))}
                      <ChevronRight className="h-3 w-3 mx-1" />
                      <span className="font-medium">THEN:</span>
                      {rule.actions.map((a, i) => {
                        const Icon = channelIcon(a.channel);
                        return (
                          <Badge key={i} variant="default" className="text-xs gap-1">
                            <Icon className="h-3 w-3" /> {a.channel}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Settings2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Channel Preferences */}
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
                    <TableHead>Behavior</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MOCK_CHANNEL_PREFS.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Badge variant={p.urgency === "HIGH" ? "destructive" : p.urgency === "NORMAL" ? "default" : "secondary"}>
                          {p.urgency}
                        </Badge>
                      </TableCell>
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
                      <TableCell className="text-sm text-muted-foreground">
                        {p.urgency === "HIGH" ? "Bypass quiet hours" : p.urgency === "LOW" ? "Delay during quiet hours" : "Standard delivery"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quiet Hours */}
        <TabsContent value="quiet" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" /> Quiet Hours Configuration
              </CardTitle>
              <CardDescription>Non-HIGH urgency notifications are delayed until the quiet window ends</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Switch checked={quietHours.enabled} onCheckedChange={(v) => setQuietHours(prev => ({ ...prev, enabled: v }))} />
                <span className="text-sm font-medium">{quietHours.enabled ? "Quiet Hours Enabled" : "Quiet Hours Disabled"}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Time</label>
                  <Input type="time" value={quietHours.start} onChange={e => setQuietHours(prev => ({ ...prev, start: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">End Time</label>
                  <Input type="time" value={quietHours.end} onChange={e => setQuietHours(prev => ({ ...prev, end: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Timezone</label>
                  <Select value={quietHours.timezone} onValueChange={(v) => setQuietHours(prev => ({ ...prev, timezone: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">Eastern</SelectItem>
                      <SelectItem value="America/Chicago">Central</SelectItem>
                      <SelectItem value="America/Denver">Mountain</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Disposition Mapping */}
        <TabsContent value="dispositions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Disposition → Channel Mapping</CardTitle>
              <CardDescription>Map specific dispositions to notification channels beyond email</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Disposition</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>SMS</TableHead>
                    <TableHead>Slack</TableHead>
                    <TableHead>Push</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {["Intake Complete", "Callback Requested", "Emergency", "Voicemail", "No Answer", "Transferred"].map(disp => (
                    <TableRow key={disp}>
                      <TableCell className="font-medium">{disp}</TableCell>
                      <TableCell><Switch defaultChecked={true} /></TableCell>
                      <TableCell><Switch defaultChecked={disp === "Emergency"} /></TableCell>
                      <TableCell><Switch defaultChecked={["Intake Complete", "Emergency"].includes(disp)} /></TableCell>
                      <TableCell><Switch defaultChecked={disp === "Emergency"} /></TableCell>
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
