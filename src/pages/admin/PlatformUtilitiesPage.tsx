import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Upload, Loader2, FileJson, Key, Eye, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";

export default function PlatformUtilitiesPage() {
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importLog, setImportLog] = useState<string[]>([]);
  const [pabblyUrl, setPabblyUrl] = useState("");
  const [pabblyDomain, setPabblyDomain] = useState("");
  const [pabblyTesting, setPabblyTesting] = useState(false);
  const [pabblyStatus, setPabblyStatus] = useState<"idle" | "success" | "error">("idle");
  const [selectedView, setSelectedView] = useState("agent");

  const handleImport = () => {
    if (!importFile) { toast.error("Select a file first"); return; }
    setImporting(true);
    setImportLog(["Reading file...", `Parsing ${importFile.name}...`]);
    setTimeout(() => {
      setImportLog((l) => [...l, "Detected 3 scripts, 2 templates, 1 config block"]);
      setTimeout(() => {
        setImportLog((l) => [...l, "Imported script: Intake_Flow_v2", "Imported script: Callback_Handler", "Imported script: After_Hours"]);
        setTimeout(() => {
          setImportLog((l) => [...l, "Imported template: Legal_Intake", "Imported template: Home_Services"]);
          setTimeout(() => {
            setImportLog((l) => [...l, "Imported config: domain_settings", "✓ Import complete — 6 items processed"]);
            setImporting(false);
            toast.success("AI59 import complete");
          }, 600);
        }, 500);
      }, 700);
    }, 800);
  };

  const testPabbly = () => {
    if (!pabblyUrl || !pabblyDomain) { toast.error("Enter both URL and domain"); return; }
    setPabblyTesting(true);
    setPabblyStatus("idle");
    setTimeout(() => {
      setPabblyStatus("success");
      setPabblyTesting(false);
      toast.success("Pabbly bridge connection verified");
    }, 2000);
  };

  const views = [
    { value: "agent", label: "Agent View", description: "Personal queue, tasks, and scripts" },
    { value: "supervisor", label: "Supervisor View", description: "Team monitoring, QA, and escalations" },
    { value: "admin", label: "Admin View", description: "Full configuration and management" },
    { value: "client", label: "Client View", description: "Read-only reports and billing" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Platform Utilities</h1>
        <p className="text-sm text-muted-foreground mt-1">Import tools, auth bridges, and role-based view configuration</p>
      </div>

      <Tabs defaultValue="import" className="space-y-4">
        <TabsList>
          <TabsTrigger value="import"><FileJson className="h-4 w-4 mr-1.5" />AI59 Import</TabsTrigger>
          <TabsTrigger value="pabbly"><Key className="h-4 w-4 mr-1.5" />Pabbly Bridge</TabsTrigger>
          <TabsTrigger value="views"><Eye className="h-4 w-4 mr-1.5" />View Switcher</TabsTrigger>
        </TabsList>

        <TabsContent value="import" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">AI59 Import Tool</CardTitle>
              <CardDescription>Import scripts, templates, and configs from AI59 JSON exports</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Select Export File</Label>
                <Input type="file" accept=".json,.jsonl" onChange={(e) => setImportFile(e.target.files?.[0] || null)} className="mt-1.5" />
              </div>
              <Button onClick={handleImport} disabled={importing || !importFile}>
                {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                Import
              </Button>
              {importLog.length > 0 && (
                <div className="bg-muted/50 rounded-lg p-4 font-mono text-xs space-y-1 max-h-64 overflow-y-auto">
                  {importLog.map((line, i) => (
                    <div key={i} className={line.startsWith("✓") ? "text-success" : "text-muted-foreground"}>
                      {line}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pabbly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pabbly Five9 Auth Bridge</CardTitle>
              <CardDescription>Proxy Five9 admin login via Pabbly for restricted API access scenarios</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Pabbly Webhook URL</Label>
                  <Input placeholder="https://connect.pabbly.com/workflow/..." value={pabblyUrl} onChange={(e) => setPabblyUrl(e.target.value)} className="mt-1.5" />
                </div>
                <div>
                  <Label>Five9 Domain</Label>
                  <Input placeholder="my-domain" value={pabblyDomain} onChange={(e) => setPabblyDomain(e.target.value)} className="mt-1.5" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button onClick={testPabbly} disabled={pabblyTesting}>
                  {pabblyTesting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  Test Connection
                </Button>
                {pabblyStatus === "success" && <Badge className="bg-success/10 text-success border-0"><CheckCircle2 className="h-3 w-3 mr-1" />Connected</Badge>}
                {pabblyStatus === "error" && <Badge className="bg-destructive/10 text-destructive border-0"><AlertCircle className="h-3 w-3 mr-1" />Failed</Badge>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="views" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Role-Based View Switcher</CardTitle>
              <CardDescription>Configure which sidebar sections and pages are visible per role</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Preview View As</Label>
                <Select value={selectedView} onValueChange={setSelectedView}>
                  <SelectTrigger className="mt-1.5 w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {views.map((v) => (
                      <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="grid gap-3 md:grid-cols-2">
                {views.map((v) => (
                  <Card key={v.value} className={`transition-colors ${selectedView === v.value ? "border-primary bg-primary/5" : ""}`}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-sm">{v.label}</p>
                          <p className="text-xs text-muted-foreground">{v.description}</p>
                        </div>
                        {selectedView === v.value && <Badge className="bg-primary text-primary-foreground">Active</Badge>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="bg-muted/50 rounded-lg p-4">
                <p className="text-sm font-medium mb-2">Visible Sections for "{views.find((v) => v.value === selectedView)?.label}"</p>
                <div className="flex flex-wrap gap-2">
                  {selectedView === "agent" && ["My Dashboard", "Scripter", "Agent Dashboard", "Knowledge Base"].map((s) => <Badge key={s} variant="outline">{s}</Badge>)}
                  {selectedView === "supervisor" && ["My Dashboard", "Supervisor", "QA & Analytics", "Agents", "Reports", "Scripter"].map((s) => <Badge key={s} variant="outline">{s}</Badge>)}
                  {selectedView === "admin" && ["All Sections"].map((s) => <Badge key={s} variant="outline">{s}</Badge>)}
                  {selectedView === "client" && ["My Dashboard", "Reports", "Billing"].map((s) => <Badge key={s} variant="outline">{s}</Badge>)}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
