import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateScheduledReport } from "@/hooks/useScheduledReports";
import { Clock } from "lucide-react";

interface ScheduleReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ScheduleReportModal({ open, onOpenChange }: ScheduleReportModalProps) {
  const [frequency, setFrequency] = useState("daily");
  const [dateRangeType, setDateRangeType] = useState("previous_day");
  const [exportFormat, setExportFormat] = useState("csv");
  const createReport = useCreateScheduledReport();

  const handleSubmit = async () => {
    await createReport.mutateAsync({
      frequency,
      dateRangeType,
      filters: {},
      exportFormat,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Schedule Recurring Report
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Frequency</label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Date Range</label>
            <Select value={dateRangeType} onValueChange={setDateRangeType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="previous_day">Previous Day</SelectItem>
                <SelectItem value="previous_week">Previous Week</SelectItem>
                <SelectItem value="previous_month">Previous Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Export Format</label>
            <Select value={exportFormat} onValueChange={setExportFormat}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="xlsx">XLS</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={createReport.isPending}>
            {createReport.isPending ? "Creating..." : "Create Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
