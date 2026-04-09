import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, ChevronRight, Plug, Megaphone, Shield, Sparkles } from "lucide-react";

const STEPS = [
  { label: "Provider", icon: Plug },
  { label: "Campaigns", icon: Megaphone },
  { label: "Policies", icon: Shield },
  { label: "Checklist", icon: Sparkles },
];

const CAMPAIGN_TYPES = [
  { value: "inbound_intake", label: "Inbound Intake" },
  { value: "consult_booking", label: "Consult Booking" },
  { value: "support_existing_client", label: "Support Existing Client" },
  { value: "callbacks", label: "Callbacks" },
  { value: "after_hours", label: "After Hours" },
  { value: "overflow", label: "Overflow" },
  { value: "vip_intake", label: "VIP Intake" },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName?: string;
  onComplete?: (config: {
    provider: string;
    campaignTypes: string[];
    policyDefaults: { allowContactCreate: boolean; allowMatterCreate: boolean; ambiguousMode: string };
  }) => void;
}

export default function LegalConnectClientSetup({ open, onOpenChange, clientName, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [provider, setProvider] = useState<string>("");
  const [campaignTypes, setCampaignTypes] = useState<string[]>([]);
  const [allowContactCreate, setAllowContactCreate] = useState(true);
  const [allowMatterCreate, setAllowMatterCreate] = useState(false);
  const [ambiguousMode, setAmbiguousMode] = useState("review");

  const canNext = step === 0 ? !!provider : step === 1 ? campaignTypes.length > 0 : true;

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      onComplete?.({ provider, campaignTypes, policyDefaults: { allowContactCreate, allowMatterCreate, ambiguousMode } });
      onOpenChange(false);
      setStep(0);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Set Up Legal Connect{clientName ? ` — ${clientName}` : ""}</DialogTitle>
          <DialogDescription>Configure integration for this client in 4 steps</DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-2 mb-4">
          {STEPS.map((s, i) => (
            <div key={s.label} className="flex items-center gap-1.5">
              <div className={`flex items-center justify-center h-7 w-7 rounded-full text-xs font-bold ${
                i < step ? "bg-primary text-primary-foreground" : i === step ? "bg-primary/20 text-primary border border-primary/40" : "bg-muted text-muted-foreground"
              }`}>
                {i < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              <span className={`text-xs ${i === step ? "text-foreground font-medium" : "text-muted-foreground"}`}>{s.label}</span>
              {i < STEPS.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
            </div>
          ))}
        </div>

        {/* Step content */}
        {step === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Select the CRM provider for this client.</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: "clio", label: "Clio", desc: "Full OAuth + webhooks" },
                { value: "mycase", label: "MyCase", desc: "Capability-aware API" },
              ].map((p) => (
                <Card
                  key={p.value}
                  className={`cursor-pointer transition-colors ${provider === p.value ? "border-primary bg-primary/5" : "hover:border-muted-foreground/30"}`}
                  onClick={() => setProvider(p.value)}
                >
                  <CardContent className="p-4">
                    <h4 className="text-sm font-semibold text-foreground">{p.label}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{p.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Which Five9 campaign types will this client use?</p>
            <div className="grid grid-cols-2 gap-2">
              {CAMPAIGN_TYPES.map((ct) => (
                <label key={ct.value} className="flex items-center gap-2 p-2 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
                  <Checkbox
                    checked={campaignTypes.includes(ct.value)}
                    onCheckedChange={(checked) => {
                      setCampaignTypes(checked ? [...campaignTypes, ct.value] : campaignTypes.filter((v) => v !== ct.value));
                    }}
                  />
                  <span className="text-sm text-foreground">{ct.label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Set default policy rules for this client.</p>
            <div className="space-y-3">
              <label className="flex items-center gap-2">
                <Checkbox checked={allowContactCreate} onCheckedChange={(v) => setAllowContactCreate(!!v)} />
                <span className="text-sm text-foreground">Allow automatic contact creation</span>
              </label>
              <label className="flex items-center gap-2">
                <Checkbox checked={allowMatterCreate} onCheckedChange={(v) => setAllowMatterCreate(!!v)} />
                <span className="text-sm text-foreground">Allow automatic matter/case creation</span>
              </label>
              <div className="space-y-1.5">
                <Label className="text-sm">Ambiguous match behavior</Label>
                <Select value={ambiguousMode} onValueChange={setAmbiguousMode}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="review">Send to review queue</SelectItem>
                    <SelectItem value="best_match">Use best match</SelectItem>
                    <SelectItem value="block">Block action</SelectItem>
                    <SelectItem value="create_new">Create new contact</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Review your configuration before generating the setup checklist.</p>
            <Card>
              <CardContent className="p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Provider</span><Badge variant="outline" className="capitalize">{provider}</Badge></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Campaign types</span><span className="text-foreground">{campaignTypes.length} selected</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Auto-create contacts</span><span>{allowContactCreate ? "Yes" : "No"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Auto-create matters</span><span>{allowMatterCreate ? "Yes" : "No"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Ambiguous matches</span><Badge variant="outline" className="text-xs">{ambiguousMode.replace(/_/g, " ")}</Badge></div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="flex justify-between pt-2">
          <Button variant="ghost" size="sm" onClick={() => step > 0 ? setStep(step - 1) : onOpenChange(false)}>
            {step > 0 ? "Back" : "Cancel"}
          </Button>
          <Button size="sm" onClick={handleNext} disabled={!canNext}>
            {step === 3 ? "Generate Checklist" : "Next"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
