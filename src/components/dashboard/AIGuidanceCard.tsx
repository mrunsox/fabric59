import { Link } from "react-router-dom";
import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getNextActions, type ClientReadiness } from "@/lib/readiness/computeCampaignReadiness";

export function AIGuidanceCard({ readiness }: { readiness: ClientReadiness | null }) {
  const actions = getNextActions(readiness);

  return (
    <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card p-8 space-y-5">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Sparkles className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">AI Guidance</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Top recommended next actions</p>
        </div>
      </div>

      <div className="space-y-2">
        {actions.map((a, i) => (
          <Link
            key={i}
            to={a.href}
            className="block p-4 rounded-xl border border-border bg-background/50 hover:border-primary/30 hover:bg-primary/[0.02] transition-all group"
          >
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary flex-shrink-0">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{a.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{a.description}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-0.5" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
