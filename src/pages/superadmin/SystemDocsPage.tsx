import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

const DOC_LINKS = [
  { label: "Build Outline", href: "/outline", description: "Living spec and roadmap" },
  { label: "Docs Hub (legacy)", href: "/admin/docs", description: "Five9 docs and KB articles" },
  { label: "Knowledge Base", href: "/admin/kb", description: "Internal knowledge articles" },
];

export default function SystemDocsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">System Docs</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Internal documentation and reference materials for the platform.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4" /> Documentation surfaces
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {DOC_LINKS.map((d) => (
            <Link
              key={d.href}
              to={d.href}
              className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-muted/40 transition-colors"
            >
              <div>
                <div className="text-sm font-medium text-foreground">{d.label}</div>
                <div className="text-xs text-muted-foreground">{d.description}</div>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
