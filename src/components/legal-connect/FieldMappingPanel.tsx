import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Map } from "lucide-react";

interface Props {
  clientId: string;
}

const DEFAULT_MAPPINGS = [
  { fabric: "contact.first_name", clio: "first_name", mycase: "first_name", smokeball: "firstName" },
  { fabric: "contact.last_name", clio: "last_name", mycase: "last_name", smokeball: "lastName" },
  { fabric: "contact.email", clio: "primary_email_address", mycase: "email", smokeball: "email" },
  { fabric: "contact.phone", clio: "primary_phone_number", mycase: "phone", smokeball: "phoneNumber" },
  { fabric: "matter.description", clio: "description", mycase: "name", smokeball: "matterDescription" },
  { fabric: "matter.practice_area", clio: "practice_area_id", mycase: "case_type", smokeball: "areaOfLaw" },
  { fabric: "note.content", clio: "communications.body", mycase: "note.content", smokeball: "note" },
];

export default function FieldMappingPanel({ clientId }: Props) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Map className="h-4 w-4 text-primary" />
          <CardTitle className="text-base">Provider Field Mappings</CardTitle>
        </div>
        <CardDescription>
          Map Fabric59 normalized fields to provider-specific fields. Defaults are applied per
          provider on connect; refine here as needed.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fabric59 Field</TableHead>
              <TableHead>Clio</TableHead>
              <TableHead>MyCase</TableHead>
              <TableHead>Smokeball</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {DEFAULT_MAPPINGS.map((m) => (
              <TableRow key={m.fabric}>
                <TableCell className="font-mono text-xs">{m.fabric}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{m.clio}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{m.mycase}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{m.smokeball}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <p className="mt-3 text-xs text-muted-foreground">
          <Badge variant="outline" className="text-[10px] mr-1">Tip</Badge>
          Per-campaign overrides are not allowed here — that's a Five9 operational concern, not a
          provider mapping concern.
        </p>
      </CardContent>
    </Card>
  );
}
