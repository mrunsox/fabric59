import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquarePlus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateFeedbackEntry } from "@/hooks/useLegalConnectFeedback";
import { FEEDBACK_TYPES, FEEDBACK_TOPICS } from "@/data/legal-connect-feedback";

interface Props {
  clientId?: string;
  organizationId?: string;
  source?: string;
  triggerLabel?: string;
  triggerVariant?: "default" | "outline" | "ghost";
}

export default function FeedbackDialog({
  clientId,
  organizationId,
  source = "in_product",
  triggerLabel = "Share feedback",
  triggerVariant = "outline",
}: Props) {
  const { user, organization } = useAuth();
  const orgId = organizationId ?? organization?.id ?? "";
  const create = useCreateFeedbackEntry();

  const [open, setOpen] = useState(false);
  const [type, setType] = useState<string>("idea");
  const [topic, setTopic] = useState<string>("general");
  const [message, setMessage] = useState("");

  const submit = async () => {
    if (!message.trim() || !orgId) return;
    await create.mutateAsync({
      organization_id: orgId,
      client_id: clientId ?? null,
      source,
      topic,
      entry_type: type,
      message: message.trim(),
      logged_by: user?.id ?? null,
      logged_by_name: user?.email ?? null,
    });
    setMessage("");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} size="sm" className="gap-1.5">
          <MessageSquarePlus className="h-3.5 w-3.5" /> {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share feedback</DialogTitle>
          <DialogDescription className="text-xs">
            Tell us what's working, what's confusing, or what you'd love next. Goes straight to the team.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FEEDBACK_TYPES.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Topic</Label>
            <Select value={topic} onValueChange={setTopic}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {FEEDBACK_TOPICS.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs">Message</Label>
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="What happened, what's confusing, or what would help…"
            rows={5}
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!message.trim() || create.isPending}>
            {create.isPending ? "Sending…" : "Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
