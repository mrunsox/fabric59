import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTeamPermissions } from "@/hooks/useTeamPermissions";
import { InviteMemberDialog } from "@/components/settings/InviteMemberDialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Save, Mail, Users, Building2, Palette } from "lucide-react";
import { toast } from "sonner";

/**
 * Phase 3 — Canonical /org/settings.
 *
 * Owns: Members, Org profile, Branding. Exposes only functionality already
 * wired to real backend behavior. Granular role/permission editing is
 * intentionally omitted here; that lands in a dedicated slice.
 */
export default function OrgSettingsPage() {
  const { organization, membership, isMasterAdmin } = useAuth();
  const isOrgAdmin = isMasterAdmin || membership?.role === "owner" || membership?.role === "admin";

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-6 animate-fade-in">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Organization settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Members, profile, and branding for {organization?.name ?? "your organization"}.
        </p>
      </header>

      <Tabs defaultValue="members" className="space-y-6">
        <TabsList>
          <TabsTrigger value="members"><Users className="h-4 w-4 mr-1.5" />Members</TabsTrigger>
          <TabsTrigger value="profile"><Building2 className="h-4 w-4 mr-1.5" />Profile</TabsTrigger>
          <TabsTrigger value="branding"><Palette className="h-4 w-4 mr-1.5" />Branding</TabsTrigger>
        </TabsList>

        <TabsContent value="members"><MembersSection canManage={isOrgAdmin} /></TabsContent>
        <TabsContent value="profile"><ProfileSection canEdit={isOrgAdmin} /></TabsContent>
        <TabsContent value="branding"><BrandingSection canEdit={isOrgAdmin} /></TabsContent>
      </Tabs>
    </div>
  );
}

/* -------------------------- Members -------------------------- */

function MembersSection({ canManage }: { canManage: boolean }) {
  const { organization } = useAuth();
  const { data: members = [], isLoading } = useTeamPermissions(organization?.id);
  const [inviteOpen, setInviteOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base">Team members</CardTitle>
          <CardDescription>People with access to this organization.</CardDescription>
        </div>
        {canManage && (
          <Button size="sm" onClick={() => setInviteOpen(true)}>
            <Mail className="h-4 w-4 mr-1.5" />Invite member
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
        ) : members.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No members yet.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {members.map((m) => (
              <li key={m.userId} className="flex items-center justify-between py-3 gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{m.displayName || m.email}</p>
                  <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                </div>
                <Badge variant="outline" className="capitalize">{m.role}</Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <InviteMemberDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </Card>
  );
}

/* -------------------------- Profile -------------------------- */

function ProfileSection({ canEdit }: { canEdit: boolean }) {
  const { organization } = useAuth();
  const qc = useQueryClient();
  const [name, setName] = useState(organization?.name ?? "");
  const [billingEmail, setBillingEmail] = useState((organization as any)?.billing_email ?? "");

  useEffect(() => {
    setName(organization?.name ?? "");
    setBillingEmail((organization as any)?.billing_email ?? "");
  }, [organization?.id]);

  const save = useMutation({
    mutationFn: async () => {
      if (!organization) throw new Error("No org");
      const { error } = await supabase
        .from("organizations")
        .update({ name: name.trim(), billing_email: billingEmail.trim() || null })
        .eq("id", organization.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile saved");
      qc.invalidateQueries({ queryKey: ["organizations"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Organization profile</CardTitle>
        <CardDescription>Identity used across the platform.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 max-w-xl">
        <div className="space-y-2">
          <Label htmlFor="org-name">Name</Label>
          <Input id="org-name" value={name} onChange={(e) => setName(e.target.value)} disabled={!canEdit} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="org-billing">Billing email</Label>
          <Input id="org-billing" type="email" value={billingEmail} onChange={(e) => setBillingEmail(e.target.value)} disabled={!canEdit} />
        </div>
        {canEdit && (
          <Button onClick={() => save.mutate()} disabled={save.isPending || !name.trim()}>
            {save.isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
            Save profile
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/* -------------------------- Branding -------------------------- */

function BrandingSection({ canEdit }: { canEdit: boolean }) {
  const { organization } = useAuth();
  const qc = useQueryClient();

  const { data: brand, isLoading } = useQuery({
    queryKey: ["org-branding", organization?.id],
    enabled: !!organization?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("organizations")
        .select("brand_name, brand_logo_url, brand_primary_color, brand_from_email, brand_reply_to")
        .eq("id", organization!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const [form, setForm] = useState({
    brand_name: "", brand_logo_url: "", brand_primary_color: "", brand_from_email: "", brand_reply_to: "",
  });

  useEffect(() => {
    if (brand) {
      setForm({
        brand_name: brand.brand_name ?? "",
        brand_logo_url: brand.brand_logo_url ?? "",
        brand_primary_color: brand.brand_primary_color ?? "",
        brand_from_email: brand.brand_from_email ?? "",
        brand_reply_to: brand.brand_reply_to ?? "",
      });
    }
  }, [brand]);

  const save = useMutation({
    mutationFn: async () => {
      if (!organization) throw new Error("No org");
      const payload = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, v.trim() === "" ? null : v.trim()]),
      );
      const { error } = await supabase.from("organizations").update(payload).eq("id", organization.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Branding saved");
      qc.invalidateQueries({ queryKey: ["org-branding"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Save failed"),
  });

  const field = (key: keyof typeof form, label: string, placeholder?: string) => (
    <div className="space-y-2">
      <Label htmlFor={`brand-${key}`}>{label}</Label>
      <Input
        id={`brand-${key}`}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        disabled={!canEdit}
      />
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Branding</CardTitle>
        <CardDescription>Used in transactional emails and partner-facing surfaces.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 max-w-xl">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            {field("brand_name", "Brand name", "e.g. Fabric59")}
            {field("brand_logo_url", "Logo URL", "https://…")}
            <div className="space-y-2">
              <Label htmlFor="brand-color">Primary color</Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="brand-color"
                  value={form.brand_primary_color}
                  onChange={(e) => setForm((f) => ({ ...f, brand_primary_color: e.target.value }))}
                  placeholder="#0EA5E9"
                  disabled={!canEdit}
                />
                {form.brand_primary_color && (
                  <div className="h-9 w-9 rounded-md border border-border" style={{ background: form.brand_primary_color }} />
                )}
              </div>
            </div>
            {field("brand_from_email", "From email", "noreply@yourco.com")}
            {field("brand_reply_to", "Reply-to email", "support@yourco.com")}
            {canEdit && (
              <Button onClick={() => save.mutate()} disabled={save.isPending}>
                {save.isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
                Save branding
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
