import DispositionMappingEditor from "@/components/legal-connect/DispositionMappingEditor";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Map } from "lucide-react";

interface Props {
  clientId: string;
  campaignId?: string;
}

export default function CampaignDispositionsPanel({ clientId, campaignId }: Props) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Map className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Dispositions & Action Mapping</CardTitle>
        </div>
        <CardDescription>
          Allowed dispositions for this campaign and the downstream action chain each one triggers
          on the connected provider.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DispositionMappingEditor clientId={clientId} campaignId={campaignId} />
      </CardContent>
    </Card>
  );
}
