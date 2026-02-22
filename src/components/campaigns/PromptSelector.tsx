import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PromptSelectorProps {
  value: string;
  onChange: (value: string) => void;
  prompts: string[];
  loading?: boolean;
  label?: string;
}

export function PromptSelector({ value, onChange, prompts, loading, label }: PromptSelectorProps) {
  return (
    <div className="space-y-1.5">
      {label && <label className="text-sm font-medium">{label}</label>}
      <Select value={value || "__none__"} onValueChange={(v) => onChange(v === "__none__" ? "" : v)}>
        <SelectTrigger>
          <SelectValue placeholder={loading ? "Loading prompts..." : "Select a prompt"} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">None</SelectItem>
          {prompts.map((p) => (
            <SelectItem key={p} value={p}>{p}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
