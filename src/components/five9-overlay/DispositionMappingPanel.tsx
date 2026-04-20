import DispositionMappingEditor from "@/components/legal-connect/DispositionMappingEditor";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Map } from "lucide-react";

interface Props { clientId?: string; campaignId?: string; }

export default function DispositionMappingPanel({ clientId, campaignId }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base"><Map className="h-4 w-4" /> Disposition Mappings</CardTitle>
        <CardDescription>Map Five9 dispositions to provider-specific writeback action chains. Required call variables and provider targets enforce safe execution.</CardDescription>
      </CardHeader>
      <CardContent>
        <DispositionMappingEditor clientId={clientId} campaignId={campaignId} />
      </CardContent>
    </Card>
  );
}
