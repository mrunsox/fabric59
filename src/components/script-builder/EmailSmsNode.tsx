import { memo } from "react";
import { Handle, Position, NodeProps } from "@xyflow/react";
import { Mail, MessageCircle } from "lucide-react";

export const EmailSmsNode = memo(({ data, selected }: NodeProps) => {
  const isEmail = data.sendType === "email" || !data.sendType;
  return (
    <div className={`px-4 py-3 rounded-xl border-2 bg-card shadow-lg min-w-[180px] transition-all ${
      selected ? "border-success shadow-success/20" : "border-border"
    }`}>
      <Handle type="target" position={Position.Top} className="!bg-success !border-2 !border-card !w-3 !h-3" />
      <div className="flex items-center gap-2 mb-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-success text-white">
          {isEmail ? <Mail className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
        </div>
        <span className="font-semibold text-sm">{data.label as string}</span>
      </div>
      <div className="space-y-1">
        {data.sendType && (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-success/10 text-success">
            {data.sendType === "email" ? "Email" : data.sendType === "sms" ? "SMS" : "Both"}
          </span>
        )}
        {data.recipient && <p className="text-xs text-muted-foreground truncate max-w-[160px]">To: {data.recipient as string}</p>}
        {data.subject && <p className="text-xs text-muted-foreground truncate max-w-[160px]">Subject: {data.subject as string}</p>}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-success !border-2 !border-card !w-3 !h-3" />
    </div>
  );
});

EmailSmsNode.displayName = "EmailSmsNode";
