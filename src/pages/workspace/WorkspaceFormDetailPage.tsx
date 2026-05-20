import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Pencil, Eye, Link2, X, Inbox } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useWorkspaceForm, useFormSchema } from "@/hooks/useWorkspaceForms";
import { useWorkspaceCampaigns } from "@/hooks/useWorkspaceCampaigns";
import { useFormCampaignAssignments } from "@/hooks/useFormCampaignAssignments";
import { useFormSubmissions } from "@/hooks/useFormSubmissions";

/**
 * Read-only form summary. The canonical authoring surface lives at
 * /w/:workspaceId/forms/:formId/edit (WorkspaceFormBuilderPage). This page
 * shows metadata + a quick schema overview and routes to the builder.
 */
export default function WorkspaceFormDetailPage() {
  const { workspaceId, formId } = useParams<{ workspaceId: string; formId: string }>();
  const { data: form, isLoading } = useWorkspaceForm(formId);
  const { data: schema } = useFormSchema(formId);

  const editHref = `/w/${workspaceId}/forms/${formId}/edit`;
  const sectionCount = schema?.sections.length ?? 0;
  const fieldCount = schema?.sections.reduce((n, s) => n + s.fields.length, 0) ?? 0;
  const ruleCount = schema?.logic.length ?? 0;

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
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">Form not found.</CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight">{form.name}</h1>
              {form.description && (
                <p className="text-sm text-muted-foreground max-w-2xl">{form.description}</p>
              )}
              <div className="flex items-center gap-2">
                <StatusBadge status={form.status} />
                <Badge variant="outline" className="text-xs">v{form.current_version ?? 1}</Badge>
                <span className="text-xs text-muted-foreground">
                  Updated {new Date(form.updated_at).toLocaleString()}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Button asChild size="sm">
                <Link to={editHref} data-testid="form-edit-cta">
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Edit form
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <SummaryStat label="Sections" value={sectionCount} />
            <SummaryStat label="Fields" value={fieldCount} />
            <SummaryStat label="Logic rules" value={ruleCount} />
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Eye className="h-3.5 w-3.5" /> Sections
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sectionCount === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No sections yet.{" "}
                  <Link to={editHref} className="text-primary underline">
                    Open the builder
                  </Link>{" "}
                  to add one.
                </p>
              ) : (
                <ul className="divide-y divide-border/60">
                  {schema!.sections.map((s, idx) => (
                    <li key={s.id} className="py-2 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {idx + 1}. {s.title || "Untitled section"}
                        </p>
                        {s.description && (
                          <p className="text-xs text-muted-foreground truncate">{s.description}</p>
                        )}
                      </div>
                      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        {s.fields.length} field{s.fields.length === 1 ? "" : "s"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <AssignmentsPanel workspaceId={workspaceId!} formId={formId!} />
          <RecentSubmissionsPanel workspaceId={workspaceId!} formId={formId!} />
        </>
      )}
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

function AssignmentsPanel({ workspaceId, formId }: { workspaceId: string; formId: string }) {
  const { data: campaigns = [] } = useWorkspaceCampaigns();
  const { data: assignments = [], attachCampaign, detachCampaign, isMutating } =
    useFormCampaignAssignments(formId);
  const attachedIds = new Set(assignments.map((a) => a.campaign_id));
  const unattached = campaigns.filter((c) => !attachedIds.has(c.id));
  const attached = campaigns.filter((c) => attachedIds.has(c.id));

  return (
    <Card data-testid="assignments-panel">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Link2 className="h-3.5 w-3.5" /> Campaign assignments
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Attach this form to campaigns. A campaign can have at most one active intake form;
          attaching this form replaces any prior assignment on that campaign.
        </p>
        <div className="flex items-center gap-2">
          <Select
            value=""
            onValueChange={(v) => v && attachCampaign(v)}
            disabled={isMutating || unattached.length === 0}
          >
            <SelectTrigger className="max-w-sm" data-testid="attach-campaign-trigger">
              <SelectValue
                placeholder={
                  unattached.length === 0 ? "All campaigns attached" : "Attach a campaign…"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {unattached.map((c) => (
                <SelectItem key={c.id} value={c.id} data-testid={`attach-option-${c.id}`}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {attached.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No campaigns attached yet.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {attached.map((c) => (
              <li
                key={c.id}
                className="py-2 flex items-center justify-between gap-3"
                data-testid={`attached-${c.id}`}
              >
                <div className="min-w-0">
                  <Link
                    to={`/w/${workspaceId}/campaigns/${c.id}`}
                    className="text-sm font-medium hover:text-primary truncate"
                  >
                    {c.name}
                  </Link>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {c.status}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => detachCampaign(c.id)}
                  disabled={isMutating}
                  className="text-destructive/70 hover:text-destructive"
                  data-testid={`detach-${c.id}`}
                >
                  <X className="h-3.5 w-3.5 mr-1" /> Detach
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function RecentSubmissionsPanel({ workspaceId, formId }: { workspaceId: string; formId: string }) {
  const { data: campaigns = [] } = useWorkspaceCampaigns();
  const { data: submissions = [], isLoading } = useFormSubmissions(formId, { limit: 25 });
  const campaignById = new Map(campaigns.map((c) => [c.id, c.name]));

  return (
    <Card data-testid="recent-submissions-panel">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Inbox className="h-3.5 w-3.5" /> Recent submissions
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : submissions.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">No submissions yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr className="border-b border-border/60">
                  <th className="py-2 pr-3 text-left font-medium">Submitted</th>
                  <th className="py-2 pr-3 text-left font-medium">Source</th>
                  <th className="py-2 pr-3 text-left font-medium">Campaign</th>
                  <th className="py-2 pr-3 text-left font-medium">Outcome</th>
                  <th className="py-2 pr-3 text-left font-medium">Disposition</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-border/30 last:border-0"
                    data-testid={`submission-row-${s.id}`}
                  >
                    <td className="py-2 pr-3 tabular-nums">
                      {new Date(s.submitted_at).toLocaleString()}
                    </td>
                    <td className="py-2 pr-3">
                      <Badge variant="outline" className="text-[10px]">{s.source}</Badge>
                    </td>
                    <td className="py-2 pr-3">
                      {s.campaign_id ? (
                        <Link
                          to={`/w/${workspaceId}/campaigns/${s.campaign_id}`}
                          className="hover:text-primary"
                        >
                          {campaignById.get(s.campaign_id) ?? s.campaign_id.slice(0, 8)}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-2 pr-3 font-mono">{s.outcome_key ?? "—"}</td>
                    <td className="py-2 pr-3 font-mono">{s.disposition_key ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
