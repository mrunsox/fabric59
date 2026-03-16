import { ScriptNode, PaymentConfig } from '@/types/script';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, Shield, AlertCircle } from 'lucide-react';

interface PaymentNodeConfigProps {
  node: ScriptNode;
  onUpdate: (updates: Partial<ScriptNode>) => void;
  variables?: { name: string }[];
}

export function PaymentNodeConfig({ node, onUpdate, variables = [] }: PaymentNodeConfigProps) {
  const config: PaymentConfig = node.paymentConfig || {
    providerId: '',
    amountVariable: '',
    currency: 'USD',
    description: ''
  };

  const updateConfig = (updates: Partial<PaymentConfig>) => {
    onUpdate({ paymentConfig: { ...config, ...updates } });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <CreditCard className="w-4 h-4" />
        <span className="text-sm">Configure payment collection</span>
      </div>

      <div className="space-y-2">
        <Label>Title</Label>
        <Input
          value={node.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Payment node title"
        />
      </div>

      <div className="space-y-2">
        <Label>Payment Provider</Label>
        <Select 
          value={config.providerId} 
          onValueChange={(v) => updateConfig({ providerId: v })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select provider from Integrations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="stripe">Stripe</SelectItem>
            <SelectItem value="paypal">PayPal</SelectItem>
            <SelectItem value="square">Square</SelectItem>
            <SelectItem value="authorize">Authorize.net</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Configure providers in Settings → Integrations
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Amount Variable</Label>
          <Select 
            value={config.amountVariable} 
            onValueChange={(v) => updateConfig({ amountVariable: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select variable" />
            </SelectTrigger>
            <SelectContent>
              {variables.map(v => (
                <SelectItem key={v.name} value={v.name}>${v.name}</SelectItem>
              ))}
              <SelectItem value="payment_amount">$payment_amount</SelectItem>
              <SelectItem value="deposit_amount">$deposit_amount</SelectItem>
              <SelectItem value="total_due">$total_due</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Currency</Label>
          <Select 
            value={config.currency} 
            onValueChange={(v) => updateConfig({ currency: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD ($)</SelectItem>
              <SelectItem value="EUR">EUR (€)</SelectItem>
              <SelectItem value="GBP">GBP (£)</SelectItem>
              <SelectItem value="CAD">CAD ($)</SelectItem>
              <SelectItem value="AUD">AUD ($)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Payment Description</Label>
        <Input
          value={config.description}
          onChange={(e) => updateConfig({ description: e.target.value })}
          placeholder="Service deposit - $customer_name"
        />
        <p className="text-xs text-muted-foreground">
          Shown on customer receipt. Supports $variables.
        </p>
      </div>

      <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
        <Shield className="w-4 h-4 text-emerald-500 shrink-0" />
        <div className="text-xs text-emerald-600 dark:text-emerald-400">
          <p className="font-medium">PCI DSS Compliant</p>
          <p>Card data is processed via secure provider iframe. No sensitive data stored.</p>
        </div>
      </div>

      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex gap-2">
        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-600 dark:text-amber-400">
          <p className="font-medium">SOC2 Compliance</p>
          <p>Payment processing meets SOC2 Type II standards for data security.</p>
        </div>
      </div>

      <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
        <p className="text-xs text-primary">
          <span className="font-medium">Stored Variables:</span> $payment_status, $payment_id, $payment_amount
        </p>
      </div>
    </div>
  );
}
