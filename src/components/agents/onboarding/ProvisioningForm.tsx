import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Zap, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { AGENT_ROLES, ProvisioningInput } from "@/types/provisioning";
import { useAppConfig } from "@/hooks/useAppConfig";
import { supabase } from "@/integrations/supabase/client";
import { deriveEmailHandle, deriveFive9Username, generatePassword } from "@/lib/agent-naming";
import { SkillsMultiSelect } from "./SkillsMultiSelect";
import { DerivedValuesPreview } from "./DerivedValuesPreview";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const quickSchema = z.object({
  agentName: z.string().min(2, "Enter full name"),
  roleId: z.string().min(1, "Select a role"),
  externalEmail: z.string().email("Enter valid email"),
});

const advancedSchema = z.object({
  agentName: z.string().min(2, "Enter full name"),
  emailHandle: z.string().min(1, "Enter email handle"),
  five9Username: z.string().min(2, "Enter Five9 username"),
  roleId: z.string().min(1, "Select a role"),
  extension: z.string().regex(/^\d+$/, "Must be a number"),
  externalEmail: z.string().email("Enter valid email"),
});

interface ProvisioningFormProps {
  onSubmit: (input: ProvisioningInput) => Promise<void>;
  isLoading: boolean;
  findNextExtension?: (role: typeof AGENT_ROLES[0]) => Promise<number | null>;
}

export function ProvisioningForm({ onSubmit, isLoading, findNextExtension }: ProvisioningFormProps) {
  const { emailDomain } = useAppConfig();
  const [quickMode, setQuickMode] = useState(true);
  const [password, setPassword] = useState(() => generatePassword());
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [availableSkills, setAvailableSkills] = useState<string[]>([]);
  const [loadingSkills, setLoadingSkills] = useState(false);
  const [platforms, setPlatforms] = useState({ google: true, five9: true, slack: true });
  const [recentEmails, setRecentEmails] = useState<string[]>([]);
  const [emailComboOpen, setEmailComboOpen] = useState(false);

  // Quick mode derived values
  const [derivedEmail, setDerivedEmail] = useState("");
  const [derivedFive9, setDerivedFive9] = useState("");
  const [derivedExtension, setDerivedExtension] = useState("");
  const [derivedSlackChannels, setDerivedSlackChannels] = useState<string[]>([]);
  const [extensionLoading, setExtensionLoading] = useState(false);
  const [extensionConflict, setExtensionConflict] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(quickMode ? quickSchema : advancedSchema),
    defaultValues: { agentName: '', emailHandle: '', five9Username: '', roleId: '', extension: '', externalEmail: '' },
  });

  const agentName = form.watch('agentName');
  const selectedRoleId = form.watch('roleId');
  const selectedRole = AGENT_ROLES.find(r => r.id === selectedRoleId);

  // Load skills
  useEffect(() => {
    const loadSkills = async () => {
      setLoadingSkills(true);
      try {
        const { data } = await supabase.functions.invoke('five9-provisioning', { body: { action: 'getSkills' } });
        if (data?.success) setAvailableSkills(data.skills || []);
      } catch { /* ignore */ }
      setLoadingSkills(false);
    };
    loadSkills();
  }, []);

  // Load recent external emails from audit logs
  useEffect(() => {
    const loadRecent = async () => {
      const { data } = await db
        .from('audit_logs')
        .select('details')
        .eq('action', 'agent_provisioned')
        .order('created_at', { ascending: false })
        .limit(20);
      if (data) {
        const emails = new Set<string>();
        for (const row of data) {
          const d = row.details as Record<string, unknown>;
          if (d?.externalEmail && typeof d.externalEmail === 'string') emails.add(d.externalEmail);
        }
        setRecentEmails(Array.from(emails));
      }
    };
    loadRecent();
  }, []);

  // Auto-derive values in quick mode
  const deriveAll = useCallback((name: string, roleId: string) => {
    if (!name || name.trim().split(/\s+/).length < 2) {
      setDerivedEmail(''); setDerivedFive9(''); setDerivedSlackChannels([]);
      return;
    }
    setDerivedEmail(`${deriveEmailHandle(name)}@${emailDomain}`);
    setDerivedFive9(deriveFive9Username(name));
    const role = AGENT_ROLES.find(r => r.id === roleId);
    setDerivedSlackChannels(role?.slackChannels || []);
  }, [emailDomain]);

  useEffect(() => {
    if (quickMode) deriveAll(agentName, selectedRoleId);
  }, [agentName, selectedRoleId, quickMode, deriveAll]);

  // Auto-find extension when role changes in quick mode
  useEffect(() => {
    if (!quickMode || !selectedRole || !findNextExtension) return;
    let cancelled = false;
    setExtensionLoading(true);
    setExtensionConflict(null);
    findNextExtension(selectedRole).then(ext => {
      if (cancelled) return;
      setDerivedExtension(ext !== null ? String(ext) : '');
      if (ext === null) setExtensionConflict('No available extensions in range');
      setExtensionLoading(false);
    });
    return () => { cancelled = true; };
  }, [selectedRole, quickMode, findNextExtension]);

  // Extension conflict check (advanced mode)
  const advExtension = form.watch('extension');
  useEffect(() => {
    if (quickMode || !advExtension || advExtension.length < 2) { setExtensionConflict(null); return; }
    const timer = setTimeout(async () => {
      try {
        const { data } = await supabase.functions.invoke('five9-provisioning', { body: { action: 'getExtensions' } });
        if (data?.success && data.extensions?.includes(advExtension)) {
          setExtensionConflict(`Extension ${advExtension} is already in use`);
        } else { setExtensionConflict(null); }
      } catch { setExtensionConflict(null); }
    }, 600);
    return () => clearTimeout(timer);
  }, [advExtension, quickMode]);

  const handleSubmit = async (values: Record<string, string>) => {
    const role = AGENT_ROLES.find(r => r.id === values.roleId)!;
    const email = quickMode ? derivedEmail : `${values.emailHandle}@${emailDomain}`;
    const five9Username = quickMode ? derivedFive9 : values.five9Username;
    const extension = quickMode ? parseInt(derivedExtension, 10) : parseInt(values.extension, 10);

    await onSubmit({
      agentName: values.agentName,
      emailHandle: email,
      five9Username,
      role,
      extension,
      externalEmail: values.externalEmail,
      password,
      skills: selectedSkills,
    });
  };

  const handleDerivedChange = (updated: { email: string; five9Username: string; extension: string; password: string; slackChannels: string[] }) => {
    setDerivedEmail(updated.email);
    setDerivedFive9(updated.five9Username);
    setDerivedExtension(updated.extension);
    if (updated.password !== password) setPassword(updated.password);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      {/* Mode Toggle */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-foreground">New Agent Details</h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => setQuickMode(!quickMode)}
        >
          {quickMode ? <><Settings2 className="h-3.5 w-3.5" /> Advanced Mode</> : <><Zap className="h-3.5 w-3.5" /> Quick Mode</>}
        </Button>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {/* Full Name — always shown */}
          <FormField control={form.control} name="agentName" render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl><Input placeholder="John Smith" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          {/* Quick Mode: Platform checkboxes */}
          {quickMode && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Platforms</label>
              <div className="flex items-center gap-4">
                {([['google', 'Google Workspace'], ['five9', 'Five9'], ['slack', 'Slack']] as const).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={platforms[key]}
                      onCheckedChange={(c) => setPlatforms(prev => ({ ...prev, [key]: !!c }))}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Role — always shown */}
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
                      <span className="font-medium">{role.name}</span>
                      <span className="text-muted-foreground ml-2 text-xs">{role.extensionRangeStart}–{role.extensionRangeEnd}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />

          {/* Quick Mode: Derived Values Preview */}
          {quickMode && agentName && agentName.trim().split(/\s+/).length >= 2 && selectedRoleId && (
            <DerivedValuesPreview
              values={{
                email: derivedEmail,
                five9Username: derivedFive9,
                extension: derivedExtension,
                password,
                slackChannels: derivedSlackChannels,
              }}
              onChange={handleDerivedChange}
              onRegeneratePassword={() => setPassword(generatePassword())}
              extensionLoading={extensionLoading}
              extensionConflict={extensionConflict}
            />
          )}

          {/* Advanced Mode: manual fields */}
          {!quickMode && (
            <>
              <FormField control={form.control} name="emailHandle" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Handle</FormLabel>
                  <FormControl>
                    <div className="flex">
                      <Input placeholder="johns" className="rounded-r-none" {...field} />
                      <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-border bg-muted text-muted-foreground text-sm">@{emailDomain}</span>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="five9Username" render={({ field }) => (
                <FormItem>
                  <FormLabel>Five9 Username</FormLabel>
                  <FormControl><Input placeholder="John S" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="extension" render={({ field }) => (
                <FormItem>
                  <FormLabel>Extension {selectedRole && <span className="text-muted-foreground font-normal">({selectedRole.extensionRangeStart}–{selectedRole.extensionRangeEnd})</span>}</FormLabel>
                  <FormControl><Input placeholder="1001" {...field} /></FormControl>
                  {extensionConflict && <p className="text-xs text-destructive">{extensionConflict}</p>}
                  <FormMessage />
                </FormItem>
              )} />
            </>
          )}

          {/* Skills — always shown */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Skills</label>
            <SkillsMultiSelect
              availableSkills={availableSkills}
              selectedSkills={selectedSkills}
              onChange={setSelectedSkills}
              loading={loadingSkills}
            />
          </div>

          {/* External Email — combobox with recent suggestions */}
          <FormField control={form.control} name="externalEmail" render={({ field }) => (
            <FormItem>
              <FormLabel>External Email <span className="text-muted-foreground font-normal">(for credential delivery)</span></FormLabel>
              <Popover open={emailComboOpen} onOpenChange={setEmailComboOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Input
                      placeholder="jane@personal.com"
                      type="email"
                      {...field}
                      onFocus={() => recentEmails.length > 0 && setEmailComboOpen(true)}
                    />
                  </FormControl>
                </PopoverTrigger>
                {recentEmails.length > 0 && (
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start" onOpenAutoFocus={e => e.preventDefault()}>
                    <Command>
                      <CommandInput placeholder="Search recent emails..." />
                      <CommandList>
                        <CommandEmpty>No recent emails</CommandEmpty>
                        <CommandGroup heading="Recent">
                          {recentEmails.map(email => (
                            <CommandItem key={email} value={email} onSelect={() => { field.onChange(email); setEmailComboOpen(false); }}>
                              {email}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                )}
              </Popover>
              <FormMessage />
            </FormItem>
          )} />

          <Button type="submit" className="w-full" disabled={isLoading || !!extensionConflict || (quickMode && extensionLoading)}>
            {isLoading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Provisioning...</> : quickMode ? '⚡ Quick Provision' : 'Provision Agent'}
          </Button>
        </form>
      </Form>
    </div>
  );
}
