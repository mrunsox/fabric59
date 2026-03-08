import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePartners, useCreatePartner, useDeletePartner } from "@/hooks/usePartners";
import { useTenants } from "@/hooks/useTenants";
import { DataTable } from "@/components/ui/data-table";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Partner } from "@/types/database";
import { Building2, Users, Plus, Search, Trash2 } from "lucide-react";
import { format } from "date-fns";

export default function PartnersPage() {
  const { data: partners = [], isLoading } = usePartners();
  const { data: tenants = [] } = useTenants();
  const createPartner = useCreatePartner();
  const deletePartner = useDeletePartner();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deletingPartner, setDeletingPartner] = useState<Partner | null>(null);
  const [newName, setNewName] = useState("");
  const [newSlug, setNewSlug] = useState("");

  const filtered = partners.filter(
    (p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.slug.toLowerCase().includes(search.toLowerCase())
  );

  const clientCountMap = tenants.reduce<Record<string, number>>((acc, t) => {
    if (t.partner_id) {
      acc[t.partner_id] = (acc[t.partner_id] || 0) + 1;
    }
    return acc;
  }, {});

  const totalClients = tenants.length;

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const slug = newSlug.trim() || newName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    await createPartner.mutateAsync({ name: newName.trim(), slug, status: "active" });
    setNewName("");
    setNewSlug("");
    setIsCreateOpen(false);
  };

  const columns = [
    {
      key: "name",
      header: "Partner Name",
      render: (p: Partner) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">{p.name}</p>
            <p className="text-xs text-muted-foreground font-mono">{p.slug}</p>
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (p: Partner) => (
        <StatusBadge variant={p.status === "active" ? "active" : "inactive"} dot>
          {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
        </StatusBadge>
      ),
    },
    {
      key: "clients",
      header: "Clients",
      render: (p: Partner) => (
        <span className="text-sm text-muted-foreground">{clientCountMap[p.id] || 0}</span>
      ),
    },
    {
      key: "created_at",
      header: "Created",
      render: (p: Partner) => (
        <span className="text-sm text-muted-foreground">{format(new Date(p.created_at), "MMM d, yyyy")}</span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (p: Partner) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={(e) => { e.stopPropagation(); setDeletingPartner(p); }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Partners</h1>
          <p className="text-muted-foreground">Manage white-label partners and their client portfolios</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />Add Partner</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[420px]">
            <DialogHeader>
              <DialogTitle>Create New Partner</DialogTitle>
              <DialogDescription>Add a white-label partner under your organization.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Partner Name *</Label>
                <Input placeholder="e.g., Partner A" value={newName} onChange={(e) => setNewName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input placeholder="e.g., partner-a (auto-generated if empty)" value={newSlug} onChange={(e) => setNewSlug(e.target.value)} />
                <p className="text-xs text-muted-foreground">Used in routing headers and API references.</p>
              </div>
              <Button onClick={handleCreate} disabled={createPartner.isPending || !newName.trim()} className="w-full">
                {createPartner.isPending ? "Creating…" : "Create Partner"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Total Partners" value={partners.length} subtitle="Under this organization" icon={Building2} variant="primary" />
        <StatCard title="Total Clients" value={totalClients} subtitle="Across all partners" icon={Users} variant="default" />
        <StatCard title="Active Partners" value={partners.filter((p) => p.status === "active").length} subtitle="Currently operating" icon={Building2} variant="success" />
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search partners..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        keyExtractor={(p) => p.id}
        onRowClick={(p) => navigate(`/admin/partners/${p.id}`)}
        isLoading={isLoading}
        emptyMessage="No partners found. Create your first partner to get started."
      />

      <AlertDialog open={!!deletingPartner} onOpenChange={() => setDeletingPartner(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Partner</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingPartner?.name}"? Clients under this partner will need to be reassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deletingPartner) {
                  deletePartner.mutate(deletingPartner.id);
                  setDeletingPartner(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
