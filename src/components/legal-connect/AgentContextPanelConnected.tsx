import { useMemo } from "react";
import AgentContextPanel from "./AgentContextPanel";
import { useLegalContacts, useLegalMatters, useLegalEventLog } from "@/hooks/useLegalConnect";

interface AgentContextPanelConnectedProps {
  clientId: string;
  callerPhone?: string;
}

export default function AgentContextPanelConnected({
  clientId,
  callerPhone,
}: AgentContextPanelConnectedProps) {
  const { data: contacts } = useLegalContacts(clientId);
  const { data: matters } = useLegalMatters(clientId);
  const { data: events } = useLegalEventLog({
    client_id: clientId,
    limit: 10,
  });

  const matchedContact = useMemo(() => {
    if (!callerPhone || !contacts?.length) return undefined;
    const normalized = callerPhone.replace(/\D/g, "");
    return contacts.find((c: any) => {
      const cPhone = (c.phone || c.primary_phone || "").replace(/\D/g, "");
      return cPhone && normalized.endsWith(cPhone.slice(-10));
    });
  }, [contacts, callerPhone]);

  const matchedMatter = useMemo(() => {
    if (!matchedContact || !matters?.length) return undefined;
    return matters.find(
      (m: any) => m.contact_id === matchedContact.id && m.status === "open"
    );
  }, [matchedContact, matters]);

  return (
    <AgentContextPanel
      clientId={clientId}
      callerPhone={callerPhone}
      contact={matchedContact as Record<string, unknown> | undefined}
      matter={matchedMatter as Record<string, unknown> | undefined}
      recentEvents={events as unknown[] | undefined}
    />
  );
}
