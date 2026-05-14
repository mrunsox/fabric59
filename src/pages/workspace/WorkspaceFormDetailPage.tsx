import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Send, Plus, Trash2 } from "lucide-react";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useWorkspaceForm } from "@/hooks/useWorkspaceForms";
import {
  useFormVersions,
  useSaveFormSchema,
  useFormSubmissions,
  useCreateSubmission,
  useFormCampaignAssignments,
  useAssignFormToCampaign,
  useUnassignFormFromCampaign,
} from "@/hooks/useFormBuilder";
import { useWorkspaceCampaigns } from "@/hooks/useWorkspaceCampaigns";
import { FormBuilderEditor } from "@/components/forms/FormBuilderEditor";
import { FormPreview } from "@/components/forms/FormPreview";
import { FormVersionHistory } from "@/components/forms/FormVersionHistory";
import { emptySchema, type FormSchema } from "@/types/form-builder";

export default function WorkspaceFormDetailPage() {
  const { workspaceId, formId } = useParams<{ workspaceId: string; formId: string }>();
  const { data: form, isLoading } = useWorkspaceForm(formId);
  const { data: versions = [] } = useFormVersions(formId);
  const { data: submissions = [] } = useFormSubmissions(formId);
  const { data: campaigns = [] } = useWorkspaceCampaigns();
  const { data: assignments = [] } = useFormCampaignAssignments(formId);
  const save = useSaveFormSchema();
  const submit = useCreateSubmission();
  const assign = useAssignFormToCampaign();
  const unassign = useUnassignFormFromCampaign();

  const [schema, setSchema] = useState<FormSchema>(emptySchema);
  const [dirty, setDirty] = useState(false);
  const [campaignToAssign, setCampaignToAssign] = useState<string>("");

  useEffect(() => {
    if (form?.schema) {
      const incoming = (form.schema as unknown as FormSchema) ?? emptySchema;
      setSchema(incoming.fields ? incoming : emptySchema);
      setDirty(false);
    }
  }, [form?.id]);

  const updateSchema = (next: FormSchema) => {
    setSchema(next);
    setDirty(true);
  };

  const handleSaveDraft = () => formId && save.mutate({ formId, schema }, { onSuccess: () => setDirty(false) });
  const handlePublish = () =>
    formId && save.mutate({ formId, schema, publish: true }, { onSuccess: () => setDirty(false) });

  const assignedCampaignIds = useMemo(() => new Set(assignments.map((a) => a.campaign_id)), [assignments]);
  const availableCampaigns = useMemo(
    () => campaigns.filter((c) => !assignedCampaignIds.has(c.id)),
    [campaigns, assignedCampaignIds]
  );
  const campaignsById = useMemo(() => Object.fromEntries(campaigns.map((c) => [c.id, c])), [campaigns]);

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm">
        <Link to={`/w/${workspaceId}/forms`}>
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to forms
        </Link>
      </Button>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : !form ? (
        <Card><CardContent className="pt-6 text-sm text-muted-foreground">Form not found.</CardContent></Card>
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold">{form.name}</h1>
              {form.description && <p className="text-sm text-muted-foreground mt-1">{form.description}</p>}
              <div className="flex items-center gap-2 mt-2">
                <StatusBadge status={form.status} />
                <Badge variant="outline" className="text-xs">v{form.current_version ?? 1}</Badge>
                {dirty && <Badge variant="outline" className="text-xs border-accent/40 text-accent">Unsaved</Badge>}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleSaveDraft} disabled={save.isPending || !dirty}>
                <Save className="h-3.5 w-3.5 mr-1" /> Save draft
              </Button>
              <Button size="sm" onClick={handlePublish} disabled={save.isPending}>
                <Send className="h-3.5 w-3.5 mr-1" /> Publish version
              </Button>
            </div>
          </div>

          <Tabs defaultValue="builder">
            <TabsList>
              <TabsTrigger value="builder">Builder</TabsTrigger>
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
              <TabsTrigger value="submissions">Submissions ({submissions.length})</TabsTrigger>
              <TabsTrigger value="versions">Versions ({versions.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="builder" className="mt-4">
              <FormBuilderEditor schema={schema} onChange={updateSchema} />
            </TabsContent>

            <TabsContent value="preview" className="mt-4">
              <FormPreview
                schema={schema}
                submitting={submit.isPending}
                onSubmit={({ values, mapped }) =>
                  formId &&
                  submit.mutate({
                    formId,
                    version: form.current_version ?? 1,
                    payload: values,
                    mapped,
                    source: "preview",
                  })
                }
              />
            </TabsContent>

            <TabsContent value="campaigns" className="mt-4 space-y-3">
              <Card>
                <CardHeader><CardTitle className="text-base">Assign to a campaign</CardTitle></CardHeader>
                <CardContent className="flex items-center gap-2">
                  <Select value={campaignToAssign} onValueChange={setCampaignToAssign}>
                    <SelectTrigger className="max-w-sm">
                      <SelectValue placeholder={availableCampaigns.length ? "Pick a campaign…" : "No unassigned campaigns"} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCampaigns.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="sm"
                    onClick={() => {
                      if (!formId || !campaignToAssign) return;
                      assign.mutate(
                        { formId, campaignId: campaignToAssign },
                        { onSuccess: () => setCampaignToAssign("") }
                      );
                    }}
                    disabled={!campaignToAssign || assign.isPending}
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" /> Assign
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">Assigned campaigns</CardTitle></CardHeader>
                <CardContent>
                  {assignments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No campaigns assigned yet.</p>
                  ) : (
                    <ul className="space-y-2">
                      {assignments.map((a) => {
                        const c = campaignsById[a.campaign_id];
                        return (
                          <li key={a.id} className="flex items-center justify-between gap-2 border rounded px-3 py-2">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium">{c?.name ?? a.campaign_id}</span>
                              {c && <StatusBadge status={c.status} />}
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => formId && unassign.mutate({ assignmentId: a.id, formId })}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="submissions" className="mt-4">
              <Card>
                <CardHeader><CardTitle className="text-base">Recent submissions</CardTitle></CardHeader>
                <CardContent>
                  {submissions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No submissions yet. Use Preview to capture a test entry.</p>
                  ) : (
                    <ul className="space-y-2">
                      {submissions.map((s) => (
                        <li key={s.id} className="border rounded px-3 py-2">
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>v{s.form_version} · {s.source}</span>
                            <span>{new Date(s.submitted_at).toLocaleString()}</span>
                          </div>
                          <pre className="bg-muted/40 rounded p-2 text-xs overflow-x-auto mt-2">
{JSON.stringify(s.payload, null, 2)}
                          </pre>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="versions" className="mt-4">
              {formId && (
                <FormVersionHistory
                  formId={formId}
                  versions={versions}
                  onLoadIntoBuilder={(s) => {
                    setSchema(s);
                    setDirty(true);
                  }}
                />
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
