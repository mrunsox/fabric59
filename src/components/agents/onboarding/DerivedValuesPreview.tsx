import { useState } from "react";
import { Pencil, Check, X, RefreshCw, Copy, Mail, User, Phone, Hash, Key, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface DerivedValues {
  email: string;
  five9Username: string;
  extension: string;
  password: string;
  slackChannels: string[];
}

interface DerivedValuesPreviewProps {
  values: DerivedValues;
  onChange: (values: DerivedValues) => void;
  onRegeneratePassword: () => void;
  extensionLoading?: boolean;
  extensionConflict?: string | null;
}

interface EditableRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  fieldKey: string;
  onSave: (key: string, value: string) => void;
  mono?: boolean;
  suffix?: React.ReactNode;
}

function EditableRow({ icon, label, value, fieldKey, onSave, mono, suffix }: EditableRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const save = () => { onSave(fieldKey, draft); setEditing(false); };
  const cancel = () => { setDraft(value); setEditing(false); };

  if (editing) {
    return (
      <div className="flex items-center gap-2 py-1.5">
        <span className="text-muted-foreground w-5 flex justify-center">{icon}</span>
        <span className="text-xs text-muted-foreground w-24 shrink-0">{label}</span>
        <Input value={draft} onChange={e => setDraft(e.target.value)} className="h-7 text-xs flex-1" autoFocus />
        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={save}><Check className="h-3 w-3 text-success" /></Button>
        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={cancel}><X className="h-3 w-3" /></Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 py-1.5 group">
      <span className="text-muted-foreground w-5 flex justify-center">{icon}</span>
      <span className="text-xs text-muted-foreground w-24 shrink-0">{label}</span>
      <span className={`text-sm flex-1 truncate ${mono ? 'font-mono' : ''}`}>{value || '—'}</span>
      {suffix}
      <Button type="button" variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => { setDraft(value); setEditing(true); }}>
        <Pencil className="h-3 w-3" />
      </Button>
    </div>
  );
}

export function DerivedValuesPreview({ values, onChange, onRegeneratePassword, extensionLoading, extensionConflict }: DerivedValuesPreviewProps) {
  const [copiedPassword, setCopiedPassword] = useState(false);

  const handleSave = (key: string, value: string) => {
    onChange({ ...values, [key]: value });
  };

  const copyPassword = () => {
    navigator.clipboard.writeText(values.password);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2000);
  };

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-0.5">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Auto-Generated Values</h4>
      </div>

      <EditableRow
        icon={<Mail className="h-3.5 w-3.5" />}
        label="Email"
        value={values.email}
        fieldKey="email"
        onSave={handleSave}
      />
      <EditableRow
        icon={<User className="h-3.5 w-3.5" />}
        label="Five9 User"
        value={values.five9Username}
        fieldKey="five9Username"
        onSave={handleSave}
      />
      <EditableRow
        icon={<Phone className="h-3.5 w-3.5" />}
        label="Extension"
        value={extensionLoading ? 'Finding...' : values.extension}
        fieldKey="extension"
        onSave={handleSave}
        suffix={extensionConflict ? <span className="text-xs text-destructive">{extensionConflict}</span> : null}
      />

      <div className="flex items-center gap-2 py-1.5 group">
        <span className="text-muted-foreground w-5 flex justify-center"><Key className="h-3.5 w-3.5" /></span>
        <span className="text-xs text-muted-foreground w-24 shrink-0">Password</span>
        <code className="text-xs font-mono flex-1 truncate">{values.password}</code>
        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={copyPassword}>
          {copiedPassword ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
        </Button>
        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={onRegeneratePassword}>
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>

      {values.slackChannels.length > 0 && (
        <div className="flex items-center gap-2 py-1.5">
          <span className="text-muted-foreground w-5 flex justify-center"><MessageSquare className="h-3.5 w-3.5" /></span>
          <span className="text-xs text-muted-foreground w-24 shrink-0">Slack</span>
          <div className="flex flex-wrap gap-1 flex-1">
            {values.slackChannels.map(ch => (
              <Badge key={ch} variant="outline" className="text-xs">{ch}</Badge>
            ))}
          </div>
        </div>
      )}

      {extensionConflict && (
        <div className="flex items-center gap-2 pt-2">
          <Hash className="h-3.5 w-3.5 text-destructive" />
          <span className="text-xs text-destructive">{extensionConflict}</span>
        </div>
      )}
    </div>
  );
}
