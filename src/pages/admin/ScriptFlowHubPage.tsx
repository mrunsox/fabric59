import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileCode, Route, ListPlus, Zap, Mail, FileText, Workflow } from "lucide-react";
import { ScriptEditorContent } from "@/pages/admin/ScriptEditorPage";
import { ScriptRoutingContent } from "@/pages/admin/ScriptRoutingPage";
import { DispositionsContent } from "@/pages/admin/DispositionsPage";
import { PostCallAutomationsContent } from "@/pages/admin/PostCallAutomationsPage";
import { EmailTemplatesContent } from "@/pages/admin/EmailTemplatesPage";
import { CallSummaryTemplatesContent } from "@/pages/admin/CallSummaryTemplatesPage";

export default function ScriptFlowHubPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Workflow className="h-6 w-6" /> ScriptFlow
        </h1>
        <p className="text-sm text-muted-foreground">
          Scripts, routing, dispositions, automations, and templates — all in one place
        </p>
      </div>

      <Tabs defaultValue="scripts" className="space-y-4">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="scripts" className="gap-1.5">
            <FileCode className="h-3.5 w-3.5" /> Scripts
          </TabsTrigger>
          <TabsTrigger value="routing" className="gap-1.5">
            <Route className="h-3.5 w-3.5" /> Routing
          </TabsTrigger>
          <TabsTrigger value="dispositions" className="gap-1.5">
            <ListPlus className="h-3.5 w-3.5" /> Dispositions
          </TabsTrigger>
          <TabsTrigger value="automations" className="gap-1.5">
            <Zap className="h-3.5 w-3.5" /> Automations
          </TabsTrigger>
          <TabsTrigger value="email-templates" className="gap-1.5">
            <Mail className="h-3.5 w-3.5" /> Email Templates
          </TabsTrigger>
          <TabsTrigger value="summary-templates" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" /> Summary Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scripts">
          <ScriptEditorContent />
        </TabsContent>
        <TabsContent value="routing">
          <ScriptRoutingContent />
        </TabsContent>
        <TabsContent value="dispositions">
          <DispositionsContent />
        </TabsContent>
        <TabsContent value="automations">
          <PostCallAutomationsContent />
        </TabsContent>
        <TabsContent value="email-templates">
          <EmailTemplatesContent />
        </TabsContent>
        <TabsContent value="summary-templates">
          <CallSummaryTemplatesContent />
        </TabsContent>
      </Tabs>
    </div>
  );
}
