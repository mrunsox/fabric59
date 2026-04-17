import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, QrCode, Trash2, Phone } from "lucide-react";
import { SEOHead } from "@/components/seo/SEOHead";
import { PageHeader } from "@/components/ui/page-header";
import {
  useQrDidMappings,
  useUpsertQrDidMapping,
  useDeleteQrDidMapping,
  type QrDidMapping,
} from "@/hooks/useQrDidMappings";

export default function QrRoutingPage() {
  const { data: mappings, isLoading } = useQrDidMappings();
  const upsert = useUpsertQrDidMapping();
  const remove = useDeleteQrDidMapping();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<QrDidMapping>>({
    did_phone: "",
    source_channel: "qr_code",
    campaign_label: "",
    destination_queue: "",
    is_active: true,
  });

  const reset = () => {
    setForm({ did_phone: "", source_channel: "qr_code", campaign_label: "", destination_queue: "", is_active: true });
  };

  const handleSave = async () => {
    if (!form.did_phone) return;
    await upsert.mutateAsync(form as any);
    setOpen(false);
    reset();
  };

  return (
    <>
      <SEOHead
        title="QR Code Inbound Routing | Fabric59"
        description="Map QR code DIDs to tenant callback routing for source channel tracking."
      />

      <div className="space-y-6">
        <PageHeader
          title="QR Code Inbound Routing"
          subtitle="Route inbound QR-code calls to the right tenant queue and tag them for analytics"
          icon={
            <div className="rounded-xl bg-primary/10 p-2.5">
              <QrCode className="h-5 w-5 text-primary" />
            </div>
          }
        >
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                New Mapping
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add QR Routing Mapping</DialogTitle>
                <DialogDescription>
                  Connect a DID phone number to a destination queue. Inbound calls will be tagged with the source channel for reporting.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="did_phone">DID Phone (E.164)</Label>
                  <Input
                    id="did_phone"
                    placeholder="+15551234567"
                    value={form.did_phone ?? ""}
                    onChange={(e) => setForm({ ...form, did_phone: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="campaign_label">Campaign label</Label>
                  <Input
                    id="campaign_label"
                    placeholder="Spring intake QR"
                    value={form.campaign_label ?? ""}
                    onChange={(e) => setForm({ ...form, campaign_label: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="destination_queue">Destination queue</Label>
                  <Input
                    id="destination_queue"
                    placeholder="legal-intake-q"
                    value={form.destination_queue ?? ""}
                    onChange={(e) => setForm({ ...form, destination_queue: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="source_channel">Source channel</Label>
                  <Input
                    id="source_channel"
                    placeholder="qr_code"
                    value={form.source_channel ?? "qr_code"}
                    onChange={(e) => setForm({ ...form, source_channel: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="is_active"
                    checked={form.is_active ?? true}
                    onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                  />
                  <Label htmlFor="is_active">Active</Label>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button onClick={handleSave} disabled={upsert.isPending || !form.did_phone}>
                    {upsert.isPending ? "Saving..." : "Save mapping"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </PageHeader>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Active mappings</CardTitle>
            <CardDescription>
              Each row maps an inbound DID to a destination queue. Calls hitting these numbers are stamped with source_channel for billing and reporting.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead className="text-foreground/80">DID</TableHead>
                  <TableHead className="text-foreground/80">Campaign</TableHead>
                  <TableHead className="text-foreground/80">Destination Queue</TableHead>
                  <TableHead className="text-foreground/80">Source</TableHead>
                  <TableHead className="text-foreground/80">Status</TableHead>
                  <TableHead className="text-foreground/80 w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Loading...</TableCell>
                  </TableRow>
                ) : !mappings || mappings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                      <QrCode className="h-6 w-6 mx-auto mb-2" />
                      No QR routing mappings yet. Add one to begin tracking inbound QR calls.
                    </TableCell>
                  </TableRow>
                ) : (
                  mappings.map((m) => (
                    <TableRow key={m.id} className="border-border">
                      <TableCell className="font-mono text-sm flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        {m.did_phone}
                      </TableCell>
                      <TableCell className="text-foreground">{m.campaign_label || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{m.destination_queue || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{m.source_channel}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            m.is_active
                              ? "bg-success/15 text-success border-success/30"
                              : "bg-muted text-muted-foreground border-border"
                          }
                        >
                          {m.is_active ? "active" : "inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => remove.mutate(m.id)}
                          disabled={remove.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
