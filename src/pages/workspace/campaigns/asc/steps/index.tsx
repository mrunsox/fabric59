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
import { Sparkles, Plus, Trash2, Search, Loader2, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useParams } from "react-router-dom";
import type { AscDraft, AscCallerReason } from "@/lib/asc/types";
import type { AscAction } from "@/lib/asc/actions";
import { ProvenanceBadge } from "@/components/asc/ProvenanceBadge";
import { AscAssistantPanel } from "@/components/asc/AscAssistantPanel";
import { AscLogicArchitectPanel } from "@/components/asc/AscLogicArchitectPanel";
import { AscGenerationPanel } from "@/components/asc/AscGenerationPanel";
import {
  AscReviewOverviewSection,
  AscReviewFlowOutlineSection,
  AscReviewOutcomesSection,
  AscReviewNotificationsSection,
  AscReviewDestinationSection,
  AscReviewTodosSection,
} from "@/components/asc/AscReviewSections";
import { AscReadinessPanel } from "@/components/asc/AscReadinessPanel";
import { selectGenerationIsStale } from "@/lib/asc/selectors";
import { useAscGapFinder } from "@/hooks/useAscGapFinder";


export interface AscStepProps {
  draft: AscDraft;
  dispatch: Dispatch<AscAction>;
  /** Optional navigation hook; Step 9 and Step 10 consume this. */
  onJumpToStep?: (step: number) => void;
  /** Slice 8 — Step 10 only. Invoked by the readiness CTA when it's safe
   *  to hand off into the canonical campaign builder. */
  onForkToCanonical?: () => void;
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

function useWorkspaceIdFromRoute(): string {
  const { workspaceId = "" } = useParams<{ workspaceId: string }>();
  return workspaceId;
}

// ── Step 1 ─────────────────────────────────────────────────────────────────
export function AscStepBusiness({ draft, dispatch }: AscStepProps) {
  const workspaceId = useWorkspaceIdFromRoute();
  return (
    <div data-testid="asc-step-1" className="space-y-5">
      <StepHeader
        number={1}
        title="Business context"
        blurb="Describe the business so the assistant can ground its suggestions in real facts. Type below or click Ask the assistant for a focused follow-up."
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
            data-testid="asc-business-industry"
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
      </div>
      <AscAssistantPanel
        draft={draft}
        step={1}
        dispatch={dispatch}
        workspaceId={workspaceId}
        hint="The assistant asks one focused follow-up at a time and can suggest values you confirm or dismiss. It never writes to your draft directly."
      />
    </div>
  );
}

// ── Step 2 ─────────────────────────────────────────────────────────────────
export function AscStepPurpose({ draft, dispatch }: AscStepProps) {
  const workspaceId = useWorkspaceIdFromRoute();
  return (
    <div data-testid="asc-step-2" className="space-y-5">
      <StepHeader
        number={2}
        title="Campaign purpose"
        blurb="What does success look like for one call? Capture the primary outcome you're optimizing for. Other outcomes are optional in this step."
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
        <div>
          <Label htmlFor="asc-secondary-outcome">
            Secondary outcome <span className="text-xs text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="asc-secondary-outcome"
            data-testid="asc-secondary-outcome"
            className="mt-1"
            value={draft.input.purpose.secondaryOutcome ?? ""}
            onChange={(e) =>
              dispatch({
                type: "UPDATE_PURPOSE",
                patch: { secondaryOutcome: e.target.value },
              })
            }
            placeholder="e.g. Capture qualified lead details"
          />
        </div>
      </div>
      <AscAssistantPanel
        draft={draft}
        step={2}
        dispatch={dispatch}
        workspaceId={workspaceId}
        hint="The assistant will probe for secondary, blocking, and shared-across-clients outcomes. Only the primary outcome is required to continue."
      />
    </div>
  );
}


// ── Step 3 ─────────────────────────────────────────────────────────────────
export function AscStepCallerTypes({ draft, dispatch }: AscStepProps) {
  const workspaceId = useWorkspaceIdFromRoute();
  const [label, setLabel] = useState("");
  const reasons = draft.input.callerReasons;
  const gap = useAscGapFinder({ draft, step: 3, dispatch });
  return (
    <div data-testid="asc-step-3" className="space-y-5">
      <StepHeader
        number={3}
        title="Caller types"
        blurb="List the kinds of callers this campaign needs to handle. The assistant can propose generic caller types; you confirm each one. Per-reason handling lives in the next step."
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
      <ul className="space-y-2">
        {reasons.map((r) => (
          <li
            key={r.id}
            className="flex items-center justify-between rounded-md border bg-card px-3 py-2"
            data-testid={`asc-caller-reason-${r.id}`}
          >
            <span className="flex items-center gap-2 text-sm">
              <ProvenanceBadge provenance="user_stated" showLabel={false} />
              {r.label}
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                handling defined in Step 4
              </span>
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
      <AscAssistantPanel
        draft={draft}
        step={3}
        dispatch={dispatch}
        workspaceId={workspaceId}
        hint="The assistant can suggest caller types based on your business and campaign purpose. Each suggestion is confirmable; duplicates are blocked."
      />
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-testid="asc-gap-check-3"
          disabled={gap.status === "loading" || reasons.length === 0}
          onClick={() => void gap.runGapCheck()}
        >
          {gap.status === "loading" ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Checking…
            </>
          ) : (
            <>
              <Search className="h-3.5 w-3.5 mr-1" /> Check for gaps
            </>
          )}
        </Button>
        <span className="text-xs text-muted-foreground">
          Recommendations appear in the side panel.
        </span>
      </div>
    </div>
  );
}

// ── Step 4 ─────────────────────────────────────────────────────────────────
function ReasonHandlingCard({
  reason,
  dispatch,
}: {
  reason: AscCallerReason;
  dispatch: Dispatch<AscAction>;
}) {
  const [captureDraft, setCaptureDraft] = useState("");
  const [branchTrigger, setBranchTrigger] = useState("");
  const [branchOutcome, setBranchOutcome] = useState("");
  const patch = (p: Partial<AscCallerReason>) =>
    dispatch({ type: "UPDATE_CALLER_REASON", id: reason.id, patch: p });
  return (
    <Card
      data-testid={`asc-handling-card-${reason.id}`}
      className="space-y-3 p-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{reason.label}</h3>
        <ProvenanceBadge provenance="user_stated" showLabel={false} />
      </div>

      <div>
        <Label className="text-xs">Required info to capture</Label>
        <div className="mt-1 flex flex-wrap gap-1">
          {(reason.requiredCapture ?? []).map((item, i) => (
            <span
              key={`${item}-${i}`}
              className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-0.5 text-xs"
            >
              {item}
              <button
                type="button"
                aria-label={`Remove ${item}`}
                onClick={() =>
                  patch({
                    requiredCapture: (reason.requiredCapture ?? []).filter(
                      (_, idx) => idx !== i,
                    ),
                  })
                }
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <Input
            data-testid={`asc-capture-input-${reason.id}`}
            value={captureDraft}
            onChange={(e) => setCaptureDraft(e.target.value)}
            placeholder="e.g. Full name"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              const v = captureDraft.trim();
              if (!v) return;
              patch({
                requiredCapture: [...(reason.requiredCapture ?? []), v],
              });
              setCaptureDraft("");
            }}
          >
            Add
          </Button>
        </div>
      </div>

      <div>
        <Label className="text-xs" htmlFor={`asc-opener-${reason.id}`}>
          Agent opener
        </Label>
        <Textarea
          id={`asc-opener-${reason.id}`}
          data-testid={`asc-opener-${reason.id}`}
          rows={2}
          value={reason.opener ?? ""}
          onChange={(e) => patch({ opener: e.target.value })}
          placeholder="What the agent should say first."
        />
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <div>
          <Label className="text-xs">When to escalate</Label>
          <Input
            data-testid={`asc-esc-when-${reason.id}`}
            value={reason.escalation?.when ?? ""}
            onChange={(e) =>
              patch({
                escalation: {
                  when: e.target.value,
                  toRole: reason.escalation?.toRole ?? "",
                },
              })
            }
            placeholder="e.g. Caller is angry"
          />
        </div>
        <div>
          <Label className="text-xs">Escalate to (role)</Label>
          <Input
            data-testid={`asc-esc-role-${reason.id}`}
            value={reason.escalation?.toRole ?? ""}
            onChange={(e) =>
              patch({
                escalation: {
                  when: reason.escalation?.when ?? "",
                  toRole: e.target.value,
                },
              })
            }
            placeholder="e.g. Senior attorney"
          />
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <div>
          <Label className="text-xs">After-hours variant</Label>
          <Textarea
            rows={2}
            data-testid={`asc-after-hours-${reason.id}`}
            value={reason.variants?.afterHours ?? ""}
            onChange={(e) =>
              patch({
                variants: {
                  ...(reason.variants ?? {}),
                  afterHours: e.target.value,
                },
              })
            }
            placeholder="Optional. What to do when after hours."
          />
        </div>
        <div>
          <Label className="text-xs">Voicemail variant</Label>
          <Textarea
            rows={2}
            data-testid={`asc-voicemail-${reason.id}`}
            value={reason.variants?.voicemail ?? ""}
            onChange={(e) =>
              patch({
                variants: {
                  ...(reason.variants ?? {}),
                  voicemail: e.target.value,
                },
              })
            }
            placeholder="Optional. Voicemail handling."
          />
        </div>
      </div>

      <div>
        <Label className="text-xs">Simple branch hints</Label>
        <ul className="mt-1 space-y-1">
          {(reason.branching ?? []).map((b) => (
            <li
              key={b.id}
              data-testid={`asc-branch-${b.id}`}
              className="flex items-center justify-between rounded-md border bg-background px-2 py-1 text-xs"
            >
              <span>
                <span className="font-medium">{b.trigger}</span>
                <span className="mx-2 text-muted-foreground">→</span>
                <span>{b.outcome}</span>
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() =>
                  patch({
                    branching: (reason.branching ?? []).filter(
                      (h) => h.id !== b.id,
                    ),
                  })
                }
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </li>
          ))}
        </ul>
        <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_auto]">
          <Input
            data-testid={`asc-branch-trigger-${reason.id}`}
            value={branchTrigger}
            onChange={(e) => setBranchTrigger(e.target.value)}
            placeholder="Trigger (e.g. existing client)"
          />
          <Input
            data-testid={`asc-branch-outcome-${reason.id}`}
            value={branchOutcome}
            onChange={(e) => setBranchOutcome(e.target.value)}
            placeholder="Next action (e.g. transfer to attorney)"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              const t = branchTrigger.trim();
              const o = branchOutcome.trim();
              if (!t || !o) return;
              patch({
                branching: [
                  ...(reason.branching ?? []),
                  {
                    id: `bh-${Date.now().toString(36)}`,
                    trigger: t,
                    outcome: o,
                    origin: "user_stated",
                  },
                ],
              });
              setBranchTrigger("");
              setBranchOutcome("");
            }}
          >
            Add hint
          </Button>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Simple trigger → action only. Nested branches and flow graphs come
          later.
        </p>
      </div>
    </Card>
  );
}

export function AscStepHandling({ draft, dispatch }: AscStepProps) {
  const workspaceId = useWorkspaceIdFromRoute();
  const gap = useAscGapFinder({ draft, step: 4, dispatch });
  const reasons = draft.input.callerReasons;
  return (
    <div data-testid="asc-step-4" className="space-y-5">
      <StepHeader
        number={4}
        title="Per-reason handling"
        blurb="Define what the agent should capture and do for each caller type. The assistant asks one focused question at a time per reason and can suggest values you confirm."
      />
      {reasons.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No caller types yet. Add some in Step 3.
        </p>
      ) : (
        <div className="space-y-3">
          {reasons.map((r) => (
            <ReasonHandlingCard key={r.id} reason={r} dispatch={dispatch} />
          ))}
        </div>
      )}
      <AscAssistantPanel
        draft={draft}
        step={4}
        dispatch={dispatch}
        workspaceId={workspaceId}
        hint="Per-reason suggestions are tagged with the caller type they belong to."
      />
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-testid="asc-gap-check-4"
          disabled={gap.status === "loading" || reasons.length === 0}
          onClick={() => void gap.runGapCheck()}
        >
          {gap.status === "loading" ? (
            <>
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Checking…
            </>
          ) : (
            <>
              <Search className="h-3.5 w-3.5 mr-1" /> Check for gaps
            </>
          )}
        </Button>
        <span className="text-xs text-muted-foreground">
          Recommendations appear in the side panel.
        </span>
      </div>
    </div>
  );
}


// ── Step 5 ─────────────────────────────────────────────────────────────────
export function AscStepOutcomes({ draft, dispatch }: AscStepProps) {
  const [label, setLabel] = useState("");
  const outcomes = draft.input.outcomesDraftEdits ?? [];
  return (
    <div data-testid="asc-step-5" className="space-y-5">
      <StepHeader
        number={5}
        title="Outcomes & dispositions"
        blurb="What's the result of a call? Add outcomes manually, or let the architect propose options grounded in your purpose and caller types."
      />
      <div className="flex gap-2">
        <Input
          data-testid="asc-outcome-input"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Booked consultation"
        />
        <Button
          data-testid="asc-outcome-add"
          onClick={() => {
            const trimmed = label.trim();
            if (!trimmed) return;
            dispatch({
              type: "ADD_OUTCOME_EDIT",
              outcome: { id: `oc-${Date.now().toString(36)}`, label: trimmed },
            });
            setLabel("");
          }}
        >
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>
      <ul className="space-y-2">
        {outcomes.map((o) => (
          <li
            key={o.id}
            data-testid={`asc-outcome-${o.id}`}
            className="flex items-center justify-between rounded-md border bg-card px-3 py-2 text-sm"
          >
            <div>
              <div className="font-medium">{o.label}</div>
              {o.note && <div className="text-xs text-muted-foreground">{o.note}</div>}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => dispatch({ type: "REMOVE_OUTCOME_EDIT", id: o.id })}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>
      <AscLogicArchitectPanel
        draft={draft}
        step={5}
        dispatch={dispatch}
        hint="The architect proposes outcomes grounded in your purpose and caller types. The stable identifier is the label — `kind` is a proposal-local hint only."
      />
    </div>
  );
}

// ── Step 6 ─────────────────────────────────────────────────────────────────
export function AscStepNotifications({ draft, dispatch }: AscStepProps) {
  const [trigger, setTrigger] = useState("");
  const [channel, setChannel] = useState("");
  const notifications = draft.input.notificationsDraftEdits ?? [];
  return (
    <div data-testid="asc-step-6" className="space-y-5">
      <StepHeader
        number={6}
        title="Notifications"
        blurb="Who should be alerted, and when? Add rules manually, or let the architect propose rules grounded in your configured destinations."
      />
      <div className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_1fr_auto]">
        <Input
          data-testid="asc-notification-trigger"
          value={trigger}
          onChange={(e) => setTrigger(e.target.value)}
          placeholder="Outcome trigger (e.g. Booked consultation)"
        />
        <Input
          data-testid="asc-notification-channel"
          value={channel}
          onChange={(e) => setChannel(e.target.value)}
          placeholder="Channel (e.g. #intake-alerts)"
        />
        <Button
          data-testid="asc-notification-add"
          onClick={() => {
            const t = trigger.trim();
            const c = channel.trim();
            if (!t || !c) return;
            dispatch({
              type: "ADD_NOTIFICATION_EDIT",
              notification: {
                id: `nt-${Date.now().toString(36)}`,
                trigger: t,
                channel: c,
              },
            });
            setTrigger("");
            setChannel("");
          }}
        >
          Add rule
        </Button>
      </div>
      <ul className="space-y-2">
        {notifications.map((n) => (
          <li
            key={n.id}
            data-testid={`asc-notification-${n.id}`}
            className="flex items-center justify-between rounded-md border bg-card px-3 py-2 text-sm"
          >
            <div className="space-y-0.5">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-muted-foreground">outcome</span>
                <span className="font-medium">{n.trigger}</span>
                <span className="text-muted-foreground">·  channel</span>
                <span className="font-mono">{n.channel}</span>
              </div>
              {n.note && <div className="text-xs text-muted-foreground">{n.note}</div>}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() =>
                dispatch({ type: "REMOVE_NOTIFICATION_EDIT", id: n.id })
              }
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </li>
        ))}
      </ul>
      <AscLogicArchitectPanel
        draft={draft}
        step={6}
        dispatch={dispatch}
        hint="Without configured destinations the architect stays advisory — it will not invent recipients."
      />
    </div>
  );
}

// ── Step 7 ─────────────────────────────────────────────────────────────────
export function AscStepDestination({ draft, dispatch }: AscStepProps) {
  const dest = draft.input.destination;
  const launch = draft.input.launch;
  const slug = launch?.slug ?? "";
  const takenSlugs: string[] = []; // sourced from a deterministic, non-AI check; pluggable upstream
  const slugStatus =
    slug.trim().length === 0
      ? null
      : takenSlugs.map((s) => s.toLowerCase()).includes(slug.toLowerCase())
        ? "taken"
        : "available";
  return (
    <div data-testid="asc-step-7" className="space-y-5">
      <StepHeader
        number={7}
        title="Destination & launch URL"
        blurb="Two distinct things: where agents work (operational destination) and the public launch URL."
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="space-y-3 p-4">
          <h3 className="text-sm font-semibold">Where do agents work?</h3>
          <p className="text-xs text-muted-foreground">
            Operational destination — what the agent opens during a call.
          </p>
          <div className="space-y-2">
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
                    kind: e.target.value as NonNullable<typeof dest>["kind"],
                  },
                })
              }
            >
              <option value="internal_runner">Internal runner</option>
              <option value="external_url">External URL</option>
              <option value="deep_link">Deep link template</option>
            </select>
          </div>
          {dest?.kind === "external_url" && (
            <div className="space-y-1">
              <Label htmlFor="asc-dest-url" className="text-xs">
                External URL
              </Label>
              <Input
                id="asc-dest-url"
                data-testid="asc-destination-external-url"
                value={dest.externalUrl ?? ""}
                onChange={(e) =>
                  dispatch({
                    type: "SET_DESTINATION",
                    destination: { ...dest, externalUrl: e.target.value },
                  })
                }
                placeholder="https://app.example.com/agent"
              />
            </div>
          )}
          {dest?.kind === "deep_link" && (
            <div className="space-y-1">
              <Label htmlFor="asc-dest-deep" className="text-xs">
                Deep link template
              </Label>
              <Input
                id="asc-dest-deep"
                data-testid="asc-destination-deep-link"
                value={dest.deepLinkTemplate ?? ""}
                onChange={(e) =>
                  dispatch({
                    type: "SET_DESTINATION",
                    destination: { ...dest, deepLinkTemplate: e.target.value },
                  })
                }
                placeholder="myapp://case/{{caseId}}"
              />
            </div>
          )}
        </Card>
        <Card className="space-y-3 p-4">
          <h3 className="text-sm font-semibold">What's the public link?</h3>
          <p className="text-xs text-muted-foreground">
            Launch slug — separate from destination.
          </p>
          <div className="space-y-1">
            <Label htmlFor="asc-launch-slug" className="text-xs">
              Slug
            </Label>
            <Input
              id="asc-launch-slug"
              data-testid="asc-launch-slug"
              value={slug}
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
              Preview: fabric59.com/c/<span className="font-mono">{slug || "<slug>"}</span>
            </p>
            {slugStatus && (
              <p
                data-testid="asc-launch-slug-status"
                className={
                  "text-xs " +
                  (slugStatus === "available"
                    ? "text-emerald-600"
                    : "text-destructive")
                }
              >
                {slugStatus === "available" ? "Available" : "Already in use"}
              </p>
            )}
          </div>
        </Card>
      </div>
      <AscLogicArchitectPanel
        draft={draft}
        step={7}
        dispatch={dispatch}
        grounding={{ takenSlugs }}
        hint="The architect proposes destination subfields and slug candidates. Slug uniqueness is decided here, not by the AI."
      />
    </div>
  );
}

// ── Step 8 ─────────────────────────────────────────────────────────────────
export function AscStepGenerate({ draft, dispatch }: AscStepProps) {
  const workspaceId = useWorkspaceIdFromRoute();
  return (
    <div data-testid="asc-step-8" className="space-y-4">
      <StepHeader
        number={8}
        title="Generate draft"
        blurb="Compile your Step 1–7 inputs into a structured ASC draft. The draft stays local to ASC until you fork it later — nothing publishes from here."
      />
      <AscGenerationPanel
        draft={draft}
        dispatch={dispatch}
        workspaceId={workspaceId}
      />
    </div>
  );
}

// ── Step 9 ─────────────────────────────────────────────────────────────────
export function AscStepReview({ draft, onJumpToStep }: AscStepProps) {
  const [dismissedStale, setDismissedStale] = useState(false);
  const isStale = selectGenerationIsStale(draft);
  const hasGenerated = !!draft.generated;

  // No generated draft yet — guide back to Step 8.
  if (!hasGenerated) {
    return (
      <div data-testid="asc-step-9" className="space-y-4">
        <StepHeader
          number={9}
          title="Review draft"
          blurb="Review a generated draft before the canonical handoff. Nothing is published from here."
        />
        <Card
          className="space-y-3 border-dashed p-5 text-sm"
          data-testid="asc-review-empty"
        >
          <p className="font-medium">No draft generated yet</p>
          <p className="text-muted-foreground">
            Generate a draft in Step 8 first. Step 9 reviews the most recent
            ASC-local draft and links you back to Steps 3–7 for changes.
          </p>
          {onJumpToStep && (
            <Button
              type="button"
              onClick={() => onJumpToStep(8)}
              data-testid="asc-review-goto-step8"
            >
              Go to Step 8
            </Button>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div data-testid="asc-step-9" className="space-y-4">
      <StepHeader
        number={9}
        title="Review draft"
        blurb="Review the generated draft. Edits round-trip through Steps 3–7 — nothing here mutates the draft, and nothing is published yet."
      />

      {isStale && !dismissedStale && (
        <Card
          className="flex flex-col gap-3 border-amber-300 bg-amber-50 p-4 text-sm sm:flex-row sm:items-start sm:justify-between"
          data-testid="asc-review-stale-banner"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
            <div>
              <p className="font-medium text-amber-900">
                Inputs changed since this draft was generated
              </p>
              <p className="mt-0.5 text-amber-800">
                The review below reflects the previous draft. Regenerate in
                Step 8 to refresh it.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            {onJumpToStep && (
              <Button
                type="button"
                size="sm"
                onClick={() => onJumpToStep(8)}
                data-testid="asc-review-regenerate"
              >
                Regenerate draft
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setDismissedStale(true)}
              data-testid="asc-review-dismiss-stale"
            >
              Continue reviewing anyway
            </Button>
          </div>
        </Card>
      )}

      <AscReviewOverviewSection draft={draft} />
      <AscReviewFlowOutlineSection draft={draft} onJumpToStep={onJumpToStep} />
      <AscReviewOutcomesSection draft={draft} onJumpToStep={onJumpToStep} />
      <AscReviewNotificationsSection
        draft={draft}
        onJumpToStep={onJumpToStep}
      />
      <AscReviewDestinationSection
        draft={draft}
        onJumpToStep={onJumpToStep}
      />
      <AscReviewTodosSection draft={draft} onJumpToStep={onJumpToStep} />
    </div>
  );
}





// ── Step 10 ────────────────────────────────────────────────────────────────
export function AscStepReadiness({
  draft,
  onJumpToStep,
  onForkToCanonical,
}: AscStepProps) {
  const workspaceId = useWorkspaceIdFromRoute();
  return (
    <div data-testid="asc-step-10" className="space-y-4">
      <StepHeader
        number={10}
        title="Readiness & handoff"
        blurb="ASC checks your inputs and the generated draft for blockers. When safe, you can hand off into the canonical campaign builder — nothing is published from ASC."
      />
      <AscReadinessPanel
        draft={draft}
        workspaceId={workspaceId}
        onJumpToStep={onJumpToStep}
        onForkToCanonical={onForkToCanonical}
      />
    </div>
  );
}
