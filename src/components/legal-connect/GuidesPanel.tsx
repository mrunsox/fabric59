import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Users, Wrench, ChevronRight } from "lucide-react";
import { CLIENT_GUIDES, INTERNAL_PLAYBOOKS, type ProviderGuide, type InternalPlaybook } from "@/data/legal-connect-guides";
import { openGuideDrawer } from "./GuideDrawer";

function ClientGuideCard({ guide }: { guide: ProviderGuide }) {
  return (
    <Card className="hover:border-primary/40 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm">{guide.title}</CardTitle>
            <CardDescription className="text-xs mt-1">{guide.summary}</CardDescription>
          </div>
          <Badge variant="outline" className="text-[10px] shrink-0">Client</Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Button
          size="sm"
          variant="outline"
          className="w-full justify-between"
          onClick={() => openGuideDrawer(guide.provider)}
        >
          Read guide <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
}

function PlaybookCard({ playbook }: { playbook: InternalPlaybook }) {
  const [open, setOpen] = useState(false);
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-sm">{playbook.title}</CardTitle>
            <CardDescription className="text-xs mt-1">{playbook.summary}</CardDescription>
          </div>
          <Badge variant="outline" className="text-[10px] shrink-0 bg-warning/10 text-warning border-warning/30">
            Internal
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {open && (
          <ol className="list-decimal list-inside text-xs text-muted-foreground space-y-1">
            {playbook.steps.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
        )}
        <Button size="sm" variant="ghost" className="w-full justify-between" onClick={() => setOpen((v) => !v)}>
          {open ? "Hide steps" : "Show steps"} <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
}

export default function GuidesPanel() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BookOpen className="h-3.5 w-3.5 text-primary" /> Setup guides &amp; playbooks
          </CardTitle>
          <CardDescription className="text-xs">
            Plain-English walk-throughs for clients, plus internal procedures for the implementation team.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="client">
            <TabsList>
              <TabsTrigger value="client" className="gap-1.5">
                <Users className="h-3.5 w-3.5" /> Client quick-starts
              </TabsTrigger>
              <TabsTrigger value="internal" className="gap-1.5">
                <Wrench className="h-3.5 w-3.5" /> Internal playbooks
              </TabsTrigger>
            </TabsList>
            <TabsContent value="client" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {CLIENT_GUIDES.map((g) => <ClientGuideCard key={g.provider} guide={g} />)}
              </div>
            </TabsContent>
            <TabsContent value="internal" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {INTERNAL_PLAYBOOKS.map((p) => <PlaybookCard key={p.id} playbook={p} />)}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
