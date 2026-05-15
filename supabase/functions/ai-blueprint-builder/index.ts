import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CAMPAIGN_INTAKE_SCHEMA = {
  name: "build_campaign",
  description:
    "Build a complete CampaignIntakeData object from the extracted document texts. Include every field you can infer.",
  parameters: {
    type: "object",
    properties: {
      campaignName: { type: "string" },
      clientName: { type: "string" },
      campaignDescription: { type: "string" },
      whiteLabel: { type: "boolean" },
      isMultiDepartment: { type: "boolean" },
      departments: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            ivrPromptNumber: { type: "number" },
            ivrGreeting: { type: "string" },
            skillName: { type: "string" },
            decisionTree: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  question: { type: "string" },
                  notes: { type: "string" },
                  dataToCapture: { type: "string" },
                  isGate: { type: "boolean" },
                  gateFailMessage: { type: "string" },
                  closingScript: { type: "string" },
                  options: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        label: { type: "string" },
                        nextNodeId: { type: ["string", "null"] },
                        action: {
                          type: ["string", "null"],
                          enum: ["transfer", "disposition", "escalate", "end_call", "skip", null],
                        },
                        actionValue: { type: "string" },
                      },
                      required: ["label", "nextNodeId"],
                    },
                  },
                },
                required: ["id", "question", "options"],
              },
            },
            dispositionEmailConfigs: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  dispositionName: { type: "string" },
                  emailRecipients: { type: "string" },
                  emailReplyTo: { type: "string" },
                  emailFrom: { type: "string" },
                  emailSubjectTemplate: { type: "string" },
                },
                required: ["dispositionName", "emailRecipients"],
              },
            },
            dispatchInstructions: { type: "string" },
          },
          required: ["id", "name", "ivrPromptNumber", "decisionTree", "dispositionEmailConfigs"],
        },
      },
      aniNumbers: { type: "array", items: { type: "string" } },
      dnisNumbers: { type: "array", items: { type: "string" } },
      aniNumbers: { type: "array", items: { type: "string" } },
      dnisNumbers: { type: "array", items: { type: "string" } },
      coverageType: { type: "string", enum: ["24/7", "scheduled"] },
      weekdayStart: { type: "string" },
      weekdayEnd: { type: "string" },
      weekendStart: { type: "string" },
      weekendEnd: { type: "string" },
      noWeekendCoverage: { type: "boolean" },
      afterHoursHandling: { type: "string", enum: ["vm", "overflow", "disconnect", "transfer"] },
      afterHoursTransferNumber: { type: "string" },
      existingDispositions: { type: "array", items: { type: "string" } },
      newDispositions: { type: "array", items: { type: "string" } },
      enableDispositionEmail: { type: "boolean" },
      dispositionEmailConfigs: {
        type: "array",
        items: {
          type: "object",
          properties: {
            dispositionName: { type: "string" },
            emailRecipients: { type: "string" },
            emailReplyTo: { type: "string" },
            emailFrom: { type: "string" },
            emailSubjectTemplate: { type: "string" },
          },
          required: ["dispositionName", "emailRecipients"],
        },
      },
      backendDocConnector: { type: "boolean" },
      backendDocUrl: { type: "string" },
      websiteConnectorUrl: { type: "string" },
      connectors: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            type: { type: "string", enum: ["backend_doc", "website", "script", "custom"] },
            name: { type: "string" },
            url: { type: "string" },
          },
          required: ["id", "type", "name", "url"],
        },
      },
      decisionTree: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            question: { type: "string" },
            notes: { type: "string" },
            dataToCapture: { type: "string" },
            options: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  label: { type: "string" },
                  nextNodeId: { type: ["string", "null"] },
                  action: { type: ["string", "null"] },
                  actionValue: { type: "string" },
                },
                required: ["label", "nextNodeId"],
              },
            },
          },
          required: ["id", "question", "options"],
        },
      },
      skillName: { type: "string" },
      assignedUsers: { type: "array", items: { type: "string" } },
      addSkillToIvr: { type: "boolean" },
      additionalNotes: { type: "string" },
      priority: { type: "string", enum: ["normal", "urgent"] },
      targetGoLive: { type: "string" },
    },
    required: [
      "campaignName",
      "clientName",
      "whiteLabel",
      "isMultiDepartment",
      "aniNumbers",
      "dnisNumbers",
      "coverageType",
      "existingDispositions",
      "newDispositions",
      "enableDispositionEmail",
      "backendDocConnector",
      "decisionTree",
      "skillName",
      "assignedUsers",
      "addSkillToIvr",
      "priority",
    ],
    additionalProperties: false,
  },
};

const SYSTEM_PROMPT = `You are an expert Five9 campaign configuration builder. You receive text extracted from multiple documents (agent scripts, FAQ docs, department guides, call flows, etc.) and must produce a complete campaign setup.

Your job:
1. IDENTIFY DEPARTMENTS: Look for department names, IVR menu numbers (Press 1/2/3), separate agent scripts per department. If only one department exists, that's fine.
2. EXTRACT DISPOSITIONS: Find disposition lists, outcome names, email routing rules. Classify each as new or existing.
3. BUILD DECISION TREES: Convert scripted Q&A flows into structured decision trees with branching. Each question node should have options that lead to next nodes or actions (transfer, disposition, escalate, end_call).
4. FIND PHONE NUMBERS: Look for ANI/DNIS numbers, transfer numbers, callback numbers.
5. IDENTIFY CONNECTORS: Find references to websites, backend documents, FAQ URLs, CRM systems.
6. EXTRACT IVR DETAILS: Greetings, whisper prompts, hold music references, after-hours handling.
7. DETERMINE SCHEDULE: Business hours, after-hours handling, weekend coverage.
8. EXTRACT SKILLS: Skill names, user assignments.

Important rules:
- Generate unique IDs for departments and decision tree nodes (use format like "dept_1", "node_1", etc.)
- If a document seems to be a general agent guide, incorporate its content into the decision tree
- For decision trees, create a flow that guides agents through the call step by step
- Set reasonable defaults for fields you can't determine (e.g., priority: "normal", coverageType: "24/7")
- If you find email addresses associated with dispositions, create dispositionEmailConfigs
- Set isMultiDepartment to true if you find 2+ departments
- Always provide at least one disposition ("Transfer - Completed" as fallback)
- For the main decisionTree field, use a general/shared tree. Put department-specific trees in the departments array.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documents } = await req.json();

    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return new Response(
        JSON.stringify({ error: "documents array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build user prompt with all document texts
    const docTexts = documents
      .map(
        (d: { fileName: string; text: string }, i: number) =>
          `--- DOCUMENT ${i + 1}: ${d.fileName} ---\n${d.text}\n`
      )
      .join("\n");

    const userPrompt = `Here are ${documents.length} documents extracted from a campaign setup package. Analyze all of them and produce a complete CampaignIntakeData configuration.\n\n${docTexts}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        tools: [{ type: "function", function: CAMPAIGN_INTAKE_SCHEMA }],
        tool_choice: { type: "function", function: { name: "build_campaign" } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds in Settings > Workspace > Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "AI processing failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      return new Response(
        JSON.stringify({ error: "AI did not return structured output" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const campaignData = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ campaign: campaignData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("ai-blueprint-builder error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
