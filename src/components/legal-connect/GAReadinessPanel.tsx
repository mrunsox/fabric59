import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Rocket } from "lucide-react";
import { GA_READINESS_CHECKLIST } from "@/data/legal-connect-feedback";

const STORAGE_KEY = "lc-ga-readiness-v1";

type State = Record<string, boolean>;

export default function GAReadinessPanel() {
  const [state, setState] = useState<State>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setState(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  const toggle = (id: string, v: boolean) => {
    setState((s) => {
      const next = { ...s, [id]: v };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  const { total, done } = useMemo(() => {
    const all = GA_READINESS_CHECKLIST.flatMap((s) => s.items);
    return { total: all.length, done: all.filter((i) => state[i.id]).length };
  }, [state]);

  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Rocket className="h-4 w-4 text-primary" /> GA readiness checklist
            </CardTitle>
            <CardDescription className="text-xs">
              Internal pre-launch tally. Stored locally per operator until we promote it to a shared store.
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs">{done} / {total} · {pct}%</Badge>
        </div>
        <Progress value={pct} className="mt-3 h-1.5" />
      </CardHeader>
      <CardContent className="space-y-5">
        {GA_READINESS_CHECKLIST.map((section) => (
          <div key={section.section} className="space-y-2">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {section.section}
            </div>
            <div className="space-y-1.5">
              {section.items.map((item) => (
                <label key={item.id} className="flex items-start gap-2.5 rounded-md border border-border p-2.5 hover:bg-muted/40 cursor-pointer">
                  <Checkbox
                    checked={!!state[item.id]}
                    onCheckedChange={(v) => toggle(item.id, !!v)}
                    className="mt-0.5"
                  />
                  <span className="text-sm leading-snug">{item.label}</span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
