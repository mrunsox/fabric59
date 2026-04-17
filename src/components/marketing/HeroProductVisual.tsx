import { motion } from "framer-motion";
import { Phone, User, Workflow, CheckCircle2 } from "lucide-react";

export function HeroProductVisual() {
  return (
    <div className="relative max-w-3xl mx-auto mt-10">
      <div className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur shadow-2xl p-5 overflow-hidden">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/30">
          <div className="flex gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
            <div className="h-2.5 w-2.5 rounded-full bg-warning/60" />
            <div className="h-2.5 w-2.5 rounded-full bg-success/60" />
          </div>
          <div className="ml-3 text-xs text-muted-foreground font-mono">fabric59.app/admin/agents</div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Active call panel */}
          <div className="col-span-2 rounded-lg border border-border/40 bg-background/40 p-3">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Live Call</span>
            </div>
            <div className="space-y-2">
              {[
                { icon: Phone, label: "ANI", value: "+1 555 0123" },
                { icon: User, label: "Contact", value: "John Doe (Clio)" },
                { icon: Workflow, label: "Skill", value: "Legal Intake" },
              ].map((row, i) => (
                <motion.div
                  key={row.label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + i * 0.15 }}
                  className="flex items-center gap-2 text-xs"
                >
                  <row.icon className="h-3 w-3 text-primary" />
                  <span className="text-muted-foreground w-16">{row.label}</span>
                  <span className="text-foreground font-medium">{row.value}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Workflow steps */}
          <div className="rounded-lg border border-border/40 bg-background/40 p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">Workflow</div>
            <div className="space-y-2">
              {["Match", "Pop", "Log", "Sync"].map((label, i) => (
                <motion.div
                  key={label}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 + i * 0.2 }}
                  className="flex items-center gap-2 text-xs"
                >
                  <CheckCircle2 className="h-3 w-3 text-success" />
                  <span className="text-foreground">{label}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4 }}
          className="mt-4 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10 border border-primary/20 p-3 flex items-center justify-between"
        >
          <span className="text-xs text-foreground">CRM writeback complete</span>
          <span className="text-[10px] font-mono text-success">200 OK · 312ms</span>
        </motion.div>
      </div>

      {/* Floating accent badges */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute -top-3 -right-3 px-2.5 py-1 rounded-full bg-success text-success-foreground text-[10px] font-bold shadow-lg"
      >
        LIVE
      </motion.div>
    </div>
  );
}
