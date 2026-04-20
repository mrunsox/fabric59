import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, ExternalLink, CheckCircle2, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { ALL_DOCS } from "@/data/five9DocsIndex";

export default function DocsHubPage() {
  const [tab, setTab] = useState("five9");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Docs"
        subtitle="Five9 documentation, integration guides, setup help, and the knowledge base — all in one place"
        icon={<BookOpen className="h-6 w-6 text-primary" />}
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="five9">Five9</TabsTrigger>
          <TabsTrigger value="legal">Legal Integrations</TabsTrigger>
          <TabsTrigger value="setup">Setup Guides</TabsTrigger>
          <TabsTrigger value="kb">Knowledge Base</TabsTrigger>
        </TabsList>

        <TabsContent value="five9" className="space-y-4 mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            {ALL_DOCS.map((t) => (
              <Card key={t.id}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-semibold">{t.title}</h3>
                    <Badge variant="outline" className="text-[10px]">Five9</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{t.summary}</p>
                  <div className="rounded-lg bg-muted/40 p-3">
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">Why this matters</p>
                    <p className="text-xs text-foreground/80">{t.whyItMatters}</p>
                  </div>
                  <div className="space-y-1.5">
                    {t.checklist.map((c, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <CheckCircle2 className="h-3 w-3 mt-0.5 text-muted-foreground/50 flex-shrink-0" />
                        <span className="text-foreground/80">{c}</span>
                      </div>
                    ))}
                  </div>
                  <Button asChild variant="outline" size="sm" className="w-full">
                    <a href={t.url} target="_blank" rel="noopener noreferrer">
                      Open official doc <ExternalLink className="h-3 w-3 ml-1.5" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="legal" className="mt-6">
          <Card>
            <CardContent className="p-6 space-y-3">
              <h3 className="text-base font-semibold">Legal CRM integrations</h3>
              <p className="text-sm text-muted-foreground">
                Setup, connection lifecycle, and field mapping guides for Clio, MyCase, and Smokeball.
              </p>
              <Button asChild variant="outline">
                <Link to="/admin/legal-connect">Open Legal Connect <ArrowRight className="h-3 w-3 ml-1.5" /></Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="setup" className="mt-6">
          <Card>
            <CardContent className="p-6 space-y-3">
              <h3 className="text-base font-semibold">Build outline</h3>
              <p className="text-sm text-muted-foreground">
                The living spec for Fabric59 — what's built, what's next, and how every system fits together.
              </p>
              <Button asChild variant="outline">
                <Link to="/outline">Open build outline <ArrowRight className="h-3 w-3 ml-1.5" /></Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kb" className="mt-6">
          <Card>
            <CardContent className="p-6 space-y-3">
              <h3 className="text-base font-semibold">Knowledge base</h3>
              <p className="text-sm text-muted-foreground">
                Internal articles, how-tos, and operational runbooks.
              </p>
              <Button asChild variant="outline">
                <Link to="/admin/kb">Open knowledge base <ArrowRight className="h-3 w-3 ml-1.5" /></Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
