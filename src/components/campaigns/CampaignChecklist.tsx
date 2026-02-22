import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, Ban } from "lucide-react";
import { DEFAULT_CHECKLIST, type ChecklistItem } from "@/types/campaign";

interface CampaignChecklistProps {
  checklistState: Record<string, { done: boolean; blocked?: string }>;
  onToggle: (itemId: string, done: boolean) => void;
  readOnly?: boolean;
}

export function CampaignChecklist({ checklistState, onToggle, readOnly }: CampaignChecklistProps) {
  const items = DEFAULT_CHECKLIST.map((item) => ({
    ...item,
    done: checklistState[item.id]?.done ?? item.done,
    blocked: checklistState[item.id]?.blocked ?? item.blocked,
  }));

  const doneCount = items.filter((i) => i.done).length;
  const percent = Math.round((doneCount / items.length) * 100);

  // Group by category
  const categories = Array.from(new Set(items.map((i) => i.category)));

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Progress</span>
          <span className="text-muted-foreground">{doneCount}/{items.length} ({percent}%)</span>
        </div>
        <Progress value={percent} className="h-2" />
      </div>

      {categories.map((category) => {
        const catItems = items.filter((i) => i.category === category);
        return (
          <Card key={category} className="shadow-none">
            <CardHeader className="py-3 px-4">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{category}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 pt-0 space-y-1">
              {catItems.map((item) => (
                <div key={item.id} className="flex items-center gap-2 py-1">
                  {item.blocked && !item.done ? (
                    <Ban className="h-4 w-4 text-warning shrink-0" />
                  ) : item.done ? (
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                  ) : (
                    <Checkbox
                      checked={item.done}
                      onCheckedChange={(checked) => !readOnly && onToggle(item.id, !!checked)}
                      disabled={readOnly}
                      className="shrink-0"
                    />
                  )}
                  <span className={`text-sm flex-1 ${item.done ? "line-through text-muted-foreground" : ""}`}>
                    {item.task}
                  </span>
                  {item.automated && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Auto</Badge>
                  )}
                  {item.blocked && !item.done && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-warning border-warning/40">
                      {item.blocked}
                    </Badge>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
