import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { RefreshCw, Copy, Check, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { AGENT_ROLES, AgentRole, ProvisioningInput } from "@/types/provisioning";
import { useAppConfig } from "@/hooks/useAppConfig";
import { supabase } from "@/integrations/supabase/client";

const schema = z.object({
  agentName: z.string().min(2, "Enter full name"),
  emailHandle: z.string().min(1, "Enter email handle"),
  five9Username: z.string().min(2, "Enter Five9 username"),
  roleId: z.string().min(1, "Select a role"),
  extension: z.string().regex(/^\d+$/, "Must be a number"),
  externalEmail: z.string().email("Enter valid email"),
  skills: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  return Array.from({ length: 14 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

interface ProvisioningFormProps {
  onSubmit: (input: ProvisioningInput) => Promise<void>;
  isLoading: boolean;
}

export function ProvisioningForm({ onSubmit, isLoading }: ProvisioningFormProps) {
  const { emailDomain } = useAppConfig();
  const [password, setPassword] = useState(() => generatePassword());
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [extensionConflict, setExtensionConflict] = useState<string | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [loadingSkills, setLoadingSkills] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { agentName: '', emailHandle: '', five9Username: '', roleId: '', extension: '', externalEmail: '', skills: '' },
  });

  const selectedRoleId = form.watch('roleId');
  const selectedRole = AGENT_ROLES.find(r => r.id === selectedRoleId);
  const extension = form.watch('extension');

  // Load Five9 skills
  useEffect(() => {
    const loadSkills = async () => {
      setLoadingSkills(true);
      try {
        const { data } = await supabase.functions.invoke('five9-provisioning', { body: { action: 'getSkills' } });
        if (data?.success) setSkills(data.skills || []);
      } catch { /* ignore */ }
      setLoadingSkills(false);
    };
    loadSkills();
  }, []);

  // Extension conflict check
  useEffect(() => {
    if (!extension || extension.length < 2) { setExtensionConflict(null); return; }
    const timer = setTimeout(async () => {
      try {
        const { data } = await supabase.functions.invoke('five9-provisioning', { body: { action: 'getExtensions' } });
        if (data?.success && data.extensions?.includes(extension)) {
          setExtensionConflict(`Extension ${extension} is already in use`);
        } else {
          setExtensionConflict(null);
        }
      } catch { setExtensionConflict(null); }
    }, 600);
    return () => clearTimeout(timer);
  }, [extension]);

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(password);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2000);
  };

  const handleSubmit = async (values: FormValues) => {
    const role = AGENT_ROLES.find(r => r.id === values.roleId)!;
    const skillsList = values.skills ? values.skills.split(',').map(s => s.trim()).filter(Boolean) : [];
    await onSubmit({
      agentName: values.agentName,
      emailHandle: `${values.emailHandle}@${emailDomain}`,
      five9Username: values.five9Username,
      role,
      extension: parseInt(values.extension, 10),
      externalEmail: values.externalEmail,
      password,
      skills: skillsList,
    });
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="text-sm font-semibold text-foreground mb-4">New Agent Details</h3>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          <FormField control={form.control} name="agentName" render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl><Input placeholder="Jane Smith" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="emailHandle" render={({ field }) => (
            <FormItem>
              <FormLabel>Email Handle</FormLabel>
              <FormControl>
                <div className="flex">
                  <Input placeholder="jane.smith" className="rounded-r-none" {...field} />
                  <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-border bg-muted text-muted-foreground text-sm">
                    @{emailDomain}
                  </span>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="five9Username" render={({ field }) => (
            <FormItem>
              <FormLabel>Five9 Username <span className="text-muted-foreground font-normal">(e.g. Jane S)</span></FormLabel>
              <FormControl><Input placeholder="Jane S" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="roleId" render={({ field }) => (
            <FormItem>
              <FormLabel>Role</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Select role..." /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  {AGENT_ROLES.map(role => (
                    <SelectItem key={role.id} value={role.id}>
                      <div>
                        <span className="font-medium">{role.name}</span>
                        <span className="text-muted-foreground ml-2 text-xs">{role.extensionRangeStart}–{role.extensionRangeEnd}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="extension" render={({ field }) => (
            <FormItem>
              <FormLabel>Extension {selectedRole && <span className="text-muted-foreground font-normal">({selectedRole.extensionRangeStart}–{selectedRole.extensionRangeEnd})</span>}</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input placeholder="1001" {...field} />
                  {extensionConflict && (
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    </div>
                  )}
                </div>
              </FormControl>
              {extensionConflict && <p className="text-xs text-destructive">{extensionConflict}</p>}
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="skills" render={({ field }) => (
            <FormItem>
              <FormLabel>Skills <span className="text-muted-foreground font-normal">(comma-separated)</span></FormLabel>
              <FormControl>
                <Input
                  placeholder={loadingSkills ? "Loading skills..." : skills.length > 0 ? skills.slice(0, 3).join(', ') + '...' : "e.g. English, Billing"}
                  {...field}
                />
              </FormControl>
              {skills.length > 0 && (
                <p className="text-xs text-muted-foreground">Available: {skills.slice(0, 5).join(', ')}{skills.length > 5 ? ` +${skills.length - 5} more` : ''}</p>
              )}
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="externalEmail" render={({ field }) => (
            <FormItem>
              <FormLabel>External Email <span className="text-muted-foreground font-normal">(for credential delivery)</span></FormLabel>
              <FormControl><Input placeholder="jane@personal.com" type="email" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          {/* Password field */}
          <div className="space-y-1.5">
            <Label>Generated Password</Label>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
                <code className="text-sm font-mono text-foreground flex-1 truncate">{password}</code>
              </div>
              <Button type="button" variant="outline" size="icon" onClick={handleCopyPassword}>
                {copiedPassword ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button type="button" variant="outline" size="icon" onClick={() => setPassword(generatePassword())}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading || !!extensionConflict}>
            {isLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Provisioning...</> : 'Provision Agent'}
          </Button>
        </form>
      </Form>
    </div>
  );
}
