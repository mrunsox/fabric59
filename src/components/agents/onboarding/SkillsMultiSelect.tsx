import { useState, useMemo } from "react";
import { X, Search, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SkillsMultiSelectProps {
  availableSkills: string[];
  selectedSkills: string[];
  onChange: (skills: string[]) => void;
  loading?: boolean;
}

export function SkillsMultiSelect({ availableSkills, selectedSkills, onChange, loading }: SkillsMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return availableSkills;
    return availableSkills.filter(s => s.toLowerCase().includes(search.toLowerCase()));
  }, [availableSkills, search]);

  const toggle = (skill: string) => {
    onChange(
      selectedSkills.includes(skill)
        ? selectedSkills.filter(s => s !== skill)
        : [...selectedSkills, skill]
    );
  };

  const remove = (skill: string) => onChange(selectedSkills.filter(s => s !== skill));

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between h-auto min-h-[2.25rem] py-1.5 px-3 font-normal"
            disabled={loading}
          >
            <span className="text-sm text-muted-foreground truncate">
              {loading ? "Loading skills..." : selectedSkills.length > 0 ? `${selectedSkills.length} skill${selectedSkills.length > 1 ? 's' : ''} selected` : "Select skills..."}
            </span>
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search skills..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-8 pl-7 text-xs"
              />
            </div>
          </div>
          <ScrollArea className="max-h-48">
            {filtered.length === 0 ? (
              <p className="p-3 text-xs text-muted-foreground text-center">No skills found</p>
            ) : (
              <div className="p-1">
                {filtered.map(skill => (
                  <label
                    key={skill}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted/50 cursor-pointer text-sm"
                  >
                    <Checkbox
                      checked={selectedSkills.includes(skill)}
                      onCheckedChange={() => toggle(skill)}
                    />
                    {skill}
                  </label>
                ))}
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>

      {selectedSkills.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedSkills.map(skill => (
            <Badge key={skill} variant="secondary" className="text-xs gap-1 pr-1">
              {skill}
              <button
                type="button"
                onClick={() => remove(skill)}
                className="ml-0.5 rounded-full hover:bg-muted p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
