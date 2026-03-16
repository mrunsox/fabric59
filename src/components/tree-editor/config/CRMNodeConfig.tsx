import { ScriptNode, CRMConfig } from '@/types/script';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Database, Plus, X, RefreshCw } from 'lucide-react';

interface CRMNodeConfigProps {
  node: ScriptNode;
  onUpdate: (updates: Partial<ScriptNode>) => void;
}

const CRM_PROVIDERS = [
  { value: 'ghl', label: 'GoHighLevel', icon: '🚀' },
  { value: 'salesforce', label: 'Salesforce', icon: '☁️' },
  { value: 'hubspot', label: 'HubSpot', icon: '🔶' },
  { value: 'custom', label: 'Custom API', icon: '⚙️' },
];

const COMMON_FIELDS = [
  'firstName',
  'lastName',
  'email',
  'phone',
  'company',
  'tier',
  'lastContact',
  'accountBalance',
  'notes',
];

export function CRMNodeConfig({ node, onUpdate }: CRMNodeConfigProps) {
  const config = node.crmConfig || { provider: 'ghl', lookupField: 'phone', returnFields: [] };

  const updateConfig = (updates: Partial<CRMConfig>) => {
    onUpdate({
      crmConfig: { ...config, ...updates }
    });
  };

  const toggleField = (field: string) => {
    const newFields = config.returnFields.includes(field)
      ? config.returnFields.filter(f => f !== field)
      : [...config.returnFields, field];
    updateConfig({ returnFields: newFields });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Node Title</Label>
        <Input
          value={node.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="CRM Lookup"
        />
      </div>

      <div className="p-4 rounded-lg bg-node-integration/20 border border-node-integration/30">
        <div className="flex items-center gap-3">
          <Database className="w-8 h-8 text-node-integration" />
          <div>
            <p className="font-medium">Customer Data Lookup</p>
            <p className="text-sm text-muted-foreground">Fetch data before showing content</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>CRM Provider</Label>
        <Select
          value={config.provider}
          onValueChange={(value: CRMConfig['provider']) => updateConfig({ provider: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CRM_PROVIDERS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                <div className="flex items-center gap-2">
                  <span>{p.icon}</span>
                  {p.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Lookup Field</Label>
        <Select
          value={config.lookupField}
          onValueChange={(value) => updateConfig({ lookupField: value })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="phone">Phone Number</SelectItem>
            <SelectItem value="dnis">DNIS</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="accountId">Account ID</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Uses incoming call data to identify customer
        </p>
      </div>

      <div className="space-y-2">
        <Label>Fields to Fetch</Label>
        <div className="flex flex-wrap gap-2">
          {COMMON_FIELDS.map((field) => (
            <button
              key={field}
              className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                config.returnFields.includes(field)
                  ? 'border-node-integration bg-node-integration/20 text-foreground'
                  : 'border-border bg-muted/20 text-muted-foreground hover:border-node-integration/50'
              }`}
              onClick={() => toggleField(field)}
            >
              {field}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Selected fields become variables: $customer_{'{'}fieldName{'}'}
        </p>
      </div>

      <div className="space-y-3 pt-2">
        <Label>Runtime Behavior</Label>
        <div className="flex items-center justify-between p-3 rounded-lg border border-border">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-sm">Show Loading Spinner</p>
              <p className="text-xs text-muted-foreground">Display while fetching data</p>
            </div>
          </div>
          <Switch defaultChecked />
        </div>
      </div>

      {config.provider === 'custom' && (
        <div className="space-y-2 p-3 rounded-lg border border-dashed border-border">
          <Label className="text-xs">Custom API Endpoint</Label>
          <Input placeholder="https://api.example.com/lookup" />
        </div>
      )}
    </div>
  );
}