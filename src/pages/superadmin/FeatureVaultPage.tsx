import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";

type VaultFeature = {
  id: string;
  slug: string;
  name: string;
  status: string;
  summary: string | null;
  archived_at: string | null;
};

const statusColor: Record<string, string> = {
  core: "bg-primary/10 text-primary",
  archived: "bg-muted text-muted-foreground",
  experimental: "bg-warning/10 text-warning",
  deprecated: "bg-destructive/10 text-destructive",
  extracted: "bg-success/10 text-success",
};

export default function FeatureVaultPage() {
  const [features, setFeatures] = useState<VaultFeature[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("vault_features")
        .select("id, slug, name, status, summary, archived_at")
        .order("name");
      setFeatures((data as VaultFeature[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = features.filter(
    (f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Feature Vault</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Preserved non-core modules with full source bundles, docs, and extraction notes.
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search features…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center text-sm text-muted-foreground">
            No vault features yet. Seed entries via the database to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((f) => (
            <Link key={f.id} to={`/superadmin/vault/${f.id}`}>
              <Card className="hover:border-primary/40 transition-colors cursor-pointer h-full">
                <CardContent className="p-5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-foreground">{f.name}</h3>
                    <Badge variant="secondary" className={statusColor[f.status] ?? ""}>
                      {f.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-3">{f.summary}</p>
                  <p className="text-[10px] text-muted-foreground/70 font-mono">{f.slug}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
