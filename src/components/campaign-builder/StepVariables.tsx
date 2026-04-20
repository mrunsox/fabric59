import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { StepProps } from "./types";

export function StepVariables({ payload, updatePayload }: StepProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Variable group name</Label>
        <Input
          value={payload.variable_group_name || ""}
          onChange={(e) => updatePayload({ variable_group_name: e.target.value })}
          placeholder="Default Intake Group"
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Variables can be added in detail after the campaign is created. For now, name the group.
      </p>
    </div>
  );
}
