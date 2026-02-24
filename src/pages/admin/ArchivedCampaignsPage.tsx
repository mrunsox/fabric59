import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useCampaignArchives, type CampaignArchive } from "@/hooks/useCampaignArchive";
import { ArchivedCampaignDetail } from "@/components/campaigns/ArchivedCampaignDetail";
import { Archive, ArrowLeft, Search } from "lucide-react";
import { format } from "date-fns";

export default function ArchivedCampaignsPage() {
  const { data: archives = [], isLoading } = useCampaignArchives();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<CampaignArchive | null>(null);

  const filtered = archives.filter(
    (a) =>
      a.campaign_name.toLowerCase().includes(search.toLowerCase()) ||
      (a.client_name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/admin/campaigns"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Archive className="h-6 w-6" /> Archived Campaigns
            </h1>
            <p className="text-sm text-muted-foreground">Decommissioned campaigns with preserved configurations</p>
          </div>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by campaign or client..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading archives...</p>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Archive className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No archived campaigns</p>
          <p className="text-sm">Campaigns will appear here after being deprovisioned.</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Archived</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((a) => (
                <TableRow
                  key={a.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelected(a)}
                >
                  <TableCell className="font-medium">{a.campaign_name}</TableCell>
                  <TableCell>{a.client_name || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{a.status}</Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(a.archived_at), "MMM d, yyyy")}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          {selected && <ArchivedCampaignDetail archive={selected} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
