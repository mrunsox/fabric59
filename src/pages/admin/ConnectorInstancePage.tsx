import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LegalConnectPage from "./LegalConnectPage";

const LEGAL_PROVIDERS = new Set(["clio", "mycase", "smokeball"]);

export default function ConnectorInstancePage() {
  const { slug } = useParams();

  if (slug && LEGAL_PROVIDERS.has(slug)) {
    // Reuse the existing Legal Connect connection management surface for legal providers.
    return <LegalConnectPage />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight capitalize">{slug?.replace("-", " ")}</h1>
        <p className="text-sm text-muted-foreground mt-1">Connector instance configuration</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Setup</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Configure this connector inside a Flow. Use the Flow Builder to add an action step that targets {slug}.
          </p>
          <Button asChild><Link to="/admin/flows">Go to Flows</Link></Button>
        </CardContent>
      </Card>
    </div>
  );
}
