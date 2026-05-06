import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ShieldOff, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  clientId: string;
  organizationId: string;
  onComplete?: () => void;
}

export default function MyCaseConnectWizard({ clientId }: Props) {
  const navigate = useNavigate();
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldOff className="h-4 w-4 text-muted-foreground" /> Connect MyCase
            </CardTitle>
            <CardDescription>Provider not yet configured</CardDescription>
          </div>
          <Badge variant="outline">Disabled</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>MyCase connect is disabled</AlertTitle>
          <AlertDescription className="text-xs space-y-2">
            <p>
              The MyCase adapter in this codebase is API-key based and there is no truthful
              self-serve connect flow yet:
            </p>
            <ul className="list-disc pl-4 space-y-1">
              <li>No OAuth client registration is configured for MyCase.</li>
              <li>
                No per-client API key intake or secure storage helper is wired through the
                connection record.
              </li>
              <li>
                Enabling a button here without those would either fake a successful connection or
                lead to a broken sync.
              </li>
            </ul>
            <p>
              Contact an admin to provision MyCase access. Once a verified auth model is in place,
              this wizard will be enabled.
            </p>
          </AlertDescription>
        </Alert>

        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={() => navigate(`/admin/clients/${clientId}/legal-connect`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to connections
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
