import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { WORKSPACE_NAV_GROUPS, WORKSPACE_NAV_PINNED, WORKSPACE_NAV_DEMOTED } from "@/config/canonicalNav";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceCampaigns } from "@/hooks/useWorkspaceCampaigns";
import { useWorkspaceGuides } from "@/hooks/useWorkspaceGuides";
import { useWorkspaceForms } from "@/hooks/useWorkspaceForms";
import { Plus, Building2, ArrowRightLeft } from "lucide-react";

/**
 * ⌘K command palette for the workspace shell. Mounts globally inside
 * <WorkspaceShell> and listens for Cmd/Ctrl+K. Surfaces every canonical
 * destination, every workspace in scope, and the most recent campaigns,
 * guides, and forms — eliminating "where do I go?" dead-ends.
 */
export function WorkspaceCommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { workspace, workspaces } = useWorkspace();
  const { data: campaigns = [] } = useWorkspaceCampaigns();
  const { data: guides = [] } = useWorkspaceGuides();
  const { data: forms = [] } = useWorkspaceForms();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  if (!workspace) return null;
  const base = `/w/${workspace.id}`;
  const recent = (arr: { id: string; name: string; updated_at: string }[]) =>
    [...arr].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 5);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Jump to anything…" />
      <CommandList>
        <CommandEmpty>No matches.</CommandEmpty>

        {[...WORKSPACE_NAV_GROUPS, { label: "Pinned", items: WORKSPACE_NAV_PINNED }].map((group) => (
          <CommandGroup key={group.label} heading={group.label}>
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={item.key}
                  value={`nav ${item.label}`}
                  onSelect={() => go(`${base}/${item.to}`)}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}

        <CommandGroup heading="More">
          {WORKSPACE_NAV_DEMOTED.map((item) => {
            const Icon = item.icon;
            return (
              <CommandItem
                key={item.key}
                value={`nav ${item.label}`}
                onSelect={() => go(`${base}/${item.to}`)}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
                <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground/70">
                  hidden
                </span>
              </CommandItem>
            );
          })}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Create">
          <CommandItem value="create campaign" onSelect={() => go(`${base}/campaigns/new`)}>
            <Plus className="h-4 w-4" /> <span>New campaign</span>
          </CommandItem>
          <CommandItem value="create guide" onSelect={() => go(`${base}/guides/new`)}>
            <Plus className="h-4 w-4" /> <span>New guide</span>
          </CommandItem>
          <CommandItem value="create form" onSelect={() => go(`${base}/forms/new`)}>
            <Plus className="h-4 w-4" /> <span>New form</span>
          </CommandItem>
        </CommandGroup>

        {workspaces.length > 1 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Workspaces">
              {workspaces.map((w) => (
                <CommandItem
                  key={w.id}
                  value={`workspace ${w.name}`}
                  onSelect={() => go(`/w/${w.id}/campaigns`)}
                >
                  <ArrowRightLeft className="h-4 w-4" />
                  <span>{w.name}</span>
                  {w.id === workspace.id && (
                    <span className="ml-auto text-[10px] uppercase tracking-wider text-muted-foreground">
                      current
                    </span>
                  )}
                </CommandItem>
              ))}
              <CommandItem value="create workspace" onSelect={() => go("/admin/workspaces?new=1")}>
                <Plus className="h-4 w-4" />
                <span>Create workspace</span>
              </CommandItem>
            </CommandGroup>
          </>
        )}

        {(campaigns.length || guides.length || forms.length) > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Recent">
              {recent(campaigns).map((c) => (
                <CommandItem
                  key={`c-${c.id}`}
                  value={`campaign ${c.name}`}
                  onSelect={() => go(`${base}/campaigns/${c.id}`)}
                >
                  <span className="text-muted-foreground text-xs">Campaign</span>
                  <span>{c.name}</span>
                </CommandItem>
              ))}
              {recent(guides).map((g) => (
                <CommandItem
                  key={`g-${g.id}`}
                  value={`guide ${g.name}`}
                  onSelect={() => go(`${base}/guides/${g.id}`)}
                >
                  <span className="text-muted-foreground text-xs">Guide</span>
                  <span>{g.name}</span>
                </CommandItem>
              ))}
              {recent(forms).map((f) => (
                <CommandItem
                  key={`f-${f.id}`}
                  value={`form ${f.name}`}
                  onSelect={() => go(`${base}/forms/${f.id}`)}
                >
                  <span className="text-muted-foreground text-xs">Form</span>
                  <span>{f.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading="Org">
          <CommandItem value="org overview" onSelect={() => go("/admin")}>
            <Building2 className="h-4 w-4" />
            <span>Organization overview</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}

export default WorkspaceCommandPalette;
