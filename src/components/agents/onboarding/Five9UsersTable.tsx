import { useState, useEffect } from "react";
import { Search, RefreshCw, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/agents/shared/StatusBadge";
import { useFive9Users } from "@/hooks/useFive9Users";
import { cn } from "@/lib/utils";

export function Five9UsersTable() {
  const { users, loading, error, fetchUsers } = useFive9Users();
  const [search, setSearch] = useState("");

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const filtered = users.filter(u =>
    `${u.firstName} ${u.lastName} ${u.userName} ${u.extension}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold text-foreground">Live Five9 Roster</span>
          <span className="text-xs text-muted-foreground">({filtered.length} agents)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 w-48 text-xs"
            />
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={fetchUsers} disabled={loading}>
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {error && (
        <div className="px-4 py-6 text-center">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={fetchUsers}>Retry</Button>
        </div>
      )}

      {!error && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Username</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Ext</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Role</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-xs">Loading roster...</td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground text-xs">
                    {users.length === 0 ? "No users found. Check Five9 credentials in settings." : "No results match your search."}
                  </td>
                </tr>
              )}
              {!loading && filtered.map((user, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-2.5 font-medium text-foreground">{user.firstName} {user.lastName}</td>
                  <td className="px-4 py-2.5 text-muted-foreground font-mono text-xs">{user.userName}</td>
                  <td className="px-4 py-2.5 text-muted-foreground font-mono text-xs">{user.extension}</td>
                  <td className="px-4 py-2.5 text-muted-foreground text-xs">{user.inferredRole}</td>
                  <td className="px-4 py-2.5">
                    <StatusBadge status={user.active ? 'active' : 'deprovisioned'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
