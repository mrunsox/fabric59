import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Search } from "lucide-react";

interface ReportFiltersProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (v: string) => void;
  onEndDateChange: (v: string) => void;
  campaignFilter: string;
  onCampaignFilterChange: (v: string) => void;
  agentFilter: string;
  onAgentFilterChange: (v: string) => void;
  dispositionFilter: string;
  onDispositionFilterChange: (v: string) => void;
  searchQuery: string;
  onSearchQueryChange: (v: string) => void;
  allowedDispositions: string[];
  onFetch: () => void;
  isLoading: boolean;
}

export function ReportFilters({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  campaignFilter,
  onCampaignFilterChange,
  agentFilter,
  onAgentFilterChange,
  dispositionFilter,
  onDispositionFilterChange,
  searchQuery,
  onSearchQueryChange,
  allowedDispositions,
  onFetch,
  isLoading,
}: ReportFiltersProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Start Date</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className="pl-9 w-40"
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">End Date</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className="pl-9 w-40"
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Campaign</label>
          <Input
            placeholder="Filter by campaign..."
            value={campaignFilter}
            onChange={(e) => onCampaignFilterChange(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Agent</label>
          <Input
            placeholder="Filter by agent..."
            value={agentFilter}
            onChange={(e) => onAgentFilterChange(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Disposition</label>
          <Select value={dispositionFilter} onValueChange={onDispositionFilterChange}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All dispositions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All dispositions</SelectItem>
              {allowedDispositions.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={onFetch} disabled={isLoading || !startDate || !endDate} className="gap-1.5">
          <Search className="h-4 w-4" /> Fetch Logs
        </Button>
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by customer or phone..."
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          className="pl-9"
        />
      </div>
    </div>
  );
}
