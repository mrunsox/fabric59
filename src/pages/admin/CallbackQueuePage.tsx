import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  PhoneCall, Settings2, Gauge, BarChart3, Repeat, Volume2,
  Clock, AlertTriangle, CheckCircle2, Activity, Wrench, RefreshCw
} from "lucide-react";
import { ActionBanner } from "@/components/ui/action-banner";

const MOCK_SKILLS = [
  { name: "PI Intake", callbackEnabled: true, threshold: 5, waitThreshold: 120, callsInQueue: 3, avgWait: 45 },
  { name: "Family Law", callbackEnabled: true, threshold: 3, waitThreshold: 90, callsInQueue: 1, avgWait: 12 },
  { name: "Workers Comp", callbackEnabled: false, threshold: 5, waitThreshold: 120, callsInQueue: 0, avgWait: 0 },
  { name: "General Inquiry", callbackEnabled: false, threshold: 3, waitThreshold: 60, callsInQueue: 2, avgWait: 85 },
  { name: "Emergency Line", callbackEnabled: true, threshold: 2, waitThreshold: 60, callsInQueue: 0, avgWait: 0 },
];

const MOCK_IVR_MODULES = [
  { name: "High Volume Check", type: "If/Then", condition: "Calls_In_Queue > gv_MaxQueueThreshold", branches: ["Hold", "Callback Menu"] },
  { name: "Wait Time Check", type: "If/Then", condition: "Longest_Wait_Time > 120", branches: ["Announce Wait", "Callback Offer"] },
  { name: "Callback Menu", type: "Menu", prompt: "Press 1 to keep your place in line…", digits: { "1": "Schedule Callback", "2": "Continue Holding" } },
  { name: "Mid-Hold Reminder", type: "Announcement", prompt: "You can press 1 at any time to request a callback…", interval: 60 },
];

const MOCK_ANNOUNCEMENTS = [
  { name: "Estimated Wait Time", text: "Your estimated wait time is approximately {wait_time} minutes.", enabled: true },
  { name: "Callback Offer", text: "Press 1 to keep your place in line and receive a callback when an agent is available.", enabled: true },
  { name: "Mid-Hold Reminder", text: "Thank you for holding. Press 1 at any time to request a callback.", enabled: true, repeatInterval: 60 },
  { name: "Position Announcement", text: "You are caller number {queue_position}.", enabled: false },
];

export default function CallbackQueuePage() {
  const [skills, setSkills] = useState(MOCK_SKILLS);
  const [globalThreshold, setGlobalThreshold] = useState(5);
  const [announcements, setAnnouncements] = useState(MOCK_ANNOUNCEMENTS);

  const toggleSkillCallback = (name: string) => {
    setSkills(prev => prev.map(s => s.name === name ? { ...s, callbackEnabled: !s.callbackEnabled } : s));
  };

  const enabledSkills = skills.filter(s => s.callbackEnabled).length;

  return (
    <div className="space-y-6">
      <ActionBanner
        icon={AlertTriangle}
        variant="warning"
        title="Preview surface — sample data"
        description="Skill queue thresholds, IVR modules and announcements shown here are illustrative. Real Five9 sync, persistence and policy push land in a later phase. Actions here do not save."
      />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <PhoneCall className="h-6 w-6" /> Queue Callback
          </h1>
          <p className="text-sm text-muted-foreground">Configure callback automation, IVR logic, and queue thresholds</p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5">
          <RefreshCw className="h-4 w-4" /> Sync from Five9
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><CheckCircle2 className="h-4 w-4" /><span className="text-xs">Callback Enabled</span></div>
          <p className="text-2xl font-bold text-success">{enabledSkills} / {skills.length}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><Gauge className="h-4 w-4" /><span className="text-xs">Global Threshold</span></div>
          <p className="text-2xl font-bold">{globalThreshold} calls</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><Activity className="h-4 w-4" /><span className="text-xs">Total In Queue</span></div>
          <p className="text-2xl font-bold text-warning">{skills.reduce((s, sk) => s + sk.callsInQueue, 0)}</p>
        </CardContent></Card>
        <Card><CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><Clock className="h-4 w-4" /><span className="text-xs">Avg Wait</span></div>
          <p className="text-2xl font-bold font-mono">{Math.round(skills.filter(s => s.avgWait > 0).reduce((s, sk) => s + sk.avgWait, 0) / Math.max(skills.filter(s => s.avgWait > 0).length, 1))}s</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="skills">
        <TabsList>
          <TabsTrigger value="skills">Skill Callback Setup</TabsTrigger>
          <TabsTrigger value="thresholds">Threshold Manager</TabsTrigger>
          <TabsTrigger value="ivr">IVR Logic</TabsTrigger>
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
        </TabsList>

        {/* Skill Callback Setup */}
        <TabsContent value="skills" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Skill</TableHead>
                    <TableHead>Callback</TableHead>
                    <TableHead>Queue Threshold</TableHead>
                    <TableHead>Wait Threshold</TableHead>
                    <TableHead>In Queue</TableHead>
                    <TableHead>Avg Wait</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {skills.map(s => (
                    <TableRow key={s.name}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell><Switch checked={s.callbackEnabled} onCheckedChange={() => toggleSkillCallback(s.name)} /></TableCell>
                      <TableCell className="font-mono">{s.threshold} calls</TableCell>
                      <TableCell className="font-mono">{s.waitThreshold}s</TableCell>
                      <TableCell>
                        <Badge variant={s.callsInQueue > s.threshold ? "destructive" : s.callsInQueue > 0 ? "secondary" : "outline"}>
                          {s.callsInQueue}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">{s.avgWait}s</TableCell>
                      <TableCell>
                        {s.callbackEnabled ? (
                          <Badge variant="default" className="gap-1"><CheckCircle2 className="h-3 w-3" /> Enabled</Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1"><AlertTriangle className="h-3 w-3" /> Disabled</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Threshold Manager */}
        <TabsContent value="thresholds" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Gauge className="h-4 w-4" /> Dynamic Queue Threshold (gv_MaxQueueThreshold)
              </CardTitle>
              <CardDescription>Adjust the global high-volume threshold without editing IVR scripts. This value is sent to Five9 via modifyUserVariable API.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Global Queue Threshold</span>
                  <span className="text-2xl font-bold font-mono">{globalThreshold}</span>
                </div>
                <Slider value={[globalThreshold]} onValueChange={([v]) => setGlobalThreshold(v)} min={1} max={20} step={1} />
                <p className="text-xs text-muted-foreground">When Calls_In_Queue exceeds this value, the IVR offers a callback option to callers.</p>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium">Per-Skill Overrides</h4>
                {skills.map(s => (
                  <div key={s.name} className="flex items-center gap-4 rounded-lg border border-border p-3">
                    <span className="text-sm flex-1">{s.name}</span>
                    <div className="flex items-center gap-2">
                      <Input type="number" value={s.threshold} className="w-20 text-center" min={1} max={20}
                        onChange={e => setSkills(prev => prev.map(sk => sk.name === s.name ? { ...sk, threshold: parseInt(e.target.value) || 1 } : sk))}
                      />
                      <span className="text-xs text-muted-foreground">calls</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input type="number" value={s.waitThreshold} className="w-20 text-center" min={30} max={600} step={30}
                        onChange={e => setSkills(prev => prev.map(sk => sk.name === s.name ? { ...sk, waitThreshold: parseInt(e.target.value) || 60 } : sk))}
                      />
                      <span className="text-xs text-muted-foreground">sec wait</span>
                    </div>
                  </div>
                ))}
              </div>
              <Button className="gap-1.5"><Wrench className="h-4 w-4" /> Apply to Five9</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* IVR Logic */}
        <TabsContent value="ivr" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">IVR Module Configuration</CardTitle>
              <CardDescription>Configure the IVR branching logic for high-volume callback flows</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {MOCK_IVR_MODULES.map((mod, i) => (
                  <div key={i} className="rounded-lg border border-border p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{mod.type}</Badge>
                      <h4 className="text-sm font-medium">{mod.name}</h4>
                    </div>
                    {mod.condition && (
                      <p className="text-xs font-mono bg-muted px-3 py-1.5 rounded">IF {mod.condition}</p>
                    )}
                    {mod.branches && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {mod.branches.map((b, j) => (
                          <span key={j}><Badge variant="secondary" className="text-xs">{j === 0 ? "TRUE →" : "FALSE →"} {b}</Badge></span>
                        ))}
                      </div>
                    )}
                    {mod.prompt && <p className="text-sm text-muted-foreground italic">"{mod.prompt}"</p>}
                    {mod.digits && (
                      <div className="flex gap-2 flex-wrap">
                        {Object.entries(mod.digits).map(([k, v]) => (
                          <Badge key={k} variant="outline" className="text-xs font-mono">Press {k} → {v}</Badge>
                        ))}
                      </div>
                    )}
                    {mod.interval && <p className="text-xs text-muted-foreground">Repeats every {mod.interval}s</p>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Announcements */}
        <TabsContent value="announcements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Volume2 className="h-4 w-4" /> Callback Announcement Config
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {announcements.map((a, i) => (
                  <div key={i} className="flex items-center gap-4 rounded-lg border border-border p-4">
                    <Switch
                      checked={a.enabled}
                      onCheckedChange={() => setAnnouncements(prev => prev.map((ann, j) => j === i ? { ...ann, enabled: !ann.enabled } : ann))}
                    />
                    <div className="flex-1">
                      <h4 className="text-sm font-medium">{a.name}</h4>
                      <p className="text-xs text-muted-foreground italic mt-1">"{a.text}"</p>
                      {a.repeatInterval && <p className="text-xs text-muted-foreground mt-1">Repeats every {a.repeatInterval}s</p>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
