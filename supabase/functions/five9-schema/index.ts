import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Five9Field {
  name: string;
  label: string;
  type: string;
  category: string;
  required?: boolean;
  options?: string[];
}

interface Five9Schema {
  contactFields: Five9Field[];
  callVariables: Five9Field[];
  dispositions: Five9Field[];
  campaigns: Five9Field[];
}

// Standard Five9 contact fields that are always available
const standardContactFields: Five9Field[] = [
  { name: "number1", label: "Phone Number 1", type: "phone", category: "contact", required: true },
  { name: "number2", label: "Phone Number 2", type: "phone", category: "contact" },
  { name: "number3", label: "Phone Number 3", type: "phone", category: "contact" },
  { name: "first_name", label: "First Name", type: "string", category: "contact" },
  { name: "last_name", label: "Last Name", type: "string", category: "contact" },
  { name: "company", label: "Company", type: "string", category: "contact" },
  { name: "street", label: "Street", type: "string", category: "contact" },
  { name: "city", label: "City", type: "string", category: "contact" },
  { name: "state", label: "State", type: "string", category: "contact" },
  { name: "zip", label: "ZIP Code", type: "string", category: "contact" },
  { name: "email", label: "Email", type: "email", category: "contact" },
];

// Standard Five9 call variables
const standardCallVariables: Five9Field[] = [
  { name: "ANI", label: "ANI (Caller ID)", type: "phone", category: "call", required: true },
  { name: "DNIS", label: "DNIS (Dialed Number)", type: "phone", category: "call" },
  { name: "call_id", label: "Call ID", type: "string", category: "call" },
  { name: "campaign_name", label: "Campaign Name", type: "string", category: "call" },
  { name: "skill_name", label: "Skill Name", type: "string", category: "call" },
  { name: "agent_name", label: "Agent Name", type: "string", category: "call" },
  { name: "agent_id", label: "Agent ID", type: "string", category: "call" },
  { name: "call_type", label: "Call Type", type: "enum", category: "call", options: ["inbound", "outbound", "manual"] },
  { name: "queue_time", label: "Queue Time (seconds)", type: "number", category: "call" },
  { name: "talk_time", label: "Talk Time (seconds)", type: "number", category: "call" },
  { name: "hold_time", label: "Hold Time (seconds)", type: "number", category: "call" },
  { name: "wrap_time", label: "Wrap Time (seconds)", type: "number", category: "call" },
  { name: "disposition", label: "Disposition", type: "string", category: "call" },
  { name: "disposition_notes", label: "Disposition Notes", type: "text", category: "call" },
];

// Standard disposition categories
const standardDispositions: Five9Field[] = [
  { name: "Sale", label: "Sale", type: "disposition", category: "disposition" },
  { name: "No Sale", label: "No Sale", type: "disposition", category: "disposition" },
  { name: "Callback", label: "Callback", type: "disposition", category: "disposition" },
  { name: "DNC", label: "Do Not Call", type: "disposition", category: "disposition" },
  { name: "No Answer", label: "No Answer", type: "disposition", category: "disposition" },
  { name: "Busy", label: "Busy", type: "disposition", category: "disposition" },
  { name: "Voicemail", label: "Voicemail", type: "disposition", category: "disposition" },
  { name: "Wrong Number", label: "Wrong Number", type: "disposition", category: "disposition" },
  { name: "Transfer", label: "Transfer", type: "disposition", category: "disposition" },
];

// SOAP envelope builders
function buildSoapEnvelope(operation: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
                  xmlns:ser="http://service.admin.ws.five9.com/">
  <soapenv:Header/>
  <soapenv:Body>
    <ser:${operation}/>
  </soapenv:Body>
</soapenv:Envelope>`;
}

// Parse XML response for contact fields
function parseContactFieldsResponse(xml: string): Five9Field[] {
  const fields: Five9Field[] = [];
  
  // Match each return element containing field data
  const returnRegex = /<return>([\s\S]*?)<\/return>/g;
  let match;
  
  while ((match = returnRegex.exec(xml)) !== null) {
    const fieldXml = match[1];
    
    const nameMatch = fieldXml.match(/<name>([^<]+)<\/name>/);
    const displayNameMatch = fieldXml.match(/<displayName>([^<]+)<\/displayName>/);
    const typeMatch = fieldXml.match(/<type>([^<]+)<\/type>/);
    const requiredMatch = fieldXml.match(/<required>([^<]+)<\/required>/);
    
    if (nameMatch) {
      const field: Five9Field = {
        name: nameMatch[1],
        label: displayNameMatch ? displayNameMatch[1] : nameMatch[1],
        type: typeMatch ? typeMatch[1].toLowerCase() : "string",
        category: "contact",
        required: requiredMatch ? requiredMatch[1] === "true" : false
      };
      
      // Parse predefined list values if present
      const predefinedMatch = fieldXml.match(/<predefinedList>([^<]+)<\/predefinedList>/);
      if (predefinedMatch) {
        field.options = predefinedMatch[1].split(",").map(s => s.trim());
      }
      
      fields.push(field);
    }
  }
  
  return fields;
}

// Parse XML response for call variables
function parseCallVariablesResponse(xml: string): Five9Field[] {
  const fields: Five9Field[] = [];
  
  const returnRegex = /<return>([\s\S]*?)<\/return>/g;
  let match;
  
  while ((match = returnRegex.exec(xml)) !== null) {
    const varXml = match[1];
    
    const nameMatch = varXml.match(/<name>([^<]+)<\/name>/);
    const descMatch = varXml.match(/<description>([^<]+)<\/description>/);
    const typeMatch = varXml.match(/<type>([^<]+)<\/type>/);
    
    if (nameMatch) {
      fields.push({
        name: nameMatch[1],
        label: descMatch ? descMatch[1] : nameMatch[1],
        type: typeMatch ? typeMatch[1].toLowerCase() : "string",
        category: "call"
      });
    }
  }
  
  return fields;
}

// Parse XML response for dispositions
function parseDispositionsResponse(xml: string): Five9Field[] {
  const fields: Five9Field[] = [];
  
  const returnRegex = /<return>([\s\S]*?)<\/return>/g;
  let match;
  
  while ((match = returnRegex.exec(xml)) !== null) {
    const dispXml = match[1];
    
    const nameMatch = dispXml.match(/<name>([^<]+)<\/name>/);
    const descMatch = dispXml.match(/<description>([^<]+)<\/description>/);
    
    if (nameMatch) {
      fields.push({
        name: nameMatch[1],
        label: descMatch ? descMatch[1] : nameMatch[1],
        type: "disposition",
        category: "disposition"
      });
    }
  }
  
  return fields;
}

async function makeFive9Request(username: string, password: string, operation: string): Promise<string> {
  const response = await fetch("https://api.five9.com/wsadmin/v13/AdminWebService", {
    method: "POST",
    headers: {
      "Content-Type": "text/xml;charset=UTF-8",
      "SOAPAction": "",
      "Authorization": `Basic ${btoa(`${username}:${password}`)}`
    },
    body: buildSoapEnvelope(operation)
  });
  
  if (!response.ok) {
    throw new Error(`Five9 API returned ${response.status}`);
  }
  
  return response.text();
}

async function fetchFive9Schema(username: string, password: string): Promise<Five9Schema> {
  try {
    // Fetch all schema data in parallel
    const [contactFieldsXml, callVariablesXml, dispositionsXml] = await Promise.all([
      makeFive9Request(username, password, "getContactFields"),
      makeFive9Request(username, password, "getCallVariables"),
      makeFive9Request(username, password, "getDispositions")
    ]);
    
    // Parse responses
    const customContactFields = parseContactFieldsResponse(contactFieldsXml);
    const customCallVariables = parseCallVariablesResponse(callVariablesXml);
    const customDispositions = parseDispositionsResponse(dispositionsXml);
    
    // Merge with standard fields, avoiding duplicates
    const contactFieldNames = new Set(standardContactFields.map(f => f.name));
    const filteredCustomContacts = customContactFields.filter(f => !contactFieldNames.has(f.name));
    
    const callVarNames = new Set(standardCallVariables.map(f => f.name));
    const filteredCustomCallVars = customCallVariables.filter(f => !callVarNames.has(f.name));
    
    return {
      contactFields: [...standardContactFields, ...filteredCustomContacts],
      callVariables: [...standardCallVariables, ...filteredCustomCallVars],
      dispositions: customDispositions.length > 0 ? customDispositions : standardDispositions,
      campaigns: []
    };
  } catch (error) {
    console.error("Error fetching Five9 schema:", error);
    // Fall back to standard fields if API call fails
    return {
      contactFields: standardContactFields,
      callVariables: standardCallVariables,
      dispositions: standardDispositions,
      campaigns: []
    };
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const domainId = url.searchParams.get("domain_id");

    if (!domainId) {
      return new Response(
        JSON.stringify({ error: "domain_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch domain details to get API credentials
    const { data: domain, error: domainError } = await supabase
      .from("five9_domains")
      .select("*")
      .eq("id", domainId)
      .single();

    if (domainError || !domain) {
      return new Response(
        JSON.stringify({ error: "Domain not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let schema: Five9Schema;
    
    // If credentials are configured, fetch real schema from Five9
    if (domain.five9_username && domain.five9_password_encrypted) {
      schema = await fetchFive9Schema(domain.five9_username, domain.five9_password_encrypted);
    } else {
      // Fall back to standard fields if no credentials
      schema = {
        contactFields: standardContactFields,
        callVariables: standardCallVariables,
        dispositions: standardDispositions,
        campaigns: []
      };
    }

    // Add any custom fields from workflow_settings if available
    if (domain.workflow_settings?.customFields) {
      const customFields = domain.workflow_settings.customFields as Five9Field[];
      schema.contactFields = [...schema.contactFields, ...customFields];
    }

    return new Response(
      JSON.stringify({
        domain: {
          id: domain.id,
          display_name: domain.display_name,
          domain: domain.domain,
        },
        schema,
        hasCredentials: !!(domain.five9_username && domain.five9_password_encrypted),
        connectionStatus: domain.api_connection_status
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error fetching Five9 schema:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
