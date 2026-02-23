import { useOrganizations, type OrganizationBranding } from "@/hooks/useOrganizations";
import { useEmailTemplates } from "@/hooks/useEmailTemplates";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Palette, Mail, Image, FileText } from "lucide-react";

interface WhiteLabelPartnerSelectorProps {
  selectedOrgId?: string;
  selectedTemplateId?: string;
  onOrgChange: (orgId: string) => void;
  onTemplateChange: (templateId: string) => void;
}

export function WhiteLabelPartnerSelector({
  selectedOrgId,
  selectedTemplateId,
  onOrgChange,
  onTemplateChange,
}: WhiteLabelPartnerSelectorProps) {
  const { data: orgs = [], isLoading: orgsLoading } = useOrganizations();
  const { data: templates = [], isLoading: templatesLoading } = useEmailTemplates(selectedOrgId);

  const selectedOrg = orgs.find((o) => o.id === selectedOrgId);

  return (
    <div className="space-y-4 p-4 rounded-lg border border-primary/20 bg-primary/5">
      <div className="flex items-center gap-2 text-sm font-medium text-primary">
        <Building2 className="h-4 w-4" />
        White-Label Partner Branding
      </div>

      {/* Partner Selector */}
      <div className="space-y-1.5">
        <Label>Partner Organization</Label>
        <Select
          value={selectedOrgId || "__none__"}
          onValueChange={(v) => {
            onOrgChange(v === "__none__" ? "" : v);
            onTemplateChange("");
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder={orgsLoading ? "Loading..." : "Select partner"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">— Select a partner —</SelectItem>
            {orgs.map((org) => (
              <SelectItem key={org.id} value={org.id}>
                {org.brand_name || org.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Branding Preview Card */}
      {selectedOrg && (
        <Card className="border-border/50">
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Branding Preview
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Brand Name */}
              <div className="flex items-start gap-2">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Brand Name</p>
                  <p className="text-sm font-medium truncate">{selectedOrg.brand_name || selectedOrg.name}</p>
                </div>
              </div>

              {/* Primary Color */}
              <div className="flex items-start gap-2">
                <Palette className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Primary Color</p>
                  <div className="flex items-center gap-2">
                    {selectedOrg.brand_primary_color ? (
                      <>
                        <div
                          className="h-5 w-5 rounded border"
                          style={{ backgroundColor: selectedOrg.brand_primary_color }}
                        />
                        <span className="text-sm font-mono">{selectedOrg.brand_primary_color}</span>
                      </>
                    ) : (
                      <Badge variant="outline" className="text-xs">Not set</Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Logo */}
              <div className="flex items-start gap-2">
                <Image className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Logo</p>
                  {selectedOrg.brand_logo_url ? (
                    <img
                      src={selectedOrg.brand_logo_url}
                      alt="Partner logo"
                      className="h-8 max-w-[120px] object-contain mt-0.5 rounded"
                    />
                  ) : (
                    <Badge variant="outline" className="text-xs">Not set</Badge>
                  )}
                </div>
              </div>

              {/* From Email */}
              <div className="flex items-start gap-2">
                <Mail className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">From Email</p>
                  <p className="text-sm truncate">{selectedOrg.brand_from_email || <Badge variant="outline" className="text-xs">Not set</Badge>}</p>
                </div>
              </div>

              {/* Reply-To */}
              <div className="flex items-start gap-2 sm:col-span-2">
                <Mail className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Reply-To Email</p>
                  <p className="text-sm truncate">{selectedOrg.brand_reply_to || <Badge variant="outline" className="text-xs">Not set</Badge>}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Email Template Selector */}
      {selectedOrgId && (
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Disposition Email Template
          </Label>
          <Select
            value={selectedTemplateId || "__none__"}
            onValueChange={(v) => onTemplateChange(v === "__none__" ? "" : v)}
          >
            <SelectTrigger>
              <SelectValue placeholder={templatesLoading ? "Loading..." : "Select template"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">— Use default —</SelectItem>
              {templates.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name} {t.is_default && "(default)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {templates.length === 0 && !templatesLoading && (
            <p className="text-xs text-muted-foreground">
              No templates found for this partner. Add templates in Settings → Email Templates.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
