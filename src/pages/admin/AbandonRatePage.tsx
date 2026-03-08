import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import {
  ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle2, XCircle, RefreshCw,
  Loader2, Play, Zap, TrendingDown, BarChart3, FileSearch, Wrench, LayoutTemplate,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";

// Mock data
const skillAuditData = [
  { skill: "English Inbound", callbackEnabled: true, compliant: true, lastAudit: "2026-03-08T10:00:00Z", abandonRate: 3.2, previousRate: 5.1 },
  { skill: "French Inbound", callbackEnabled: false, compliant: false, lastAudit: "2026-03-08T10:00:00Z", abandonRate: 8.7, previousRate: 8.7 },
  { skill: "Spanish Support", callbackEnabled: true, compliant: true, lastAudit: "2026-03-07T14:00:00Z", abandonRate: 4.1, previousRate: 6.8 },
  { skill: "After Hours", callbackEnabled: false, compliant: false, lastAudit: "2026-03-08T10:00:00Z", abandonRate: 12.3, previousRate: 12.3 },
  { skill: "Billing Queue", callbackEnabled: true, compliant: true, lastAudit: "2026-03-06T09:00:00Z", abandonRate: 2.8, previousRate: 4.5 },
  { skill: "Tech Support", callbackEnabled: false, compliant: false, lastAudit: null, abandonRate: 9.4, previousRate: 9.4 },
  { skill: "VIP Inbound", callbackEnabled: true, compliant: true, lastAudit: "2026-03-08T10:00:00Z", abandonRate: 1.2, previousRate: 2.9 },
];

const ivrAnalysis = [
  { script: "Main_IVR_v3", hasHighVolBranch: true, hasCallback: true, hasWaitAnnounce: true, score: 100 },
  { script: "After_Hours_IVR", hasHighVolBranch: false, hasCallback: false, hasWaitAnnounce: false, score: 0 },
  { script: "French_IVR_v2", hasHighVolBranch: true, hasCallback: false, hasWaitAnnounce: true, score: 66 },
  { script: "Billing_IVR", hasHighVolBranch: true, hasCallback: true, hasWaitAnnounce: false, score: 66 },
  { script: "Emergency_IVR", hasHighVolBranch: false, hasCallback: false, hasWaitAnnounce: true, score: 33 },
];

const remediationHistory = [
  { id: "1", timestamp: "2026-03-08T10:15:00Z", action: "Enable Callback", target: "English Inbound", status: "success", detail: "modifySkill: enableCallback=true" },
  { id: "2", timestamp: "2026-03-08T10:16:00Z", action: "Inject Callback Module", target: "Main_IVR_v3", status: "success", detail: "modifyIVRScript: added callback menu at node 4" },
  { id: "3", timestamp: "2026-03-07T14:30:00Z", action: "Enable Callback", target: "Spanish Support", status: "success", detail: "modifySkill: enableCallback=true" },
  { id: "4", timestamp: "2026-03-06T09:10:00Z", action: "Enable Callback", target: "Billing Queue", status: "success", detail: "modifySkill: enableCallback=true" },
  { id: "5", timestamp: "2026-03-05T16:00:00Z", action: "Inject Wait Announce", target: "French_IVR_v2", status: "failed", detail: "SOAP fault: insufficient permissions" },
];

const trendData = [
  { date: "Mar 1", before: 7.2, after: 7.2 },
  { date: "Mar 2", before: 6.8, after: 6.8 },
  { date: "Mar 3", before: 7.5, after: 5.2 },
  { date: "Mar 4", before: 8.1, after: 4.8 },
  { date: "Mar 5", before: 7.9, after: 4.1 },
  { date: "Mar 6", before: 6.5, after: 3.5 },
  { date: "Mar 7", before: 7.0, after: 3.2 },
  { date: "Mar 8", before: 6.8, after: 2.9 },
];

export default function AbandonRatePage() {
  const [scanning, setScanning] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [remediating, setRemediating] = useState(false);
  const [autoRemediate, setAutoRemediate] = useState(false);

  const compliantCount = skillAuditData.filter((s) => s.compliant).length;
  const totalSkills = skillAuditData.length;
  const compliancePercent = Math.round((compliantCount / totalSkills) * 100);
  const avgAbandonRate = (skillAuditData.reduce((s, sk) => s + sk.abandonRate, 0) / totalSkills).toFixed(1);
  const avgIvrScore = Math.round(ivrAnalysis.reduce((s, i) => s + i.score, 0) / ivrAnalysis.length);

  const runScan = () => {
    setScanning(true);
    setTimeout(() => { setScanning(false); toast.success("Skill callback audit complete"); }, 2000);
  };

  const runAnalysis = () => {
    setAnalyzing(true);
    setTimeout(() => { setAnalyzing(false); toast.success("IVR optimization analysis complete"); }, 3000);
  };

  const runRemediation = () => {
    setRemediating(true);
    setTimeout(() => { setRemediating(false); toast.success("Auto-remediation applied to 3 skills"); }, 2500);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Abandon Rate Reduction Engine</h1>
          <p className="text-sm text-muted-foreground mt-1">Automated skill audit, IVR optimization, and callback remediation</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Switch checked={autoRemediate} onCheckedChange={setAutoRemediate} />
            <span className="text-sm text-muted-foreground">Auto-Remediate</span>
          </div>
          <Button onClick={runScan} disabled={scanning}>
            {scanning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Run Full Scan
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10"><ShieldCheck className="h-5 w-5 text-success" /></div>
              <div>
                <p className="text-2xl font-bold">{compliantCount}/{totalSkills}</p>
                <p className="text-xs text-muted-foreground">Skills Compliant</p>
              </div>
            </div>
            <Progress value={compliancePercent} className="mt-3 h-1.5" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10"><TrendingDown className="h-5 w-5 text-destructive" /></div>
              <div>
                <p className="text-2xl font-bold">{avgAbandonRate}%</p>
                <p className="text-xs text-muted-foreground">Avg Abandon Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10"><BarChart3 className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-2xl font-bold">{avgIvrScore}%</p>
                <p className="text-xs text-muted-foreground">Avg IVR Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10"><Wrench className="h-5 w-5 text-warning" /></div>
              <div>
                <p className="text-2xl font-bold">{remediationHistory.filter(r => r.status === "success").length}</p>
                <p className="text-xs text-muted-foreground">Remediations Applied</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="audit" className="space-y-4">
        <TabsList>
          <TabsTrigger value="audit"><FileSearch className="h-4 w-4 mr-1.5" />Skill Audit</TabsTrigger>
          <TabsTrigger value="ivr"><Zap className="h-4 w-4 mr-1.5" />IVR Analysis</TabsTrigger>
          <TabsTrigger value="remediation"><Wrench className="h-4 w-4 mr-1.5" />Remediation</TabsTrigger>
          <TabsTrigger value="dashboard"><BarChart3 className="h-4 w-4 mr-1.5" />Dashboard</TabsTrigger>
        </TabsList>

        {/* Skill Audit Tab */}
        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Skill Callback Audit</CardTitle>
                <CardDescription>Scans all active skills for enableCallback status via SOAP getSkillsInfo</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={runScan} disabled={scanning}>
                {scanning ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1.5" />}
                Scan Now
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Skill</TableHead>
                    <TableHead>Callback Enabled</TableHead>
                    <TableHead>Compliance</TableHead>
                    <TableHead>Abandon Rate</TableHead>
                    <TableHead>Previous Rate</TableHead>
                    <TableHead>Δ</TableHead>
                    <TableHead>Last Audit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {skillAuditData.map((skill) => {
                    const delta = skill.abandonRate - skill.previousRate;
                    return (
                      <TableRow key={skill.skill}>
                        <TableCell className="font-medium">{skill.skill}</TableCell>
                        <TableCell>
                          {skill.callbackEnabled
                            ? <Badge variant="outline" className="text-success border-success/30"><CheckCircle2 className="h-3 w-3 mr-1" />Yes</Badge>
                            : <Badge variant="outline" className="text-destructive border-destructive/30"><XCircle className="h-3 w-3 mr-1" />No</Badge>}
                        </TableCell>
                        <TableCell>
                          {skill.compliant
                            ? <Badge className="bg-success/10 text-success border-0">Compliant</Badge>
                            : <Badge className="bg-destructive/10 text-destructive border-0">Non-Compliant</Badge>}
                        </TableCell>
                        <TableCell className={skill.abandonRate > 7 ? "text-destructive font-medium" : ""}>{skill.abandonRate}%</TableCell>
                        <TableCell className="text-muted-foreground">{skill.previousRate}%</TableCell>
                        <TableCell>
                          {delta < 0
                            ? <span className="text-success text-sm">{delta.toFixed(1)}%</span>
                            : delta === 0
                            ? <span className="text-muted-foreground text-sm">—</span>
                            : <span className="text-destructive text-sm">+{delta.toFixed(1)}%</span>}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {skill.lastAudit ? new Date(skill.lastAudit).toLocaleDateString() : "Never"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* IVR Analysis Tab */}
        <TabsContent value="ivr" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">IVR Optimization Analyzer</CardTitle>
                <CardDescription>AI-assisted analysis of IVR scripts for callback modules, wait-time announcements, and high-volume branching</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={runAnalysis} disabled={analyzing}>
                {analyzing ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Zap className="h-4 w-4 mr-1.5" />}
                Analyze Scripts
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>IVR Script</TableHead>
                    <TableHead>High-Volume Branch</TableHead>
                    <TableHead>Callback Module</TableHead>
                    <TableHead>Wait Announce</TableHead>
                    <TableHead>Compliance Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ivrAnalysis.map((ivr) => (
                    <TableRow key={ivr.script}>
                      <TableCell className="font-medium font-mono text-sm">{ivr.script}</TableCell>
                      <TableCell>{ivr.hasHighVolBranch ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-destructive" />}</TableCell>
                      <TableCell>{ivr.hasCallback ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-destructive" />}</TableCell>
                      <TableCell>{ivr.hasWaitAnnounce ? <CheckCircle2 className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-destructive" />}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={ivr.score} className="h-1.5 w-20" />
                          <span className={`text-sm font-medium ${ivr.score === 100 ? "text-success" : ivr.score >= 66 ? "text-warning" : "text-destructive"}`}>{ivr.score}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Separator className="my-4" />

              <Card className="border-dashed">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2"><LayoutTemplate className="h-4 w-4" />Generic Callback Template</CardTitle>
                  <CardDescription className="text-xs">Pre-built IVR callback flow: high-volume If/Then → announcement → menu → digit mapping</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 text-xs font-mono bg-muted/50 rounded-lg p-3">
                    <span className="text-primary">IF</span> Calls_In_Queue &gt; gv_MaxQueueThreshold
                    <span className="text-primary">THEN</span> Play(wait_announce)
                    <span className="text-primary">→</span> Menu(1=hold, 2=callback)
                    <span className="text-primary">→</span> SkillTransfer(callback_skill)
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Remediation Tab */}
        <TabsContent value="remediation" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Auto-Remediation Engine</CardTitle>
                <CardDescription>Automated SOAP calls to enable callback on flagged skills and inject missing IVR modules</CardDescription>
              </div>
              <Button size="sm" onClick={runRemediation} disabled={remediating}>
                {remediating ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Play className="h-4 w-4 mr-1.5" />}
                Run Remediation
              </Button>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center gap-4 p-3 rounded-lg border bg-muted/30">
                <AlertTriangle className="h-5 w-5 text-warning" />
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {skillAuditData.filter((s) => !s.compliant).length} skills and{" "}
                    {ivrAnalysis.filter((i) => i.score < 100).length} IVR scripts need remediation
                  </p>
                  <p className="text-xs text-muted-foreground">Remediation will call modifySkill and modifyIVRScript via SOAP API</p>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Detail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {remediationHistory.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm text-muted-foreground">{new Date(r.timestamp).toLocaleString()}</TableCell>
                      <TableCell className="font-medium">{r.action}</TableCell>
                      <TableCell className="font-mono text-sm">{r.target}</TableCell>
                      <TableCell>
                        {r.status === "success"
                          ? <Badge className="bg-success/10 text-success border-0">Success</Badge>
                          : <Badge className="bg-destructive/10 text-destructive border-0">Failed</Badge>}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono max-w-[300px] truncate">{r.detail}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Abandon Rate Trend</CardTitle>
                <CardDescription>Before vs. after remediation</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" className="text-xs" />
                    <YAxis unit="%" className="text-xs" />
                    <ReTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Legend />
                    <Line type="monotone" dataKey="before" stroke="hsl(var(--destructive))" strokeDasharray="5 5" name="Before" dot={false} />
                    <Line type="monotone" dataKey="after" stroke="hsl(var(--success))" strokeWidth={2} name="After" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Per-Skill Abandon Rates</CardTitle>
                <CardDescription>Current abandon rate by skill</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={skillAuditData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" unit="%" className="text-xs" />
                    <YAxis dataKey="skill" type="category" width={120} className="text-xs" />
                    <ReTooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Bar dataKey="abandonRate" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Abandon %" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
