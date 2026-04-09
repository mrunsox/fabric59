import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Building2 } from "lucide-react";

interface ClientOption {
  id: string;
  name: string;
  connectionCount: number;
  connectedProviders: string[];
  onboardingStatus: string;
  isSandbox: boolean;
}

interface Props {
  clients: ClientOption[];
  value: string;
  onChange: (id: string) => void;
  isLoading?: boolean;
}

export default function ClientSelector({ clients, value, onChange, isLoading }: Props) {
  return (
    <div className="flex items-center gap-3">
      <Building2 className="h-4 w-4 text-muted-foreground" />
      <Select value={value} onValueChange={onChange} disabled={isLoading}>
        <SelectTrigger className="w-[260px] h-9">
          <SelectValue placeholder="All clients" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Clients</SelectItem>
          {clients.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              <span className="flex items-center gap-2">
                {c.name}
                {c.isSandbox && <Badge variant="outline" className="text-[10px] px-1.5 py-0">sandbox</Badge>}
                {c.connectedProviders.length > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    ({c.connectedProviders.join(", ")})
                  </span>
                )}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
