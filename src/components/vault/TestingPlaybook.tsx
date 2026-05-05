import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, RotateCcw, ClipboardList, CheckCircle2, Circle, PlayCircle, KeyRound, Copy, Eye, EyeOff, ExternalLink, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  FEATURE_PLAYBOOKS,
  collectCheckIds,
  type FeaturePlaybook,
  type PlaybookCheck,
  type PlaybookSection,
  type PlaybookStep,
} from "@/config/feature-playbooks";

interface Props {
  slug: string | null | undefined;
}

type ProgressMap = Record<string, boolean>;

function CheckRow({
  id,
  check,
  done,
  onToggle,
}: {
  id: string;
  check: PlaybookCheck;
  done: boolean;
  onToggle: (id: string, done: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex items-start gap-3 rounded-lg border border-border/60 bg-card px-3 py-2 cursor-pointer transition-colors hover:bg-accent/5",
        done && "bg-success/5 border-success/30",
      )}
    >
      <Checkbox
        id={id}
        checked={done}
        onCheckedChange={(c) => onToggle(id, !!c)}
        className="mt-0.5"
      />
      <div className="flex-1 min-w-0">
        <p className={cn("text-sm", done && "line-through text-muted-foreground")}>
          {check.label}
        </p>
        {check.hint && (
          <p className="text-xs text-muted-foreground mt-0.5">{check.hint}</p>
        )}
      </div>
    </label>
  );
}

function StepBlock({
  sectionId,
  step,
  status,
  progress,
  onToggle,
}: {
  sectionId: string;
  step: PlaybookStep;
  status: "completed" | "active" | "upcoming";
  progress: ProgressMap;
  onToggle: (key: string, done: boolean) => void;
}) {
  const Icon =
    status === "completed" ? CheckCircle2 : status === "active" ? PlayCircle : Circle;
  const tone =
    status === "completed"
      ? "text-success border-success/30 bg-success/5"
      : status === "active"
        ? "text-primary border-primary/30 bg-primary/5"
        : "text-muted-foreground border-border bg-muted/20";

  return (
    <div className={cn("rounded-lg border p-3 space-y-2", tone)}>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4" />
        <p className="text-sm font-medium text-foreground">{step.title}</p>
      </div>
      {step.body && <p className="text-xs text-muted-foreground">{step.body}</p>}
      <div className="space-y-1.5">
        {step.checks.map((c) => {
          const key = `${sectionId}:${step.id}:${c.id}`;
          return (
            <CheckRow
              key={key}
              id={key}
              check={c}
              done={!!progress[key]}
              onToggle={onToggle}
            />
          );
        })}
      </div>
    </div>
  );
}

function SectionCard({
  section,
  progress,
  onToggle,
}: {
  section: PlaybookSection;
  progress: ProgressMap;
  onToggle: (key: string, done: boolean) => void;
}) {
  const [open, setOpen] = useState(true);

  const { total, done } = useMemo(() => {
    let t = 0;
    let d = 0;
    if (section.checks) {
      for (const c of section.checks) {
        t++;
        if (progress[`${section.id}:${c.id}`]) d++;
      }
    }
    if (section.steps) {
      for (const st of section.steps) {
        for (const c of st.checks) {
          t++;
          if (progress[`${section.id}:${st.id}:${c.id}`]) d++;
        }
      }
    }
    return { total: t, done: d };
  }, [section, progress]);

  // Determine first non-completed step as "active"
  const activeStepIdx = useMemo(() => {
    if (!section.steps) return -1;
    for (let i = 0; i < section.steps.length; i++) {
      const allDone = section.steps[i].checks.every(
        (c) => progress[`${section.id}:${section.steps![i].id}:${c.id}`],
      );
      if (!allDone) return i;
    }
    return -1;
  }, [section, progress]);

  return (
    <Card>
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-accent/5 transition-colors py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <CardTitle className="text-base">{section.title}</CardTitle>
                {total > 0 && (
                  <Badge variant="secondary" className="text-[10px]">
                    {done}/{total}
                  </Badge>
                )}
              </div>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform",
                  open && "rotate-180",
                )}
              />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-3 pt-0">
            {section.intro && (
              <p className="text-sm text-muted-foreground">{section.intro}</p>
            )}
            {section.checks && section.checks.length > 0 && (
              <div className="space-y-1.5">
                {section.checks.map((c) => {
                  const key = `${section.id}:${c.id}`;
                  return (
                    <CheckRow
                      key={key}
                      id={key}
                      check={c}
                      done={!!progress[key]}
                      onToggle={onToggle}
                    />
                  );
                })}
              </div>
            )}
            {section.steps && section.steps.length > 0 && (
              <div className="space-y-2">
                {section.steps.map((st, i) => {
                  const allDone = st.checks.every(
                    (c) => progress[`${section.id}:${st.id}:${c.id}`],
                  );
                  const status: "completed" | "active" | "upcoming" = allDone
                    ? "completed"
                    : i === activeStepIdx
                      ? "active"
                      : "upcoming";
                  return (
                    <StepBlock
                      key={st.id}
                      sectionId={section.id}
                      step={st}
                      status={status}
                      progress={progress}
                      onToggle={onToggle}
                    />
                  );
                })}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export function TestingPlaybook({ slug }: Props) {
  const playbook: FeaturePlaybook | undefined = slug
    ? FEATURE_PLAYBOOKS[slug]
    : undefined;
  const [progress, setProgress] = useState<ProgressMap>({});

  const allKeys = useMemo(
    () => (playbook ? collectCheckIds(playbook) : []),
    [playbook],
  );
  const doneCount = allKeys.filter((k) => progress[k]).length;
  const total = allKeys.length;
  const pct = total === 0 ? 0 : Math.round((doneCount / total) * 100);

  const onToggle = (key: string, done: boolean) =>
    setProgress((p) => ({ ...p, [key]: done }));

  if (!playbook) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Testing playbook</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No playbook authored yet for this feature. Add one in
            <code className="mx-1 text-xs">src/config/feature-playbooks.ts</code>
            keyed by slug
            {slug ? <> <code className="text-xs">{slug}</code></> : null}.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Testing playbook</CardTitle>
              <Badge variant="outline" className="text-[10px]">
                {playbook.depth === "full" ? "Full" : "Baseline"}
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setProgress({})}
              disabled={doneCount === 0}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Reset progress
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-foreground/80">{playbook.objective}</p>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Progress</span>
              <span>
                {doneCount}/{total} ({pct}%)
              </span>
            </div>
            <Progress value={pct} className="h-1.5" />
          </div>
          <p className="text-xs text-muted-foreground">
            Progress is in-memory only and resets on reload. This avoids browser
            storage access errors in sandboxed iframes.
          </p>
        </CardContent>
      </Card>

      {playbook.sections.map((s) => (
        <SectionCard
          key={s.id}
          section={s}
          progress={progress}
          onToggle={onToggle}
        />
      ))}
    </div>
  );
}
