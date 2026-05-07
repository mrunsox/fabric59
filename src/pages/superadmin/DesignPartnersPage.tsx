import { Link } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sparkles, ExternalLink, Users } from "lucide-react";
import { useDesignPartners, ROLLOUT_LABEL, type RolloutStatus } from "@/hooks/useDesignPartner";
import { usePilotApprovalList } from "@/hooks/usePilotApproval";
import { PILOT_CHECKLIST, PILOT_STATUS_LABEL, PILOT_TEMPLATES, computePilotReadiness, type PilotStatus } from "@/data/legal-connect-pilot";
import { SEOHead } from "@/components/seo/SEOHead";
import { cn } from "@/lib/utils";

const STATUS_BADGE: Record<RolloutStatus, string> = {
  not_started: "bg-muted text-muted-foreground border-border",
  onboarding_in_progress: "bg-warning/15 text-warning border-warning/30",
  testing: "bg-warning/15 text-warning border-warning/30",
  ready_for_live: "bg-primary/15 text-primary border-primary/30",
  live_pilot: "bg-primary/15 text-primary border-primary/30",
  live_steady: "bg-success/15 text-success border-success/30",
  paused: "bg-destructive/15 text-destructive border-destructive/30",
};

const READINESS_BADGE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  setup_in_progress: "bg-warning/15 text-warning border-warning/30",
  test_passed: "bg-primary/15 text-primary border-primary/30",
  ready_for_live: "bg-primary/15 text-primary border-primary/30",
  live: "bg-success/15 text-success border-success/30",
  paused: "bg-destructive/15 text-destructive border-destructive/30",
};

export default function DesignPartnersPage() {
  const { data: partners = [], isLoading } = useDesignPartners();

  return (
    <>
      <SEOHead title="Design Partners | Superadmin" description="Track first-rollout design partners" />
      <div className="space-y-6 animate-fade-in">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-semibold tracking-tight">Design Partners</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            First-rollout clients we are piloting Legal Connect with. Stage and readiness reflect each tenant's
            progress toward live traffic.
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Partners ({partners.length})
            </CardTitle>
            <CardDescription className="text-xs">
              Toggle the design partner flag on a client's Legal Connect → Readiness tab to add them here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : partners.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  No design partners yet. Mark a client as a design partner to start tracking rollout here.
                </p>
              </div>
            ) : (
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Rollout stage</TableHead>
                      <TableHead>Readiness</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Last update</TableHead>
                      <TableHead className="text-right">Open</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {partners.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="font-medium text-sm">{p.name}</div>
                          {p.design_partner_notes.constraints && (
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {p.design_partner_notes.constraints}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("capitalize", STATUS_BADGE[p.rollout_status])}>
                            {ROLLOUT_LABEL[p.rollout_status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn("capitalize", READINESS_BADGE[p.readiness_state] ?? READINESS_BADGE.draft)}
                          >
                            {p.readiness_state.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {p.design_partner_notes.contact_name ? (
                            <div>
                              <div>{p.design_partner_notes.contact_name}</div>
                              {p.design_partner_notes.contact_email && (
                                <div className="text-muted-foreground">
                                  {p.design_partner_notes.contact_email}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {p.readiness_updated_at
                            ? new Date(p.readiness_updated_at).toLocaleDateString()
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild size="sm" variant="outline">
                            <Link to={`/admin/clients/${p.id}/legal-connect?tab=readiness`}>
                              Open <ExternalLink className="h-3 w-3 ml-1.5" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
