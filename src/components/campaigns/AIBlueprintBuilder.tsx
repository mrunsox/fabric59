import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Upload, FileText, Loader2, ChevronDown, ChevronRight, Sparkles,
  Phone, Building2, ListChecks, Route, Link2, ArrowRight, X, CheckCircle2, AlertCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import type { CampaignIntakeData } from "@/types/campaign";
import { useActiveWorkspaceId } from "@/hooks/useActiveWorkspaceId";

type Step = "upload" | "extracting" | "analyzing" | "review";

interface FileEntry {
  file: File;
  status: "pending" | "uploading" | "extracting" | "done" | "error";
  text?: string;
  error?: string;
}

interface AIBlueprintBuilderProps {
  onClose: () => void;
}

export function AIBlueprintBuilder({ onClose }: AIBlueprintBuilderProps) {
  const { organization } = useAuth();
  const navigate = useNavigate();
  const { workspaceId: activeWorkspaceId, isLoading: workspaceLoading } = useActiveWorkspaceId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [campaignData, setCampaignData] = useState<Partial<CampaignIntakeData> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    basics: true, departments: true, dispositions: true, ivr: false,
    phones: false, connectors: false, schedule: false, notes: false,
  });

  const toggleSection = (key: string) =>
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const addFiles = useCallback((newFiles: File[]) => {
    const entries: FileEntry[] = newFiles.map((file) => ({ file, status: "pending" as const }));
    setFiles((prev) => [...prev, ...entries]);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const dropped = Array.from(e.dataTransfer.files);
      if (dropped.length) addFiles(dropped);
    },
    [addFiles]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(e.target.files || []);
      if (selected.length) addFiles(selected);
      e.target.value = "";
    },
    [addFiles]
  );

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const processAll = async () => {
    if (!organization?.id || files.length === 0) return;
    setError(null);
    setStep("extracting");
    setProgress(0);

    const totalSteps = files.length + 1; // +1 for AI step
    let completed = 0;
    const extractedDocs: { fileName: string; text: string }[] = [];

    // Step 1: Upload & extract text from each file
    for (let i = 0; i < files.length; i++) {
      const entry = files[i];
      setFiles((prev) =>
        prev.map((f, idx) => (idx === i ? { ...f, status: "uploading" } : f))
      );

      try {
        const storagePath = `${organization.id}/${Date.now()}-${entry.file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("blueprint-documents")
          .upload(storagePath, entry.file);

        if (uploadError) throw uploadError;

        setFiles((prev) =>
          prev.map((f, idx) => (idx === i ? { ...f, status: "extracting" } : f))
        );

        const { data, error: parseError } = await supabase.functions.invoke(
          "parse-blueprint-doc",
          { body: { filePath: storagePath, bucket: "blueprint-documents" } }
        );

        if (parseError) throw parseError;

        const text = data?.text || "";
        extractedDocs.push({ fileName: entry.file.name, text });

        setFiles((prev) =>
          prev.map((f, idx) => (idx === i ? { ...f, status: "done", text } : f))
        );
      } catch (err: any) {
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: "error", error: err.message } : f
          )
        );
      }

      completed++;
      setProgress(Math.round((completed / totalSteps) * 100));
    }

    if (extractedDocs.length === 0) {
      setError("No documents could be processed. Please check the files and try again.");
      setStep("upload");
      return;
    }

    // Step 2: Send to AI
    setStep("analyzing");
    setProgress(Math.round((completed / totalSteps) * 100));

    try {
      const { data, error: aiError } = await supabase.functions.invoke(
        "ai-blueprint-builder",
        { body: { documents: extractedDocs } }
      );

      if (aiError) throw aiError;
      if (data?.error) throw new Error(data.error);

      setCampaignData(data.campaign);
      setStep("review");
      setProgress(100);
      toast.success("AI analysis complete! Review the generated campaign below.");
    } catch (err: any) {
      setError(`AI analysis failed: ${err.message}`);
      setStep("upload");
    }
  };

  const createCampaign = () => {
    if (!campaignData) return;
    navigate("/admin/campaigns/new", { state: { prefill: campaignData } });
  };

  const updateField = (field: string, value: any) => {
    setCampaignData((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  // ── UPLOAD STEP ──
  if (step === "upload") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI Campaign Builder
            </h2>
            <p className="text-sm text-muted-foreground">
              Drop your campaign documents and AI will build the entire setup
            </p>
          </div>
          <Button variant="ghost" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {error && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="flex items-center gap-3 py-3">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors
            ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"}
          `}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,.doc,.txt,.md"
            multiple
            onChange={handleFileInput}
            className="hidden"
          />
          <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium text-foreground">Drop campaign documents here</p>
          <p className="text-sm text-muted-foreground mt-1">
            Agent scripts, FAQ docs, department guides, call flows. PDF, DOCX, or TXT.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Drop multiple files at once for best results
          </p>
        </div>

        {/* File list */}
        {files.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {files.length} document{files.length > 1 ? "s" : ""} queued
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {files.map((entry, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded border bg-muted/30">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">{entry.file.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {(entry.file.size / 1024).toFixed(0)} KB
                    </Badge>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeFile(i)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              <Button onClick={processAll} className="w-full mt-4" disabled={files.length === 0}>
                <Sparkles className="mr-2 h-4 w-4" />
                Build Campaign from {files.length} Document{files.length > 1 ? "s" : ""}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // ── EXTRACTING / ANALYZING STEP ──
  if (step === "extracting" || step === "analyzing") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            {step === "extracting" ? "Extracting Text…" : "AI Analyzing Documents…"}
          </h2>
          <Button variant="ghost" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        <Progress value={progress} className="h-2" />
        <p className="text-sm text-muted-foreground text-center">
          {step === "extracting"
            ? "Uploading and extracting text from documents…"
            : "AI is analyzing all documents and building the campaign structure…"}
        </p>

        <div className="space-y-2">
          {files.map((entry, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded border bg-card">
              {entry.status === "done" ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : entry.status === "error" ? (
                <AlertCircle className="h-4 w-4 text-destructive" />
              ) : entry.status === "pending" ? (
                <FileText className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              )}
              <span className="text-sm text-foreground flex-1">{entry.file.name}</span>
              <Badge variant="secondary" className="text-xs">
                {entry.status === "uploading" ? "Uploading…" :
                  entry.status === "extracting" ? "Extracting…" :
                  entry.status === "done" ? "Done" :
                  entry.status === "error" ? "Error" : "Queued"}
              </Badge>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── REVIEW STEP ──
  if (!campaignData) return null;

  const departments = campaignData.departments || [];
  const dispositions = [
    ...(campaignData.existingDispositions || []),
    ...(campaignData.newDispositions || []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Campaign Generated
          </h2>
          <p className="text-sm text-muted-foreground">Review and edit before creating</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setStep("upload"); setCampaignData(null); }}>
            Start Over
          </Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={createCampaign}>
            <ArrowRight className="mr-2 h-4 w-4" /> Create Campaign Setup
          </Button>
        </div>
      </div>

      {/* Basics */}
      <Collapsible open={openSections.basics} onOpenChange={() => toggleSection("basics")}>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="flex flex-row items-center justify-between cursor-pointer py-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" /> Campaign Basics
              </CardTitle>
              {openSections.basics ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-3 pt-0">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Campaign Name</Label>
                  <Input value={campaignData.campaignName || ""} onChange={(e) => updateField("campaignName", e.target.value)} />
                </div>
                <div>
                  <Label>Client Name</Label>
                  <Input value={campaignData.clientName || ""} onChange={(e) => updateField("clientName", e.target.value)} />
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={campaignData.campaignDescription || ""} onChange={(e) => updateField("campaignDescription", e.target.value)} rows={3} />
              </div>
              <div className="flex gap-4">
                <Badge variant={campaignData.isMultiDepartment ? "default" : "secondary"}>
                  {campaignData.isMultiDepartment ? "Multi-Department" : "Single Department"}
                </Badge>
                <Badge variant="secondary">Skill: {campaignData.skillName || "—"}</Badge>
                <Badge variant="secondary">Priority: {campaignData.priority || "normal"}</Badge>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Departments */}
      <Collapsible open={openSections.departments} onOpenChange={() => toggleSection("departments")}>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="flex flex-row items-center justify-between cursor-pointer py-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Route className="h-4 w-4" /> Departments ({departments.length})
              </CardTitle>
              {openSections.departments ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-3 pt-0">
              {departments.map((dept, i) => (
                <Card key={i} className="bg-muted/30">
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge>IVR #{dept.ivrPromptNumber}</Badge>
                      <span className="font-medium text-foreground">{dept.name}</span>
                      {dept.skillName && <Badge variant="secondary">Skill: {dept.skillName}</Badge>}
                    </div>
                    {dept.ivrGreeting && (
                      <p className="text-xs text-muted-foreground">Greeting: {dept.ivrGreeting}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {dept.decisionTree?.length || 0} decision tree nodes ·{" "}
                      {dept.dispositionEmailConfigs?.length || 0} email configs
                    </p>
                  </CardContent>
                </Card>
              ))}
              {departments.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No departments detected</p>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Dispositions */}
      <Collapsible open={openSections.dispositions} onOpenChange={() => toggleSection("dispositions")}>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="flex flex-row items-center justify-between cursor-pointer py-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ListChecks className="h-4 w-4" /> Dispositions ({dispositions.length})
              </CardTitle>
              {openSections.dispositions ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-2">
                {(campaignData.existingDispositions || []).map((d, i) => (
                  <Badge key={`e-${i}`} variant="secondary">{d}</Badge>
                ))}
                {(campaignData.newDispositions || []).map((d, i) => (
                  <Badge key={`n-${i}`} variant="default">{d} (new)</Badge>
                ))}
              </div>
              {dispositions.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No dispositions detected</p>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Phone Numbers */}
      <Collapsible open={openSections.phones} onOpenChange={() => toggleSection("phones")}>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="flex flex-row items-center justify-between cursor-pointer py-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Phone className="h-4 w-4" /> Phone Numbers
              </CardTitle>
              {openSections.phones ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-2 pt-0">
              {(campaignData.aniNumbers || []).length > 0 && (
                <div>
                  <Label className="text-xs">ANI Numbers</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {campaignData.aniNumbers!.map((n, i) => <Badge key={i} variant="secondary">{n}</Badge>)}
                  </div>
                </div>
              )}
              {(campaignData.dnisNumbers || []).length > 0 && (
                <div>
                  <Label className="text-xs">DNIS Numbers</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {campaignData.dnisNumbers!.map((n, i) => <Badge key={i} variant="secondary">{n}</Badge>)}
                  </div>
                </div>
              )}
              {campaignData.transferDisplayNumber && (
                <p className="text-sm text-muted-foreground">Transfer display: {campaignData.transferDisplayNumber}</p>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Connectors */}
      <Collapsible open={openSections.connectors} onOpenChange={() => toggleSection("connectors")}>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="flex flex-row items-center justify-between cursor-pointer py-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Link2 className="h-4 w-4" /> Connectors ({(campaignData.connectors || []).length})
              </CardTitle>
              {openSections.connectors ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-2 pt-0">
              {(campaignData.connectors || []).map((c, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded border bg-muted/30">
                  <Badge variant="secondary">{c.type}</Badge>
                  <span className="text-sm text-foreground">{c.name}</span>
                  <span className="text-xs text-muted-foreground truncate flex-1">{c.url}</span>
                </div>
              ))}
              {(campaignData.connectors || []).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No connectors detected</p>
              )}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Notes */}
      {campaignData.additionalNotes && (
        <Collapsible open={openSections.notes} onOpenChange={() => toggleSection("notes")}>
          <Card>
            <CollapsibleTrigger className="w-full">
              <CardHeader className="flex flex-row items-center justify-between cursor-pointer py-3">
                <CardTitle className="text-base">Additional Notes</CardTitle>
                {openSections.notes ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{campaignData.additionalNotes}</p>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      {/* Bottom action */}
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={() => { setStep("upload"); setCampaignData(null); }}>
          Start Over
        </Button>
        <Button onClick={createCampaign} size="lg">
          <ArrowRight className="mr-2 h-4 w-4" /> Create Campaign Setup
        </Button>
      </div>
    </div>
  );
}
