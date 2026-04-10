import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-tenant-id",
};

const MYCASE_BASE_URL = "https://api.mycase.com/v2";

async function mycaseApiFetch(
  method: string,
  path: string,
  apiKey: string,
  body?: unknown
): Promise<{ ok: boolean; status: number; data: any }> {
  const opts: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  };
  if (body) opts.body = JSON.stringify(body);

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${MYCASE_BASE_URL}${path}`, opts);
    if (res.status === 429 || res.status >= 500) {
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      continue;
    }
    return { ok: res.ok, status: res.status, data: await res.json() };
  }
  return { ok: false, status: 0, data: { error: "Max retries exceeded" } };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const tenantId = req.headers.get("x-tenant-id");
    if (!tenantId) {
      return new Response(JSON.stringify({ error: "Missing X-Tenant-Id header" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Resolve MyCase API key from tenant's integration_configs
    const { data: tenant } = await supabase
      .from("tenants")
      .select("integration_configs")
      .eq("id", tenantId)
      .single();

    if (!tenant) {
      return new Response(JSON.stringify({ error: "Tenant not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const configs = (tenant.integration_configs as any) || {};
    const mycaseConfig = configs.mycase;

    if (!mycaseConfig?.apiKeyId) {
      return new Response(JSON.stringify({ error: "MyCase not configured for this tenant" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: keyRow } = await supabase
      .from("api_keys")
      .select("key_hash")
      .eq("id", mycaseConfig.apiKeyId)
      .single();

    const apiKey = keyRow?.key_hash;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "MyCase API key not found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, payload } = await req.json();

    let result: any;

    switch (action) {
      case "searchContacts": {
        const query = payload.phone || payload.email || payload.name || "";
        const param = payload.phone ? `phone=${encodeURIComponent(query)}` : payload.email ? `email=${encodeURIComponent(query)}` : `query=${encodeURIComponent(query)}`;
        const res = await mycaseApiFetch("GET", `/contacts?${param}`, apiKey);
        result = { contacts: res.data?.contacts || [], total: res.data?.contacts?.length || 0 };
        break;
      }

      case "getContact": {
        const res = await mycaseApiFetch("GET", `/contacts/${payload.contact_id}`, apiKey);
        if (!res.ok) throw new Error(`Contact not found [${res.status}]`);
        result = { contact: res.data?.contact || res.data };
        break;
      }

      case "createContact": {
        const res = await mycaseApiFetch("POST", "/contacts", apiKey, {
          contact: {
            first_name: payload.first_name || "Unknown",
            last_name: payload.last_name || "Caller",
            phone: payload.phone,
            email: payload.email,
          },
        });
        if (!res.ok) throw new Error(`Failed to create contact [${res.status}]: ${JSON.stringify(res.data)}`);
        result = { contact: res.data?.contact, contact_id: res.data?.contact?.id };
        break;
      }

      case "searchCases": {
        let queryStr = "";
        if (payload.contact_id) queryStr += `contact_id=${payload.contact_id}`;
        if (payload.status) queryStr += `${queryStr ? "&" : ""}status=${payload.status}`;
        const res = await mycaseApiFetch("GET", `/cases${queryStr ? `?${queryStr}` : ""}`, apiKey);
        result = { cases: res.data?.cases || [], total: res.data?.cases?.length || 0 };
        break;
      }

      case "getCase": {
        const res = await mycaseApiFetch("GET", `/cases/${payload.case_id}`, apiKey);
        if (!res.ok) throw new Error(`Case not found [${res.status}]`);
        result = { case: res.data?.case || res.data };
        break;
      }

      case "createCase": {
        const res = await mycaseApiFetch("POST", "/cases", apiKey, {
          case: {
            name: payload.name || "New Case",
            contact_id: payload.contact_id ? Number(payload.contact_id) : undefined,
          },
        });
        if (!res.ok) throw new Error(`Failed to create case [${res.status}]: ${JSON.stringify(res.data)}`);
        result = { case: res.data?.case, case_id: res.data?.case?.id };
        break;
      }

      case "createNote": {
        const notePayload: any = {
          note: {
            subject: payload.subject || "Note",
            content: payload.content || "",
          },
        };
        if (payload.case_id) notePayload.note.case_id = Number(payload.case_id);
        else if (payload.contact_id) notePayload.note.contact_id = Number(payload.contact_id);

        const res = await mycaseApiFetch("POST", "/notes", apiKey, notePayload);
        if (!res.ok) throw new Error(`Failed to create note [${res.status}]: ${JSON.stringify(res.data)}`);
        result = { note: res.data?.note, note_id: res.data?.note?.id };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify({ success: true, tenant_id: tenantId, action, ...result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("MyCase adapter error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
