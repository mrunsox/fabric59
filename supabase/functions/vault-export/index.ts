import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } }
    );
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return json({ error: "Unauthorized" }, 401);

    const { data: isMaster } = await supabase.rpc("is_master_admin", { _user_id: userData.user.id });
    if (!isMaster) return json({ error: "Forbidden" }, 403);

    const { feature_id } = await req.json();
    if (!feature_id) return json({ error: "feature_id required" }, 400);

    const { data: feature, error: fErr } = await supabase
      .from("vault_features")
      .select("*")
      .eq("id", feature_id)
      .maybeSingle();
    if (fErr || !feature) return json({ error: "Feature not found" }, 404);

    // Determine next version
    const { data: existing } = await supabase
      .from("vault_exports")
      .select("version")
      .eq("feature_id", feature_id)
      .order("version", { ascending: false })
      .limit(1);
    const nextVersion = (existing?.[0]?.version ?? 0) + 1;

    // Build manifest + docs (text bundle stored as JSON for simplicity)
    const manifest = {
      slug: feature.slug,
      name: feature.name,
      status: feature.status,
      version: nextVersion,
      generated_at: new Date().toISOString(),
      summary: feature.summary,
      reason_archived: feature.reason_archived,
      original_routes: feature.original_routes ?? [],
      frontend_files: feature.frontend_files ?? [],
      backend_files: feature.backend_files ?? [],
      edge_functions: feature.edge_functions ?? [],
      db_objects: feature.db_objects ?? [],
      dependencies: feature.dependencies ?? {},
      required_secrets: feature.required_secrets ?? [],
      risks: feature.risks,
      restore_notes: feature.restore_notes,
      extraction_notes: feature.extraction_notes,
    };

    const overview = `# ${feature.name}\n\n${feature.summary ?? ""}\n\n## Status\n${feature.status}\n\n## Why archived\n${feature.reason_archived ?? "N/A"}\n`;
    const routes = `# Routes\n\n${(feature.original_routes ?? []).map((r: string) => `- \`${r}\``).join("\n")}\n`;
    const schema = `# Database objects\n\n${(feature.db_objects ?? []).map((d: string) => `- \`${d}\``).join("\n")}\n`;
    const dependencies = `# Dependencies\n\n## Required secrets\n${(feature.required_secrets ?? []).map((s: string) => `- \`${s}\``).join("\n")}\n\n## Other\n\`\`\`json\n${JSON.stringify(feature.dependencies ?? {}, null, 2)}\n\`\`\`\n`;
    const extraction = `# Extraction notes\n\n${feature.extraction_notes ?? "N/A"}\n\n# Restore notes\n\n${feature.restore_notes ?? "N/A"}\n`;

    const bundle = {
      "manifest.json": manifest,
      "docs/overview.md": overview,
      "docs/routes.md": routes,
      "docs/schema.md": schema,
      "docs/dependencies.md": dependencies,
      "docs/extraction-notes.md": extraction,
      "frontend/_index.txt": (feature.frontend_files ?? []).join("\n"),
      "backend/_index.txt": [
        ...(feature.backend_files ?? []),
        ...(feature.edge_functions ?? []).map((e: string) => `supabase/functions/${e}`),
      ].join("\n"),
      "README.md": `# ${feature.name} export bundle (v${nextVersion})\n\nThis bundle contains the manifest and documentation for the **${feature.name}** module preserved in the Fabric59 Feature Vault.\n\nFile lists in \`frontend/_index.txt\` and \`backend/_index.txt\` reference the source paths in the original repository. Combine with the repo at the same revision to reconstruct the module.\n`,
    };

    const bundleJson = JSON.stringify(bundle, null, 2);
    const bytes = new TextEncoder().encode(bundleJson);
    const path = `${feature.slug}/v${nextVersion}-${Date.now()}.json`;

    const { error: uploadErr } = await supabase.storage
      .from("vault-exports")
      .upload(path, bytes, { contentType: "application/json", upsert: false });
    if (uploadErr) return json({ error: uploadErr.message }, 500);

    const { data: inserted, error: insertErr } = await supabase
      .from("vault_exports")
      .insert({
        feature_id,
        version: nextVersion,
        manifest,
        bundle_path: path,
        size_bytes: bytes.byteLength,
        created_by: userData.user.id,
      })
      .select()
      .single();
    if (insertErr) return json({ error: insertErr.message }, 500);

    return json({ success: true, export: inserted });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
