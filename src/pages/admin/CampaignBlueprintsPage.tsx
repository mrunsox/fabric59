import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AIBlueprintBuilder } from "@/components/campaigns/AIBlueprintBuilder";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, ArrowLeft, Save, FileText, Download, Sparkles } from "lucide-react";
import { useCampaignBlueprints, useCreateBlueprint, useUpdateBlueprint, useDeleteBlueprint, CampaignBlueprint } from "@/hooks/useCampaignBlueprints";
import { BlueprintFileUpload } from "@/components/campaigns/BlueprintFileUpload";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const emptyBlueprint: Omit<CampaignBlueprint, "id" | "organization_id" | "created_by" | "created_at" | "updated_at"> = {
  name: "",
  description: "",
  departments: [],
  agent_scripts: [],
  agent_guide: "",
  dispositions: [],
  ivr_flow: { greeting: "", menu_options: [], after_hours: "" },
  phone_numbers: [],
  connectors: [],
  notes: "",
  tags: [],
  documents: [],
};

export default function CampaignBlueprintsPage() {
  const [aiBuilderMode, setAiBuilderMode] = useState(false);
  const { data: blueprints = [], isLoading } = useCampaignBlueprints();
  const createMut = useCreateBlueprint();
  const updateMut = useUpdateBlueprint();
  const deleteMut = useDeleteBlueprint();

  const [editing, setEditing] = useState<Partial<CampaignBlueprint> | null>(null);
  const [tagInput, setTagInput] = useState("");

  const startNew = () => setEditing({ ...emptyBlueprint });
  const startEdit = (bp: CampaignBlueprint) => setEditing({ ...bp });

  const save = () => {
    if (!editing?.name) { toast.error("Name is required"); return; }
    if (editing.id) {
      updateMut.mutate(editing as any, { onSuccess: () => setEditing(null) });
    } else {
      createMut.mutate(editing, { onSuccess: () => setEditing(null) });
    }
  };

  const addTag = () => {
    if (!tagInput.trim() || !editing) return;
    setEditing({ ...editing, tags: [...(editing.tags || []), tagInput.trim()] });
    setTagInput("");
  };

  const removeTag = (i: number) => {
    if (!editing) return;
    setEditing({ ...editing, tags: (editing.tags || []).filter((_, idx) => idx !== i) });
  };

  const addDepartment = () => {
    if (!editing) return;
    setEditing({ ...editing, departments: [...(editing.departments || []), { name: "", ivr_prompt: "", skill: "", script_text: "" }] });
  };

  const updateDepartment = (i: number, field: string, value: string) => {
    if (!editing) return;
    const deps = [...(editing.departments || [])];
    deps[i] = { ...deps[i], [field]: value };
    setEditing({ ...editing, departments: deps });
  };

  const removeDepartment = (i: number) => {
    if (!editing) return;
    setEditing({ ...editing, departments: (editing.departments || []).filter((_, idx) => idx !== i) });
  };

  const addDisposition = () => {
    if (!editing) return;
    setEditing({ ...editing, dispositions: [...(editing.dispositions || []), { name: "", type: "final", email_routing: "" }] });
  };

  const updateDisposition = (i: number, field: string, value: string) => {
    if (!editing) return;
    const disps = [...(editing.dispositions || [])];
    disps[i] = { ...disps[i], [field]: value };
    setEditing({ ...editing, dispositions: disps });
  };

  const removeDisposition = (i: number) => {
    if (!editing) return;
    setEditing({ ...editing, dispositions: (editing.dispositions || []).filter((_, idx) => idx !== i) });
  };

  const addPhoneNumber = () => {
    if (!editing) return;
    setEditing({ ...editing, phone_numbers: [...(editing.phone_numbers || []), { type: "DNIS", number: "", label: "" }] });
  };

  const updatePhoneNumber = (i: number, field: string, value: string) => {
    if (!editing) return;
    const nums = [...(editing.phone_numbers || [])];
    nums[i] = { ...nums[i], [field]: value };
    setEditing({ ...editing, phone_numbers: nums });
  };

  const removePhoneNumber = (i: number) => {
    if (!editing) return;
    setEditing({ ...editing, phone_numbers: (editing.phone_numbers || []).filter((_, idx) => idx !== i) });
  };

  const addConnector = () => {
    if (!editing) return;
    setEditing({ ...editing, connectors: [...(editing.connectors || []), { name: "", type: "", url: "", notes: "" }] });
  };

  const updateConnector = (i: number, field: string, value: string) => {
    if (!editing) return;
    const conns = [...(editing.connectors || [])];
    conns[i] = { ...conns[i], [field]: value };
    setEditing({ ...editing, connectors: conns });
  };

  const removeConnector = (i: number) => {
    if (!editing) return;
    setEditing({ ...editing, connectors: (editing.connectors || []).filter((_, idx) => idx !== i) });
  };

  const addDocument = (doc: { name: string; path: string; uploaded_at: string }) => {
    if (!editing) return;
    setEditing({ ...editing, documents: [...(editing.documents || []), doc] });
  };

  const removeDocument = (i: number) => {
    if (!editing) return;
    setEditing({ ...editing, documents: (editing.documents || []).filter((_, idx) => idx !== i) });
  };

  const downloadDocument = async (path: string, name: string) => {
    const { data, error } = await supabase.storage.from("blueprint-documents").download(path);
    if (error || !data) { toast.error("Download failed"); return; }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── LIST VIEW ──
  if (!editing) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Campaign Blueprints</h1>
            <p className="text-muted-foreground">Reference library of campaign configurations from Five9</p>
          </div>
          <Button onClick={startNew}><Plus className="mr-2 h-4 w-4" /> New Blueprint</Button>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">Loading…</p>
        ) : blueprints.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground">No blueprints yet</h3>
              <p className="text-muted-foreground mb-4">Create your first campaign blueprint to document an existing Five9 campaign.</p>
              <Button onClick={startNew}><Plus className="mr-2 h-4 w-4" /> Create Blueprint</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {blueprints.map((bp) => (
              <Card key={bp.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => startEdit(bp)}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{bp.name}</CardTitle>
                  <CardDescription className="line-clamp-2">{bp.description || "No description"}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{(bp.departments || []).length} dept(s)</span>
                    <span>·</span>
                    <span>{(bp.dispositions || []).length} dispo(s)</span>
                    {(bp.documents || []).length > 0 && (
                      <>
                        <span>·</span>
                        <span>{bp.documents.length} doc(s)</span>
                      </>
                    )}
                  </div>
                  {bp.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {bp.tags.map((t, i) => <Badge key={i} variant="secondary">{t}</Badge>)}
                    </div>
                  )}
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); startEdit(bp); }}>Edit</Button>
                    <Button size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); deleteMut.mutate(bp.id); }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── EDIT VIEW ──
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setEditing(null)}><ArrowLeft className="h-4 w-4" /></Button>
        <h1 className="text-2xl font-bold text-foreground">{editing.id ? "Edit Blueprint" : "New Blueprint"}</h1>
        <div className="ml-auto">
          <Button onClick={save} disabled={createMut.isPending || updateMut.isPending}>
            <Save className="mr-2 h-4 w-4" /> Save
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="departments">Departments ({(editing.departments || []).length})</TabsTrigger>
          <TabsTrigger value="agent-guide">Agent Guide</TabsTrigger>
          <TabsTrigger value="dispositions">Dispositions ({(editing.dispositions || []).length})</TabsTrigger>
          <TabsTrigger value="ivr">IVR Flow</TabsTrigger>
          <TabsTrigger value="phones">Phone Numbers</TabsTrigger>
          <TabsTrigger value="connectors">Connectors</TabsTrigger>
          <TabsTrigger value="documents">Documents ({(editing.documents || []).length})</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Campaign Overview</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label>Name</Label><Input value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="e.g. Client X - 5 Dept Inbound" /></div>
              <div><Label>Description</Label><Textarea value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} placeholder="Overview of campaign structure, goals, etc." rows={4} /></div>
              <div>
                <Label>Tags</Label>
                <div className="flex gap-2 mt-1">
                  <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="Add tag" onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())} />
                  <Button variant="outline" onClick={addTag}>Add</Button>
                </div>
                {(editing.tags || []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {editing.tags!.map((t, i) => (
                      <Badge key={i} variant="secondary" className="cursor-pointer" onClick={() => removeTag(i)}>{t} ×</Badge>
                    ))}
                  </div>
                )}
              </div>
              <Separator />
              <div>
                <Label>Quick Upload</Label>
                <p className="text-xs text-muted-foreground mb-2">Upload a document to auto-populate fields</p>
                <BlueprintFileUpload
                  onTextExtracted={(text) => setEditing({ ...editing, description: (editing.description || "") + "\n\n" + text })}
                  onFileUploaded={addDocument}
                  label="Drop a campaign overview document here"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Departments */}
        <TabsContent value="departments" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-foreground">Departments</h2>
            <Button onClick={addDepartment} size="sm"><Plus className="mr-1 h-3 w-3" /> Add Department</Button>
          </div>
          {(editing.departments || []).map((dept, i) => (
            <Card key={i}>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Department {i + 1}</CardTitle>
                <Button variant="ghost" size="icon" onClick={() => removeDepartment(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div><Label>Name</Label><Input value={dept.name} onChange={(e) => updateDepartment(i, "name", e.target.value)} placeholder="e.g. Intake" /></div>
                  <div><Label>IVR Prompt #</Label><Input value={dept.ivr_prompt} onChange={(e) => updateDepartment(i, "ivr_prompt", e.target.value)} placeholder="e.g. Press 1" /></div>
                  <div><Label>Skill</Label><Input value={dept.skill} onChange={(e) => updateDepartment(i, "skill", e.target.value)} placeholder="e.g. Legal_Intake" /></div>
                </div>
                <div><Label>Agent Script</Label><Textarea value={dept.script_text} onChange={(e) => updateDepartment(i, "script_text", e.target.value)} placeholder="Paste the full agent script for this department…" rows={10} className="font-mono text-xs" /></div>
                <BlueprintFileUpload
                  onTextExtracted={(text) => updateDepartment(i, "script_text", text)}
                  onFileUploaded={addDocument}
                  label={`Upload script for Department ${i + 1}`}
                />
              </CardContent>
            </Card>
          ))}
          {(editing.departments || []).length === 0 && <p className="text-muted-foreground text-center py-8">No departments added yet.</p>}
        </TabsContent>

        {/* Agent Guide */}
        <TabsContent value="agent-guide">
          <Card>
            <CardHeader><CardTitle>Agent Guide</CardTitle><CardDescription>Paste the full agent guide or upload a document.</CardDescription></CardHeader>
            <CardContent className="space-y-4">
              <BlueprintFileUpload
                onTextExtracted={(text) => setEditing({ ...editing, agent_guide: text })}
                onFileUploaded={addDocument}
                label="Upload agent guide (PDF, DOCX, or TXT)"
              />
              <Textarea value={editing.agent_guide || ""} onChange={(e) => setEditing({ ...editing, agent_guide: e.target.value })} placeholder="Paste agent guide here…" rows={20} className="font-mono text-xs" />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dispositions */}
        <TabsContent value="dispositions" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-foreground">Dispositions</h2>
            <Button onClick={addDisposition} size="sm"><Plus className="mr-1 h-3 w-3" /> Add Disposition</Button>
          </div>
          {(editing.dispositions || []).map((d, i) => (
            <div key={i} className="flex gap-2 items-start">
              <Input value={d.name} onChange={(e) => updateDisposition(i, "name", e.target.value)} placeholder="Disposition name" className="flex-1" />
              <Input value={d.type} onChange={(e) => updateDisposition(i, "type", e.target.value)} placeholder="Type (final/redial)" className="w-32" />
              <Input value={d.email_routing} onChange={(e) => updateDisposition(i, "email_routing", e.target.value)} placeholder="Email routing" className="flex-1" />
              <Button variant="ghost" size="icon" onClick={() => removeDisposition(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
          {(editing.dispositions || []).length === 0 && <p className="text-muted-foreground text-center py-8">No dispositions added yet.</p>}
        </TabsContent>

        {/* IVR Flow */}
        <TabsContent value="ivr">
          <Card>
            <CardHeader><CardTitle>IVR Flow</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div><Label>Greeting</Label><Textarea value={(editing.ivr_flow as any)?.greeting || ""} onChange={(e) => setEditing({ ...editing, ivr_flow: { ...(editing.ivr_flow as any), greeting: e.target.value } })} placeholder="Initial greeting text / prompt" rows={4} /></div>
              <div><Label>After Hours</Label><Textarea value={(editing.ivr_flow as any)?.after_hours || ""} onChange={(e) => setEditing({ ...editing, ivr_flow: { ...(editing.ivr_flow as any), after_hours: e.target.value } })} placeholder="After-hours handling" rows={3} /></div>
              <Separator />
              <div><Label>Menu Structure (free text)</Label><Textarea value={JSON.stringify((editing.ivr_flow as any)?.menu_options || [], null, 2)} onChange={(e) => { try { setEditing({ ...editing, ivr_flow: { ...(editing.ivr_flow as any), menu_options: JSON.parse(e.target.value) } }); } catch {} }} placeholder='[{"key":"1","label":"Intake","department":"Intake"}]' rows={6} className="font-mono text-xs" /></div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Phone Numbers */}
        <TabsContent value="phones" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-foreground">Phone Numbers</h2>
            <Button onClick={addPhoneNumber} size="sm"><Plus className="mr-1 h-3 w-3" /> Add Number</Button>
          </div>
          {(editing.phone_numbers || []).map((pn, i) => (
            <div key={i} className="flex gap-2 items-center">
              <Input value={pn.type} onChange={(e) => updatePhoneNumber(i, "type", e.target.value)} placeholder="ANI/DNIS" className="w-24" />
              <Input value={pn.number} onChange={(e) => updatePhoneNumber(i, "number", e.target.value)} placeholder="Phone number" className="flex-1" />
              <Input value={pn.label} onChange={(e) => updatePhoneNumber(i, "label", e.target.value)} placeholder="Label" className="flex-1" />
              <Button variant="ghost" size="icon" onClick={() => removePhoneNumber(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
          {(editing.phone_numbers || []).length === 0 && <p className="text-muted-foreground text-center py-8">No phone numbers added yet.</p>}
        </TabsContent>

        {/* Connectors */}
        <TabsContent value="connectors" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-foreground">Connectors</h2>
            <Button onClick={addConnector} size="sm"><Plus className="mr-1 h-3 w-3" /> Add Connector</Button>
          </div>
          {(editing.connectors || []).map((c, i) => (
            <Card key={i}>
              <CardContent className="pt-4 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div><Label>Name</Label><Input value={c.name} onChange={(e) => updateConnector(i, "name", e.target.value)} placeholder="Connector name" /></div>
                  <div><Label>Type</Label><Input value={c.type} onChange={(e) => updateConnector(i, "type", e.target.value)} placeholder="web/api/webhook" /></div>
                </div>
                <div><Label>URL</Label><Input value={c.url} onChange={(e) => updateConnector(i, "url", e.target.value)} placeholder="https://…" /></div>
                <div className="flex items-end gap-2">
                  <div className="flex-1"><Label>Notes</Label><Input value={c.notes} onChange={(e) => updateConnector(i, "notes", e.target.value)} placeholder="Additional info" /></div>
                  <Button variant="ghost" size="icon" onClick={() => removeConnector(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {(editing.connectors || []).length === 0 && <p className="text-muted-foreground text-center py-8">No connectors added yet.</p>}
        </TabsContent>

        {/* Documents */}
        <TabsContent value="documents" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-foreground">Uploaded Documents</h2>
          </div>
          <BlueprintFileUpload
            onTextExtracted={() => {}}
            onFileUploaded={addDocument}
            label="Upload any reference document"
          />
          {(editing.documents || []).length > 0 ? (
            <div className="space-y-2">
              {(editing.documents || []).map((doc, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">{new Date(doc.uploaded_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => downloadDocument(doc.path, doc.name)}>
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => removeDocument(i)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No documents uploaded yet.</p>
          )}
        </TabsContent>

        {/* Notes */}
        <TabsContent value="notes">
          <Card>
            <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <BlueprintFileUpload
                onTextExtracted={(text) => setEditing({ ...editing, notes: (editing.notes || "") + "\n\n" + text })}
                onFileUploaded={addDocument}
                label="Upload notes document"
              />
              <Textarea value={editing.notes || ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} placeholder="Free-form notes about this campaign setup…" rows={10} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
