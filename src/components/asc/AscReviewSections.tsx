/**
 * ASC Slice 7 — Step 9 review sections (read-only).
 *
 * All sections are pure presentation over selectors. No mutations of
 * AscGenerated; the only writes are step navigation via `onJumpToStep`.
 */
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AscDraft } from "@/lib/asc/types";
import {
  selectDestinationOverview,
  selectFlowOutline,
  selectNotificationsByOutcome,
  selectOutcomesOverview,
  selectReviewOverview,
  selectReviewTodos,
} from "@/lib/asc/selectors";

interface JumpProps {
  onJumpToStep?: (step: number) => void;
}

function EditAtSource({
  step,
  onJumpToStep,
  label,
}: {
  step: number;
  onJumpToStep?: (step: number) => void;
  label?: string;
}) {
  if (!onJumpToStep) return null;
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => onJumpToStep(step)}
      data-testid={`asc-review-edit-step-${step}`}
    >
      {label ?? `Edit in Step ${step}`}
    </Button>
  );
}

function SectionCard({
  title,
  children,
  testId,
}: {
  title: string;
  children: React.ReactNode;
  testId: string;
}) {
  return (
    <Card className="p-5" data-testid={testId}>
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="mt-3 text-sm">{children}</div>
    </Card>
  );
}

// ── Overview ────────────────────────────────────────────────────────────
export function AscReviewOverviewSection({ draft }: { draft: AscDraft }) {
  const o = selectReviewOverview(draft);
  const tiles: Array<{ label: string; value: string | number }> = [
    { label: "Caller reasons", value: o.callerReasonCount },
    { label: "Flow nodes", value: o.nodeCount },
    { label: "Outcomes", value: o.outcomeCount },
    { label: "Notifications", value: o.notificationCount },
    { label: "TODOs", value: o.todoCount },
  ];
  return (
    <SectionCard title="Overview" testId="asc-review-overview">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Business
          </div>
          <p className="mt-1 line-clamp-3">
            {o.businessDescription || (
              <span className="text-muted-foreground">Not provided</span>
            )}
          </p>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Primary outcome
          </div>
          <p className="mt-1">
            {o.primaryOutcome || (
              <span className="text-muted-foreground">Not provided</span>
            )}
          </p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {tiles.map((t) => (
          <div
            key={t.label}
            className="rounded-md border border-border bg-muted/30 p-3"
          >
            <div className="text-xs text-muted-foreground">{t.label}</div>
            <div className="mt-1 text-lg font-semibold">{t.value}</div>
          </div>
        ))}
      </div>
      {o.generatedAt && (
        <p className="mt-3 text-xs text-muted-foreground">
          Draft generated {new Date(o.generatedAt).toLocaleString()}
        </p>
      )}
    </SectionCard>
  );
}

// ── Flow outline ────────────────────────────────────────────────────────
export function AscReviewFlowOutlineSection({
  draft,
  onJumpToStep,
}: { draft: AscDraft } & JumpProps) {
  const rows = selectFlowOutline(draft);
  return (
    <SectionCard title="Flow outline" testId="asc-review-flow-outline">
      {rows.length === 0 ? (
        <p className="text-muted-foreground">No caller reasons captured yet.</p>
      ) : (
        <ol className="space-y-3">
          {rows.map((r) => (
            <li
              key={r.reasonId}
              className="rounded-md border border-border p-3"
              data-testid={`asc-review-outline-row-${r.reasonId}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-medium">{r.reasonLabel}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Handling:{" "}
                    {r.handlingLabels.length
                      ? r.handlingLabels.join(" → ")
                      : "—"}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Outcomes:{" "}
                    {r.outcomeLabels.length
                      ? r.outcomeLabels.join(", ")
                      : "—"}
                  </div>
                </div>
                <EditAtSource step={4} onJumpToStep={onJumpToStep} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </SectionCard>
  );
}

// ── Outcomes ────────────────────────────────────────────────────────────
export function AscReviewOutcomesSection({
  draft,
  onJumpToStep,
}: { draft: AscDraft } & JumpProps) {
  const rows = selectOutcomesOverview(draft);
  return (
    <SectionCard title="Outcomes" testId="asc-review-outcomes">
      {rows.length === 0 ? (
        <p className="text-muted-foreground">No outcomes in the draft.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Outcome</TableHead>
              <TableHead>From reasons</TableHead>
              <TableHead className="text-right">Notifications</TableHead>
              <TableHead className="w-32 text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow
                key={r.outcomeRef}
                data-testid={`asc-review-outcome-row-${r.outcomeRef}`}
              >
                <TableCell className="font-medium">{r.outcomeRef}</TableCell>
                <TableCell className="text-muted-foreground">
                  {r.fromReasonLabels.length
                    ? r.fromReasonLabels.join(", ")
                    : "—"}
                </TableCell>
                <TableCell className="text-right">
                  {r.notificationCount}
                </TableCell>
                <TableCell className="text-right">
                  <EditAtSource step={5} onJumpToStep={onJumpToStep} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </SectionCard>
  );
}

// ── Notifications ───────────────────────────────────────────────────────
export function AscReviewNotificationsSection({
  draft,
  onJumpToStep,
}: { draft: AscDraft } & JumpProps) {
  const grouped = selectNotificationsByOutcome(draft);
  const keys = Object.keys(grouped);
  return (
    <SectionCard title="Notifications" testId="asc-review-notifications">
      {keys.length === 0 ? (
        <p className="text-muted-foreground">No notifications in the draft.</p>
      ) : (
        <div className="space-y-4">
          {keys.map((outcomeRef) => (
            <div
              key={outcomeRef}
              className="rounded-md border border-border p-3"
              data-testid={`asc-review-notif-group-${outcomeRef}`}
            >
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium">{outcomeRef}</div>
                <EditAtSource step={6} onJumpToStep={onJumpToStep} />
              </div>
              <ul className="mt-2 space-y-1.5">
                {grouped[outcomeRef].map((n) => (
                  <li
                    key={n.id}
                    className="flex flex-wrap items-center gap-2 text-xs"
                  >
                    <Badge variant="secondary">{n.channelRef}</Badge>
                    {n.audienceRef && (
                      <Badge variant="outline">{n.audienceRef}</Badge>
                    )}
                    <Badge
                      variant={n.urgency === "high" ? "destructive" : "outline"}
                    >
                      {n.urgency}
                    </Badge>
                    {n.note && (
                      <span className="text-muted-foreground">{n.note}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

// ── Destination ─────────────────────────────────────────────────────────
export function AscReviewDestinationSection({
  draft,
  onJumpToStep,
}: { draft: AscDraft } & JumpProps) {
  const d = selectDestinationOverview(draft);
  const empty = !d.kind && !d.slug;
  return (
    <SectionCard title="Destination & launch" testId="asc-review-destination">
      {empty ? (
        <p className="text-muted-foreground">No destination configured.</p>
      ) : (
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Kind" value={d.kind} />
          <Field label="Slug" value={d.slug} />
          <Field label="External URL" value={d.externalUrl} />
          <Field label="Deep link template" value={d.deepLinkTemplate} />
          <Field label="Open mode" value={d.openMode} />
          <Field label="Notes" value={d.notes} />
        </dl>
      )}
      <div className="mt-3 text-right">
        <EditAtSource step={7} onJumpToStep={onJumpToStep} />
      </div>
    </SectionCard>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 break-all">
        {value || <span className="text-muted-foreground">—</span>}
      </dd>
    </div>
  );
}

// ── TODOs / low confidence ──────────────────────────────────────────────
export function AscReviewTodosSection({
  draft,
  onJumpToStep,
}: { draft: AscDraft } & JumpProps) {
  const rows = selectReviewTodos(draft);
  return (
    <SectionCard
      title="TODOs and low-confidence areas"
      testId="asc-review-todos"
    >
      {rows.length === 0 ? (
        <p className="text-muted-foreground">
          No TODOs or low-confidence areas flagged.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((t) => (
            <li
              key={`${t.source}-${t.id}`}
              className="flex items-start justify-between gap-3 rounded-md border border-border p-3"
              data-testid={`asc-review-todo-${t.id}`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{t.area}</Badge>
                  {t.source === "low_confidence" && (
                    <Badge variant="secondary">low confidence</Badge>
                  )}
                </div>
                <p className="mt-1 text-sm">{t.message}</p>
              </div>
              {t.jumpToStep && (
                <EditAtSource
                  step={t.jumpToStep}
                  onJumpToStep={onJumpToStep}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
