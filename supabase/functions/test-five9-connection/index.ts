import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Simple SOAP envelope to test connection - uses getContactFields as a lightweight test
const getTestSoapEnvelope = () => `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:ser="http://service.admin.ws.five9.com/">
  <soapenv:Header/>
  <soapenv:Body>
    <ser:getContactFields/>
  </soapenv:Body>
</soapenv:Envelope>`;

interface TestConnectionRequest {
  domain_id: string;
  username?: string;
  password?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { domain_id, username, password }: TestConnectionRequest = await req.json();

    if (!domain_id) {
      return new Response(
        JSON.stringify({ error: "domain_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch domain to get existing credentials if not provided
    const { data: domain, error: domainError } = await supabase
      .from("five9_domains")
      .select("*")
      .eq("id", domain_id)
      .single();

    if (domainError || !domain) {
      return new Response(
        JSON.stringify({ error: "Domain not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use provided credentials or fall back to stored ones
    const testUsername = username || domain.five9_username;
    const testPassword = password || domain.five9_password_encrypted;

    if (!testUsername || !testPassword) {
      return new Response(
        JSON.stringify({ 
          error: "Five9 credentials not configured",
          status: "failed",
          message: "Please enter your Five9 username and password"
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Make SOAP request to Five9 Admin Web Services
    const soapResponse = await fetch("https://api.five9.com/wsadmin/v2/AdminWebService", {
      method: "POST",
      headers: {
        "Content-Type": "text/xml;charset=UTF-8",
        "SOAPAction": "",
        "Authorization": `Basic ${btoa(`${testUsername}:${testPassword}`)}`
      },
      body: getTestSoapEnvelope()
    });

    const responseText = await soapResponse.text();

    // Check for authentication failure
    if (soapResponse.status === 401) {
      // Update domain status to failed
      await supabase
        .from("five9_domains")
        .update({
          api_connection_status: "failed",
          last_connection_test: new Date().toISOString()
        })
        .eq("id", domain_id);

      return new Response(
        JSON.stringify({
          success: false,
          status: "failed",
          message: "Authentication failed. Please check your Five9 username and password."
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for SOAP fault
    if (responseText.includes("soap:Fault") || responseText.includes("faultstring")) {
      // Extract fault message
      const faultMatch = responseText.match(/<faultstring>([^<]+)<\/faultstring>/);
      const faultMessage = faultMatch ? faultMatch[1] : "Unknown error from Five9 API";

      await supabase
        .from("five9_domains")
        .update({
          api_connection_status: "failed",
          last_connection_test: new Date().toISOString()
        })
        .eq("id", domain_id);

      return new Response(
        JSON.stringify({
          success: false,
          status: "failed",
          message: `Five9 API error: ${faultMessage}`
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Success - update domain status
    const updateData: Record<string, unknown> = {
      api_connection_status: "connected",
      last_connection_test: new Date().toISOString()
    };

    // If new credentials were provided, save them
    if (username && password) {
      updateData.five9_username = username;
      updateData.five9_password_encrypted = password;
    }

    await supabase
      .from("five9_domains")
      .update(updateData)
      .eq("id", domain_id);

    return new Response(
      JSON.stringify({
        success: true,
        status: "connected",
        message: "Successfully connected to Five9 Admin Web Services"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error testing Five9 connection:", error);
    return new Response(
      JSON.stringify({ 
        success: false,
        status: "failed",
        error: error instanceof Error ? error.message : "Internal server error"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
