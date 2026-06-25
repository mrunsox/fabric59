/**
 * Phase 11 — Workspace Guide AI Assembler.
 *
 * Right-side sheet that accepts source text describing a client business
 * and asks the `assemble-workspace-program` edge function to return a
 * structured draft: guide sections, dispositions, call flow, ANI/DNIS,
 * variables, post-call automations.
 *
 * This first cut applies ONLY the guide sections back to the active
 * Workspace Guide draft on accept. Dispositions / callFlow / routing
 * are surfaced read-only in the review panel so the user can verify
 * the AI understood the source before we wire the apply paths in
 * follow-up turns.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Wand2 } from "lucide-react";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { newId } from "@/lib/workspace-guide/schema";
import {
  type WorkspaceGuideContentV2,
  type WorkspaceGuideSection,
  type WorkspaceGuideSectionKind,
  type WorkspaceGuideVisibility,
} from "@/types/workspace-guide";

export interface AssembledProgramDraft {
  guideSections?: Array<{
    kind?: string;
    label?: string;
    description?: string;
    visibility?: string;
    required?: boolean;
    fields?: Array<{ label?: string; value?: string }>;
  }>;
  dispositions?: Array<{
    code?: string;
    label?: string;
    urgency?: string;
    postCallAction?: string;
    notes?: string;
  }>;
  callFlow?: {
    nodes?: Array<{ id?: string; kind?: string; title?: string; body?: string }>;
    edges?: Array<{ fromId?: string; toId?: string; label?: string }>;
  };
  routing?: {
    ani?: Array<{ pattern?: string; action?: string; note?: string }>;
    dnis?: Array<{ number?: string; label?: string; routeTo?: string }>;
  };
  variables?: Array<{ key?: string; label?: string; type?: string; required?: boolean }>;
  postCallSuggestions?: Array<{
    dispositionCode?: string;
    channel?: string;
    template?: string;
    recipientHint?: string;
  }>;
}

const VALID_KINDS = new Set<WorkspaceGuideSectionKind>([
  "greeting", "business_overview", "service_descriptions", "specialties",
  "hours", "callback_policy", "escalation_contacts", "special_handling",
  "faqs", "exceptions", "internal_notes", "custom",
]);

function toSections(
  raw: AssembledProgramDraft["guideSections"],
): WorkspaceGuideSection[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((s) => {
    const kind = (VALID_KINDS.has(s.kind as WorkspaceGuideSectionKind)
      ? s.kind
      : "custom") as WorkspaceGuideSectionKind;
    const visibility: WorkspaceGuideVisibility =
      s.visibility === "internal" ? "internal" : "agent";
    const fields = Array.isArray(s.fields) && s.fields.length > 0
      ? s.fields.map((f) => ({
          id: newId("fld"),
          label: String(f.label ?? "Body"),
          value: String(f.value ?? ""),
        }))
      : [{ id: newId("fld"), label: "Body", value: "" }];
    return {
      id: newId("sec"),
      kind,
      label: String(s.label ?? "Section"),
      description: s.description ? String(s.description) : undefined,
      visibility,
      required: Boolean(s.required),
      enabled: true,
      fields,
    };
  });
}

interface Props {
  workspaceId: string;
  currentContent: WorkspaceGuideContentV2;
  onApplyGuideSections: (next: WorkspaceGuideContentV2) => void;
}

type Mode = "replace" | "append";

export function WorkspaceGuideAssembler({
  workspaceId,
  currentContent,
  onApplyGuideSections,
}: Props) {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState("");
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<AssembledProgramDraft | null>(null);
  const [mode, setMode] = useState<Mode>("replace");

  const reset = () => {
    setSource("");
    setDraft(null);
    setMode("replace");
  };

  const onAssemble = async () => {
    const text = source.trim();
    if (text.length < 20) {
      toast.error("Add some source material first (at least a paragraph).");
      return;
    }
    setBusy(true);
    setDraft(null);
    try {
      const { data, error } = await supabase.functions.invoke(
        "assemble-workspace-program",
        { body: { workspaceId, sourceText: text } },
      );
      if (error) throw error;
      const next = (data as { draft?: AssembledProgramDraft })?.draft ?? null;
      if (!next) {
        toast.error("AI returned an empty draft. Try refining the source text.");
        return;
      }
      setDraft(next);
      toast.success("Draft ready — review below before applying.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Assembly failed.";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const onApply = () => {
    if (!draft) return;
    const newSections = toSections(draft.guideSections);
    if (newSections.length === 0) {
      toast.error("Draft has no guide sections to apply.");
      return;
    }
    const next: WorkspaceGuideContentV2 =
      mode === "replace"
        ? { schemaVersion: 2, sections: newSections }
        : { schemaVersion: 2, sections: [...currentContent.sections, ...newSections] };
    onApplyGuideSections(next);
    toast.success(
      `Applied ${newSections.length} section${newSections.length === 1 ? "" : "s"} to the draft. Save draft to keep them.`,
    );
    setOpen(false);
    reset();
  };

  const counts = draft
    ? {
        sections: draft.guideSections?.length ?? 0,
        dispositions: draft.dispositions?.length ?? 0,
        flowNodes: draft.callFlow?.nodes?.length ?? 0,
        ani: draft.routing?.ani?.length ?? 0,
        dnis: draft.routing?.dnis?.length ?? 0,
        variables: draft.variables?.length ?? 0,
        postCall: draft.postCallSuggestions?.length ?? 0,
      }
    : null;

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <SheetTrigger asChild>
        <Button
          variant="default"
          size="sm"
          className="gap-1.5"
          data-testid="assemble-from-document"
        >
          <Sparkles className="h-4 w-4" /> Assemble with AI
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" /> Assemble program from source
          </SheetTitle>
          <SheetDescription>
            Paste an intake brief, runbook, or any document describing this client's call handling.
            The AI drafts guide sections, dispositions, call flow, and routing for you to review.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-3">
          <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Source text
          </label>
          <Textarea
            value={source}
            onChange={(e) => setSource(e.target.value)}
            rows={10}
            placeholder="Paste the client's intake brief here — business name, hours, who answers what, dispositions you want, routing rules, escalation contacts, sample greeting, etc."
            disabled={busy}
            data-testid="assemble-source"
          />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {source.length.toLocaleString()} chars · max 60,000
            </p>
            <Button
              size="sm"
              onClick={onAssemble}
              disabled={busy || source.trim().length < 20}
              data-testid="assemble-run"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Assembling…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-1.5" /> Assemble
                </>
              )}
            </Button>
          </div>
        </div>

        {draft && counts && (
          <div className="mt-6 space-y-4">
            <div>
              <h3 className="text-sm font-semibold">Draft summary</h3>
              <div className="flex flex-wrap gap-1.5 mt-2">
                <Badge variant="secondary">{counts.sections} guide sections</Badge>
                <Badge variant="secondary">{counts.dispositions} dispositions</Badge>
                <Badge variant="secondary">{counts.flowNodes} flow nodes</Badge>
                <Badge variant="secondary">{counts.variables} variables</Badge>
                <Badge variant="secondary">{counts.ani} ANI rules</Badge>
                <Badge variant="secondary">{counts.dnis} DNIS rules</Badge>
                <Badge variant="secondary">{counts.postCall} post-call</Badge>
              </div>
            </div>

            <DraftPreviewBlock title="Guide sections" empty={counts.sections === 0}>
              <ul className="text-sm space-y-1">
                {(draft.guideSections ?? []).map((s, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{s.kind ?? "custom"}</Badge>
                    <span className="truncate">{s.label ?? "Section"}</span>
                    <span className="text-xs text-muted-foreground">
                      {s.fields?.length ?? 0} fields
                    </span>
                  </li>
                ))}
              </ul>
            </DraftPreviewBlock>

            <DraftPreviewBlock title="Dispositions" empty={counts.dispositions === 0}>
              <ul className="text-sm space-y-1">
                {(draft.dispositions ?? []).map((d, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">{d.code ?? "?"}</Badge>
                    <span className="truncate">{d.label ?? "Disposition"}</span>
                    {d.postCallAction && d.postCallAction !== "none" && (
                      <span className="text-xs text-muted-foreground">→ {d.postCallAction}</span>
                    )}
                  </li>
                ))}
              </ul>
            </DraftPreviewBlock>

            <DraftPreviewBlock title="Call flow" empty={counts.flowNodes === 0}>
              <ol className="text-sm space-y-1 list-decimal list-inside">
                {(draft.callFlow?.nodes ?? []).map((n, i) => (
                  <li key={i}>
                    <span className="font-medium">{n.title ?? n.id ?? "Node"}</span>{" "}
                    <span className="text-xs text-muted-foreground">({n.kind ?? "?"})</span>
                  </li>
                ))}
              </ol>
            </DraftPreviewBlock>

            <DraftPreviewBlock title="Routing (ANI / DNIS)" empty={counts.ani + counts.dnis === 0}>
              <div className="text-sm space-y-1">
                {(draft.routing?.dnis ?? []).map((r, i) => (
                  <div key={`d${i}`} className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">DNIS</Badge>
                    <span>{r.number}</span> → <span className="text-muted-foreground">{r.routeTo}</span>
                  </div>
                ))}
                {(draft.routing?.ani ?? []).map((r, i) => (
                  <div key={`a${i}`} className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px]">ANI</Badge>
                    <span>{r.pattern}</span> → <span className="text-muted-foreground">{r.action}</span>
                  </div>
                ))}
              </div>
            </DraftPreviewBlock>

            <div className="rounded-md border border-dashed border-border bg-muted/30 p-3 text-xs text-muted-foreground">
              This pass applies <strong>guide sections only</strong> to your Workspace Guide draft.
              Dispositions, call flow, and routing show above for review; their apply paths land in
              the next iteration.
            </div>

            <div className="flex items-center gap-3 pt-1">
              <label className="text-xs flex items-center gap-1.5">
                <input
                  type="radio"
                  name="assemble-mode"
                  checked={mode === "replace"}
                  onChange={() => setMode("replace")}
                />
                Replace current sections
              </label>
              <label className="text-xs flex items-center gap-1.5">
                <input
                  type="radio"
                  name="assemble-mode"
                  checked={mode === "append"}
                  onChange={() => setMode("append")}
                />
                Append to existing
              </label>
            </div>
          </div>
        )}

        <SheetFooter className="mt-6 gap-2">
          <SheetClose asChild>
            <Button variant="outline" size="sm">Cancel</Button>
          </SheetClose>
          <Button
            size="sm"
            onClick={onApply}
            disabled={!draft || (draft.guideSections?.length ?? 0) === 0}
            data-testid="assemble-apply"
          >
            Apply guide sections to draft
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function DraftPreviewBlock({
  title, empty, children,
}: {
  title: string;
  empty: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        {title}
      </h4>
      {empty ? (
        <p className="text-xs text-muted-foreground italic">Nothing suggested.</p>
      ) : (
        children
      )}
    </div>
  );
}
