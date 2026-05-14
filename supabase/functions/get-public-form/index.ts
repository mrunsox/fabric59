// Public read endpoint: returns the latest published schema for a form.
// Used by the shareable /forms/:formId render route (e.g. embedded in Five9
// Agent Desktop) so Five9 can load the form without needing an auth session.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "GET") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const formId = url.searchParams.get("formId");
  if (!formId || !/^[0-9a-f-]{36}$/i.test(formId)) {
    return new Response(JSON.stringify({ error: "formId is required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: form, error } = await admin
    .from("forms")
    .select("id, name, description, status, current_version, workspace_id")
    .eq("id", formId)
    .maybeSingle();
  if (error || !form) {
    return new Response(JSON.stringify({ error: "Form not found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (form.status !== "published") {
    return new Response(JSON.stringify({ error: "Form is not published" }), {
      status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: ver } = await admin
    .from("form_versions")
    .select("schema, version")
    .eq("form_id", form.id)
    .eq("version", form.current_version)
    .maybeSingle();

  return new Response(JSON.stringify({
    id: form.id,
    name: form.name,
    description: form.description,
    version: ver?.version ?? form.current_version,
    schema: ver?.schema ?? { fields: [] },
  }), {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=30",
    },
  });
});
