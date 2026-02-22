import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Mail } from "lucide-react";
import { PERMISSION_KEYS } from "@/hooks/useTeamPermissions";

interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteMemberDialog({ open, onOpenChange }: InviteMemberDialogProps) {
  const { organization } = useAuth();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  const allPermissionKeys = PERMISSION_KEYS.map((p) => p.key);

  // When role is admin, auto-select all permissions
  useEffect(() => {
    if (role === "admin") {
      setSelectedPermissions([...allPermissionKeys]);
    }
  }, [role]);

  const togglePermission = (key: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organization || !email.trim()) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast.error("Please enter a valid email address");
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("invite-member", {
        body: {
          email: email.trim(),
          role,
          organizationId: organization.id,
          permissions: role === "admin" ? allPermissionKeys : selectedPermissions,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(data?.message || "Invitation sent!");
      queryClient.invalidateQueries({ queryKey: ["organization_members"] });
      queryClient.invalidateQueries({ queryKey: ["team_permissions"] });
      queryClient.invalidateQueries({ queryKey: ["team-permissions"] });
      setEmail("");
      setRole("member");
      setSelectedPermissions([]);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to send invitation");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Send an email invitation to add a new member to your organization.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email Address</Label>
            <Input
              id="invite-email"
              type="email"
              placeholder="colleague@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="invite-role">Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as "member" | "admin")}>
              <SelectTrigger id="invite-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Permission checkboxes */}
          <div className="space-y-2">
            <Label>Tab Access</Label>
            {role === "admin" && (
              <p className="text-xs text-muted-foreground">Admins have full access to all tabs.</p>
            )}
            <div className="grid grid-cols-2 gap-2">
              {PERMISSION_KEYS.map((perm) => (
                <label
                  key={perm.key}
                  className="flex items-center gap-2 text-sm cursor-pointer"
                >
                  <Checkbox
                    checked={role === "admin" || selectedPermissions.includes(perm.key)}
                    disabled={role === "admin"}
                    onCheckedChange={() => togglePermission(perm.key)}
                  />
                  <span>{perm.label}</span>
                </label>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
              Cancel
            </Button>
            <Button type="submit" disabled={sending || !email.trim()}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
              Send Invite
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
