/**
 * ASC step stubs (Slice 1).
 *
 * Each step renders a minimal, functional surface so the wizard can be
 * walked end-to-end and resumed. Where structured input doesn't need AI
 * (business description, primary outcome, caller-reason labels, destination
 * fields, slug), it's wired through the reducer. AI-driven content is
 * marked with explicit "lands in a later slice" notices so nobody confuses
 * a placeholder for a finished surface.
 */
import { useState } from "react";
import type { Dispatch } from "react";
import { Sparkles, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AscDraft } from "@/lib/asc/types";
import type { AscAction } from "@/lib/asc/actions";
import { ProvenanceBadge } from "@/components/asc/ProvenanceBadge";

export interface AscStepProps {
  draft: AscDraft;
  dispatch: Dispatch<AscAction>;
}

function StepHeader({
  number,
  title,
  blurb,
}: {
  number: number;
  title: string;
  blurb: string;
}) {
  return (
    <header className="mb-6">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">
        Step {number}
      </div>
      <h2 className="mt-1 text-xl font-semibold">{title}</h2>
      <p className="mt-1 max-w-prose text-sm text-muted-foreground">{blurb}</p>
    </header>
  );
}

function ComingInLaterSlice({ what }: { what: string }) {
  return (
    <Card className="border-dashed bg-muted/30 p-4 text-xs text-muted-foreground">
      <div className="flex items-start gap-2">
        <Sparkles className="mt-0.5 h-3.5 w-3.5 text-primary" />
        <span>{what} lands when the assistant orchestration ships.</span>
      </div>
    </Card>
  );
}

// ── Step 1 ─────────────────────────────────────────────────────────────────
export function AscStepBusiness({ draft, dispatch }: AscStepProps) {
  return (
    <div data-testid="asc-step-1">
      <StepHeader
        number={1}
        title="Business context"
        blurb="Describe the business so the assistant can ground its suggestions in real facts. Free-text answers below; conversational follow-ups arrive with the assistant in a later slice."
      />
      <div className="space-y-4">
        <div>
          <Label htmlFor="asc-description">Business description</Label>
          <Textarea
            id="asc-description"
            data-testid="asc-business-description"
            className="mt-1"
            rows={5}
            placeholder="e.g. We're a 24/7 answering service for small dental practices…"
            value={draft.input.business.description}
            onChange={(e) =>
              dispatch({
                type: "UPDATE_BUSINESS",
                patch: { description: e.target.value },
              })
            }
          />
        </div>
        <div>
          <Label htmlFor="asc-industry">Industry preset</Label>
          <Input
            id="asc-industry"
            className="mt-1"
            placeholder="legal, medical, general…"
            value={draft.input.business.industryPresetId}
            onChange={(e) =>
              dispatch({
                type: "UPDATE_BUSINESS",
                patch: { industryPresetId: e.target.value },
              })
            }
          />
        </div>
        <ComingInLaterSlice what="Adaptive interviewer follow-ups" />
      </div>
    </div>
  );
}

// ── Step 2 ─────────────────────────────────────────────────────────────────
export function AscStepPurpose({ draft, dispatch }: AscStepProps) {
  return (
    <div data-testid="asc-step-2">
      <StepHeader
        number={2}
        title="Campaign purpose"
        blurb="What does success look like for one call? Capture the primary outcome you're optimizing for."
      />
      <div className="space-y-4">
        <div>
          <Label htmlFor="asc-primary-outcome">Primary outcome</Label>
          <Input
            id="asc-primary-outcome"
            data-testid="asc-primary-outcome"
            className="mt-1"
            value={draft.input.purpose.primaryOutcome}
            onChange={(e) =>
              dispatch({
                type: "UPDATE_PURPOSE",
                patch: { primaryOutcome: e.target.value },
              })
            }
            placeholder="e.g. Book an intake consultation"
          />
        </div>
        <ComingInLaterSlice what="Suggested outcomes from skin starter pack" />
      </div>
    </div>
  );
}

// ── Step 3 ─────────────────────────────────────────────────────────────────
export function AscStepCallerTypes({ draft, dispatch }: AscStepProps) {
  const [label, setLabel] = useState("");
  const reasons = draft.input.callerReasons;
  return (
    <div data-testid="asc-step-3">
      <StepHeader
        number={3}
        title="Caller types"
        blurb="List the kinds of callers this campaign needs to handle. Per-reason handling lives in the next step."
      />
      <div className="flex gap-2">
        <Input
          data-testid="asc-caller-reason-input"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. New client intake"
        />
        <Button
          data-testid="asc-caller-reason-add"
          onClick={() => {
            const trimmed = label.trim();
            if (!trimmed) return;
            dispatch({
              type: "ADD_CALLER_REASON",
              reason: {
                id: `cr-${Date.now().toString(36)}`,
                label: trimmed,
                requiredCapture: [],
              },
            });
            setLabel("");
          }}
        >
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>
      <ul className="mt-4 space-y-2">
        {reasons.map((r) => (
          <li
            key={r.id}
            className="flex items-center justify-between rounded-md border bg-card px-3 py-2"
            data-testid={`asc-caller-reason-${r.id}`}
          >
            <span className="flex items-center gap-2 text-sm">
              <ProvenanceBadge provenance="user_stated" showLabel={false} />
              {r.label}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                dispatch({ type: "REMOVE_CALLER_REASON", id: r.id })
              }
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>
      <div className="mt-4">
        <ComingInLaterSlice what="Gap-finder suggestions and inferred caller types" />
      </div>
    </div>
  );
}

// ── Step 4 ─────────────────────────────────────────────────────────────────
export function AscStepHandling({ draft }: AscStepProps) {
  return (
    <div data-testid="asc-step-4">
      <StepHeader
        number={4}
        title="Per-reason handling"
        blurb="Adaptive Q&A and a live branch sketch will let you flesh out handling for each caller type. Slice 1 just lists the reasons you've defined."
      />
      <ul className="mb-4 space-y-2">
        {draft.input.callerReasons.length === 0 ? (
          <li className="text-sm text-muted-foreground">
            No caller types yet. Add some in Step 3.
          </li>
        ) : (
          draft.input.callerReasons.map((r) => (
            <li
              key={r.id}
              className="rounded-md border bg-card px-3 py-2 text-sm"
            >
              {r.label}
            </li>
          ))
        )}
      </ul>
      <ComingInLaterSlice what="Adaptive handling Q&A and per-reason branch sketches" />
    </div>
  );
}

// ── Step 5 ─────────────────────────────────────────────────────────────────
export function AscStepOutcomes(_: AscStepProps) {
  return (
    <div data-testid="asc-step-5">
      <StepHeader
        number={5}
        title="Outcomes & dispositions"
        blurb="Pair AI-proposed dispositions with the workspace catalog. Lands with the orchestration."
      />
      <ComingInLaterSlice what="Disposition proposals and catalog reuse editor" />
    </div>
  );
}

// ── Step 6 ─────────────────────────────────────────────────────────────────
export function AscStepNotifications(_: AscStepProps) {
  return (
    <div data-testid="asc-step-6">
      <StepHeader
        number={6}
        title="Notifications"
        blurb="Per-disposition notification rules. Recipients are constrained to existing workspace integrations."
      />
      <ComingInLaterSlice what="Notification rule editor wired to workspace integrations" />
    </div>
  );
}

// ── Step 7 ─────────────────────────────────────────────────────────────────
export function AscStepDestination({ draft, dispatch }: AscStepProps) {
  const dest = draft.input.destination;
  const launch = draft.input.launch;
  return (
    <div data-testid="asc-step-7">
      <StepHeader
        number={7}
        title="Destination & launch URL"
        blurb="Two distinct things: where agents work (operational destination) and the public launch URL."
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <h3 className="text-sm font-semibold">Where do agents work?</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Operational destination — what the agent opens during a call.
          </p>
          <div className="mt-3 space-y-2">
            <Label htmlFor="asc-dest-kind" className="text-xs">
              Kind
            </Label>
            <select
              id="asc-dest-kind"
              data-testid="asc-destination-kind"
              className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              value={dest?.kind ?? "internal_runner"}
              onChange={(e) =>
                dispatch({
                  type: "SET_DESTINATION",
                  destination: {
                    ...(dest ?? { kind: "internal_runner" }),
                    kind: e.target
                      .value as NonNullable<typeof dest>["kind"],
                  },
                })
              }
            >
              <option value="internal_runner">Internal runner</option>
              <option value="external_url">External URL</option>
              <option value="deep_link">Deep link template</option>
            </select>
          </div>
        </Card>
        <Card className="p-4">
          <h3 className="text-sm font-semibold">What's the public link?</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Launch slug — separate from destination.
          </p>
          <div className="mt-3 space-y-2">
            <Label htmlFor="asc-launch-slug" className="text-xs">
              Slug
            </Label>
            <Input
              id="asc-launch-slug"
              data-testid="asc-launch-slug"
              value={launch?.slug ?? ""}
              onChange={(e) =>
                dispatch({
                  type: "SET_LAUNCH",
                  launch: {
                    ...(launch ?? {}),
                    slug: e.target.value,
                    editableUntilPublish: true,
                  },
                })
              }
              placeholder="my-campaign"
            />
            <p className="text-xs text-muted-foreground">
              Preview: fabric59.com/c/<span className="font-mono">{launch?.slug || "<slug>"}</span>
            </p>
          </div>
        </Card>
      </div>
      <div className="mt-4">
        <ComingInLaterSlice what="Deterministic slug collision check and AI alternatives" />
      </div>
    </div>
  );
}

// ── Step 8 ─────────────────────────────────────────────────────────────────
export function AscStepGenerate(_: AscStepProps) {
  return (
    <div data-testid="asc-step-8">
      <StepHeader
        number={8}
        title="Generate draft"
        blurb="One-click generation runs Logic architect → Script writer → Explainer. Wired in Slice 2."
      />
      <Button disabled data-testid="asc-generate-button">
        Generate draft (Slice 2)
      </Button>
      <div className="mt-4">
        <ComingInLaterSlice what="Orchestration progress and fail-closed handoff" />
      </div>
    </div>
  );
}

// ── Step 9 ─────────────────────────────────────────────────────────────────
export function AscStepReview(_: AscStepProps) {
  return (
    <div data-testid="asc-step-9">
      <StepHeader
        number={9}
        title="Review & agent preview"
        blurb="Tabbed canvas: Flow, Copy, Outcomes, Notifications, Destination, Agent preview. Lands later."
      />
      <ComingInLaterSlice what="Review canvas with provenance overlay and the runner-parity preview" />
    </div>
  );
}

// ── Step 10 ────────────────────────────────────────────────────────────────
export function AscStepReadiness(_: AscStepProps) {
  return (
    <div data-testid="asc-step-10">
      <StepHeader
        number={10}
        title="Readiness & handoff"
        blurb="ASC validates readiness and forks into the canonical campaign builder. Publish still runs through the existing canonical publish flow after handoff."
      />
      <Card className="space-y-2 border-dashed p-4 text-sm">
        <p className="font-medium">v1 scope reminder</p>
        <p className="text-muted-foreground">
          ASC does not publish. Once your draft is ready, the canonical
          campaign builder is where you review and publish. This step ships
          its handoff action in a later slice.
        </p>
      </Card>
      <div className="mt-4">
        <ComingInLaterSlice what="Blocker/warning list and the fork-to-canonical action" />
      </div>
    </div>
  );
}
