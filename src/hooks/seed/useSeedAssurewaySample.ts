/**
 * Seed the Assureway sample campaign — idempotent.
 *
 * Uses only canonical tables (tenants, campaigns, guides, guide_versions,
 * forms, form_versions, form_campaign_assignments). No schema changes,
 * no edge functions, no auth changes. Workspace-scoped on every write.
 */
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  WORKSPACE_GUIDE_SINGLETON_NAME,
  WORKSPACE_GUIDE_SINGLETON_KIND,
  type WorkspaceGuideContentV2,
} from "@/types/workspace-guide";
import {
  CAMPAIGN_FLOW_SENTINEL_NAME,
  CAMPAIGN_FLOW_SENTINEL_KIND,
  type CampaignFlowContent,
  type FlowStep,
} from "@/types/campaign-flow";
import type { FormSchemaV1 } from "@/types/form-schema";
import { cryptoRandomId } from "@/types/form-schema";

const CLIENT_NAME = "Assureway";
const CAMPAIGN_NAME = "Main Reception";
const LEGACY_CAMPAIGN_NAME = "General Inquiry";
const FORM_NAME = "Assureway — Main Reception intake";
const LEGACY_FORM_NAME = "Assureway — General Inquiry intake";

const rid = (p = "id"): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${p}_${crypto.randomUUID()}`;
  }
  return `${p}_${Math.random().toString(36).slice(2)}_${Date.now()}`;
};

function buildGuide(): WorkspaceGuideContentV2 {
  return {
    schemaVersion: 2,
    sections: [
      {
        id: rid("s"),
        kind: "greeting",
        label: "Greeting",
        visibility: "agent",
        required: true,
        enabled: true,
        fields: [
          { id: rid("f"), label: "Opening line", value: "Hi there, you've reached Assureway. How can I help you today?" },
        ],
      },
      {
        id: rid("s"),
        kind: "business_overview",
        label: "Company information",
        visibility: "agent",
        required: false,
        enabled: true,
        fields: [
          { id: rid("f"), label: "Company name", value: "Assureway" },
          { id: rid("f"), label: "Business type", value: "Car Insurance Company" },
          { id: rid("f"), label: "Website", value: "https://assureway.ca/" },
          { id: rid("f"), label: "Main contact", value: "Eva Loewen-Samuels" },
          { id: rid("f"), label: "General inbox", value: "info@assureway.ca" },
          { id: rid("f"), label: "Claims inbox", value: "claims@assureway.ca" },
          { id: rid("f"), label: "Phone numbers", value: "1 888 209 4999 · 1 888 878 7424" },
        ],
      },
      {
        id: rid("s"),
        kind: "hours",
        label: "Hours & coverage",
        visibility: "agent",
        required: true,
        enabled: true,
        fields: [
          { id: rid("f"), label: "Coverage time (Fabric59)", value: "9 am – 5 pm, Monday to Friday, EST" },
          { id: rid("f"), label: "Client office hours", value: "Typically 9 am – 5 pm, Monday to Friday, EST (varies)" },
          { id: rid("f"), label: "Holidays", value: "Not opened on statutory holidays" },
        ],
      },
      {
        id: rid("s"),
        kind: "callback_policy",
        label: "Callback policy",
        visibility: "agent",
        required: true,
        enabled: true,
        fields: [
          { id: rid("f"), label: "Policy", value: "We do NOT call back. Take the message and dispatch — the client team follows up directly." },
        ],
      },
      {
        id: rid("s"),
        kind: "service_descriptions",
        label: "Department routing (PROMPT 2 vs PROMPT 4)",
        description: "Help the agent figure out which branch to take.",
        visibility: "agent",
        required: true,
        enabled: true,
        fields: [
          { id: rid("f"), label: "PROMPT 2 — Dealership", value: "Caller comes from an auto dealership. Collect dealership name + caller name + phone/email + notes. Closing depends on time: before 3pm EST = 'within the business day', after 3pm = 'within 1 business day'. Disposition: AW - DEALERSHIP." },
          { id: rid("f"), label: "PROMPT 4 — General Inquiry", value: "Everyone else. Collect name + phone + email + notes. Closing: 'expect to hear back within 3–5 business days.' Disposition: AW - General Inquiry." },
        ],
      },
      {
        id: rid("s"),
        kind: "special_handling",
        label: "If the caller persists (always-visible fallbacks)",
        description: "Read verbatim if the caller pushes for information the receptionist cannot give.",
        visibility: "agent",
        required: false,
        enabled: true,
        fields: [
          { id: rid("f"), label: "Fallback A — information limit", value: "Unfortunately, I do not have access to that information myself, but I will make sure your message is directed appropriately and someone will get back to you about this matter." },
          { id: rid("f"), label: "Fallback B — receptionist limit", value: "Unfortunately my access is limited as a receptionist, but if you are okay with it I can proceed to collect some information from you so our team can best assist you." },
          { id: rid("f"), label: "Fallback C — email path", value: "If a customer has an existing claim with Assureway, they can reply directly to the last email notification they received from claims@assureway.ca. For non-claim requests, they may email info@assureway.ca." },
        ],
      },

      {
        id: rid("s"),
        kind: "special_handling",
        label: "Address & staffing policy",
        visibility: "agent",
        required: true,
        enabled: true,
        fields: [
          { id: rid("f"), label: "Office address", value: "Office is closed to the public. Do NOT share the address — take a message and dispatch. Multiple locations exist including Head Office; the correct address is provided by the client team according to the request." },
          { id: rid("f"), label: "Staff hours in office", value: "AssureWay in-office staff hours vary and are NOT to be disclosed for any reason." },
          { id: rid("f"), label: "Service identity", value: 'Act as the in-house receptionist. Never use phrases like "call answering service", "forwarding service", or any variation.' },
        ],
      },
      {
        id: rid("s"),
        kind: "internal_notes",
        label: "Agent reminders (internal)",
        visibility: "internal",
        required: false,
        enabled: true,
        fields: [
          { id: rid("f"), label: "Worksheet rule", value: "Use the worksheet after the greeting — NOT the script. Go through the worksheet word for word. The first worksheet question is the same as the greeting." },
          { id: rid("f"), label: "Comments box", value: "Copy and paste the worksheet information collected into the comment box. No other comment needed." },
          { id: rid("f"), label: "Hold rule", value: "Disconnect the call if the caller is not actively speaking. Instruct them to call back rather than putting the call on hold." },
          { id: rid("f"), label: "Average handle time", value: "Avg call ~3 mins / wrap < 1 min" },
          { id: rid("f"), label: "Required language", value: "English" },
          { id: rid("f"), label: "Agent label", value: "In-house receptionist" },
        ],
      },
    ],
  };
}


function buildFlow(): CampaignFlowContent {
  const mk = (
    i: number,
    type: FlowStep["type"],
    title: string,
    config: Record<string, unknown>,
    extra: Partial<FlowStep> = {},
  ): FlowStep => ({
    id: rid("stp"),
    type,
    title,
    order: i,
    required: true,
    enabled: true,
    nextStepId: null,
    rules: [],
    config: config as FlowStep["config"],
    ...extra,
  });

  // Build all step objects up front so we can wire references.
  const greeting = mk(1, "information_display", "Greeting", {
    body: "Hi there, you've reached AssureWay. It seems like you're calling from a dealership; is that correct?",
  }, { required: false });

  const branch = mk(2, "question_branch", "Calling from a dealership?", {
    prompt: "Confirm: is the caller from an auto dealership?",
    options: [
      { id: rid("opt"), label: "Yes — dealership", goto: null },
      { id: rid("opt"), label: "No — general inquiry", goto: null },
    ],
  });

  // Dealership path
  const dealershipName = mk(3, "field_capture", "Dealership name", {
    fieldKey: "dealership_name", fieldType: "short_text", placeholder: "Dealership name",
    helper: "If not actually calling from a dealership, jump back to the branch step and pick 'No — general inquiry'.",
  }, { description: "What is the name of the dealership you are calling from?" });
  const dCaller = mk(4, "field_capture", "Caller name", {
    fieldKey: "caller_name", fieldType: "short_text", placeholder: "Full name",
  }, { description: "May I have your name, please?" });
  const dPhone = mk(5, "field_capture", "Best contact — phone", {
    fieldKey: "caller_phone", fieldType: "phone", placeholder: "Best phone number",
  }, { description: "What is the best way to reach you, phone or email? Take down both if given." });
  const dEmail = mk(6, "field_capture", "Email (if provided)", {
    fieldKey: "caller_email", fieldType: "email", placeholder: "name@example.com",
  }, { required: false, description: "Email — if also provided" });
  const dNotes = mk(7, "field_capture", "Call notes", {
    fieldKey: "call_notes", fieldType: "long_text", helper: "Take notes verbatim where possible.",
  }, { description: "What is your call regarding?" });
  const dClosing = mk(8, "information_display", "Closing — time-aware (dealership)", {
    body: "Mon–Fri before 3:00 pm EST:\n\"Thank you. I will have someone from our team return your call within the business day.\"\n\nMon–Fri after 3:00 pm EST:\n\"Thank you. Someone from our team will return your call within 1 business day.\"\n\nThank you for calling and have a nice day!",
    acknowledgement: "Read closing",
  }, { required: false });

  // General inquiry path
  const giPivot = mk(9, "information_display", "General inquiry pivot", {
    body: "You may have selected the incorrect prompt. Let me collect some information so that someone from our team can follow up with you.",
  }, { required: false });
  const giCaller = mk(10, "field_capture", "Caller name", {
    fieldKey: "caller_name", fieldType: "short_text", placeholder: "Full name",
  }, { description: "May I have your name, please?" });
  const giPhone = mk(11, "field_capture", "Phone number", {
    fieldKey: "caller_phone", fieldType: "phone", placeholder: "Best phone number",
  }, { description: "What is the best number to reach you?" });
  const giEmail = mk(12, "field_capture", "Email address", {
    fieldKey: "caller_email", fieldType: "email", placeholder: "name@example.com",
  }, { description: "May I have your email address, please?" });
  const giNotes = mk(13, "field_capture", "Call notes", {
    fieldKey: "call_notes", fieldType: "long_text", helper: "Take notes verbatim where possible.",
  }, { description: "What is your call regarding, please?" });
  const giClosing = mk(14, "information_display", "Closing — 3–5 business days (general inquiry)", {
    body: "Thank you. I will pass along your information to our team and you can expect to hear back from someone within 3–5 business days.\n\nThank you for calling and have a nice day!",
    acknowledgement: "Read closing",
  }, { required: false });

  // Shared tail
  const disposition = mk(15, "outcome_disposition", "Disposition", {
    destinationKey: "disposition",
    allowedOutcomes: [
      { code: "aw_dealership", label: "AW - DEALERSHIP", urgency: "normal" },
      { code: "aw_general_inquiry", label: "AW - General Inquiry", urgency: "normal" },
      { code: "wrong", label: "Wrong" },
      { code: "wrong_number", label: "Wrong Number" },
      { code: "marketing", label: "Marketing" },
      { code: "testing", label: "Testing" },
      { code: "caller_hung_up", label: "Caller hung up - disconnected" },
    ],
  });
  const notify = mk(16, "notification_trigger", "Email Office Admin", {
    channel: "email",
    target: "admin@assureway.ca",
    payloadSummary: {
      templates: {
        aw_dealership: {
          subject: "CALL from DEALERSHIP: {{dealership_name}}",
          body: "CALL TYPE: DEALERSHIP\nDEALERSHIP NAME: {{dealership_name}}\nCALLER NAME: {{caller_name}}\nPHONE #: {{caller_phone}}\nEMAIL: {{caller_email}}\nMESSAGE: {{call_notes}}",
        },
        aw_general_inquiry: {
          subject: "CALL for GENERAL INQUIRY: {{caller_name}}",
          body: "CALL TYPE: GENERAL INQUIRY\nCALLER NAME: {{caller_name}}\nPHONE #: {{caller_phone}}\nEMAIL: {{caller_email}}\nMESSAGE: {{call_notes}}",
        },
      },
      skipOutcomes: ["wrong", "wrong_number", "marketing", "testing", "caller_hung_up"],
    },
  }, { required: false });
  const end = mk(17, "end_flow", "End", { label: "End of session" }, { required: false });

  // Wire branch goto targets
  const branchCfg = branch.config as { options: { id: string; label: string; goto: string | null }[] };
  branchCfg.options[0].goto = dealershipName.id;
  branchCfg.options[1].goto = giPivot.id;

  // Sequential wiring
  greeting.nextStepId = branch.id;
  dealershipName.nextStepId = dCaller.id;
  dCaller.nextStepId = dPhone.id;
  dPhone.nextStepId = dEmail.id;
  dEmail.nextStepId = dNotes.id;
  dNotes.nextStepId = dClosing.id;
  dClosing.nextStepId = disposition.id;
  giPivot.nextStepId = giCaller.id;
  giCaller.nextStepId = giPhone.id;
  giPhone.nextStepId = giEmail.id;
  giEmail.nextStepId = giNotes.id;
  giNotes.nextStepId = giClosing.id;
  giClosing.nextStepId = disposition.id;
  disposition.nextStepId = notify.id;
  notify.nextStepId = end.id;

  // Hide per branch — only show the chosen path
  const dealershipIds = [dealershipName.id, dCaller.id, dPhone.id, dEmail.id, dNotes.id, dClosing.id];
  const giIds = [giPivot.id, giCaller.id, giPhone.id, giEmail.id, giNotes.id, giClosing.id];
  const hideWhenBranch = (label: string, targetId: string) => ({
    id: rid("rule"),
    groups: [{
      id: rid("grp"),
      combinator: "AND" as const,
      conditions: [{ id: rid("cond"), source: "__branch_label__", op: "eq" as const, value: label }],
    }],
    action: { type: "hide_step" as const, stepId: targetId },
  });
  branch.rules = [
    ...giIds.map((id) => hideWhenBranch("Yes — dealership", id)),
    ...dealershipIds.map((id) => hideWhenBranch("No — general inquiry", id)),
  ];

  // Skip notify on non-actionable dispositions — jump straight to end
  disposition.rules = [{
    id: rid("rule"),
    groups: [{
      id: rid("grp"),
      combinator: "AND" as const,
      conditions: [{
        id: rid("cond"), source: "__outcome__", op: "in" as const,
        value: ["wrong", "wrong_number", "marketing", "testing", "caller_hung_up"],
      }],
    }],
    action: { type: "jump_to" as const, stepId: end.id },
  }];

  const steps: FlowStep[] = [
    greeting, branch,
    dealershipName, dCaller, dPhone, dEmail, dNotes, dClosing,
    giPivot, giCaller, giPhone, giEmail, giNotes, giClosing,
    disposition, notify, end,
  ];
  return { schemaVersion: 1, steps, mappings: [] };
}

function buildFormSchema(): FormSchemaV1 {
  return {
    schemaVersion: 1,
    sections: [
      {
        id: cryptoRandomId(),
        title: "Department",
        description: "If this is a dealership call, complete this section.",
        fields: [
          { id: cryptoRandomId(), key: "dealership_name", type: "text", label: "Dealership name", required: false, helpText: "Required only when disposition = AW - DEALERSHIP" },
        ],
      },
      {
        id: cryptoRandomId(),
        title: "Caller information",
        fields: [
          { id: cryptoRandomId(), key: "caller_name", type: "text", label: "Caller name", required: true },
          { id: cryptoRandomId(), key: "caller_phone", type: "phone", label: "Phone number", required: true },
          { id: cryptoRandomId(), key: "caller_email", type: "email", label: "Email address", required: false },
          { id: cryptoRandomId(), key: "call_notes", type: "textarea", label: "Notes about the call", required: true },
        ],
      },
    ],
    logic: [
      {
        id: cryptoRandomId(),
        name: "Require dealership_name when disposition = AW - DEALERSHIP",
        groups: [{ all: [{ fieldKey: "__outcome__", op: "equals", value: "aw_dealership" }] }],
        actions: [{ type: "require_field", fieldKey: "dealership_name" }],
        enabled: true,
      },
    ],
    outcomes: [
      { key: "aw_dealership", label: "AW - DEALERSHIP", dispositionKey: "aw_dealership", notificationEmails: ["admin@assureway.ca"] },
      { key: "aw_general_inquiry", label: "AW - General Inquiry", dispositionKey: "aw_general_inquiry", notificationEmails: ["admin@assureway.ca"] },
      { key: "wrong", label: "Wrong" },
      { key: "wrong_number", label: "Wrong Number" },
      { key: "marketing", label: "Marketing" },
      { key: "testing", label: "Testing" },
      { key: "caller_hung_up", label: "Caller hung up - disconnected" },
    ],
  };
}


export function useSeedAssurewaySample() {
  const { workspace } = useWorkspace();
  const { user } = useAuth();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (): Promise<{ campaignId: string; created: boolean }> => {
      if (!workspace) throw new Error("No active workspace");
      const wsId = workspace.id;
      const orgId = workspace.organization_id;
      const uid = user?.id ?? null;

      // Step 1 — tenant
      toast.message("Loading Assureway sample", { description: "Creating client…" });
      let { data: existingTenant } = await supabase
        .from("tenants").select("id")
        .eq("workspace_id", wsId).eq("name", CLIENT_NAME).maybeSingle();
      let clientId: string;
      if (existingTenant?.id) {
        clientId = existingTenant.id;
      } else {
        const { data: t, error: tErr } = await supabase
          .from("tenants")
          .insert({ name: CLIENT_NAME, workspace_id: wsId, organization_id: orgId, status: "active" } as never)
          .select("id").single();
        if (tErr) throw tErr;
        clientId = t.id;
      }

      // Step 2 — campaign (rename legacy "General Inquiry" → "Main Reception" if present)
      toast.message("Loading Assureway sample", { description: "Creating campaign…" });
      const { data: legacyCampaign } = await supabase
        .from("campaigns").select("id, name")
        .eq("workspace_id", wsId).eq("client_id", clientId).eq("name", LEGACY_CAMPAIGN_NAME).maybeSingle();
      if (legacyCampaign?.id) {
        await supabase.from("campaigns").update({ name: CAMPAIGN_NAME } as never).eq("id", legacyCampaign.id);
      }
      let { data: existingCampaign } = await supabase
        .from("campaigns").select("id")
        .eq("workspace_id", wsId).eq("client_id", clientId).eq("name", CAMPAIGN_NAME).maybeSingle();
      let campaignId: string;
      let isExisting = false;
      if (existingCampaign?.id) {
        campaignId = existingCampaign.id;
        isExisting = true;
      } else {
        const { data: c, error: cErr } = await supabase
          .from("campaigns")
          .insert({
            workspace_id: wsId, client_id: clientId, name: CAMPAIGN_NAME,
            status: "draft", source_type: "canonical", created_by: uid,
          } as never)
          .select("id").single();
        if (cErr) throw cErr;
        campaignId = c.id;
      }

      // No early short-circuit: downstream steps compare content hashes and
      // only re-publish on actual change, so re-runs are cheap AND pick up
      // new flow/form revisions when this seeder is updated.
      void isExisting;

      // Step 3 — singleton workspace guide
      toast.message("Loading Assureway sample", { description: "Publishing firm guide…" });
      let { data: sg } = await supabase.from("guides")
        .select("id, current_version, status, metadata").eq("workspace_id", wsId)
        .eq("name", WORKSPACE_GUIDE_SINGLETON_NAME).is("source_type", null).maybeSingle();
      let guideId: string;
      if (sg?.id) {
        guideId = sg.id;
      } else {
        const { data: g, error: gErr } = await supabase.from("guides").insert({
          workspace_id: wsId, name: WORKSPACE_GUIDE_SINGLETON_NAME,
          description: "Canonical workspace guide",
          status: "draft", current_version: 1,
          metadata: { kind: WORKSPACE_GUIDE_SINGLETON_KIND, native: true } as never,
          created_by: uid,
        } as never).select("id").single();
        if (gErr) throw gErr;
        guideId = g.id;
      }
      const guideContent = buildGuide();
      const { data: latestGV } = await supabase.from("guide_versions")
        .select("version, content, is_current").eq("guide_id", guideId)
        .order("version", { ascending: false }).limit(1).maybeSingle();
      const sameGuide = latestGV?.is_current &&
        JSON.stringify(latestGV.content) === JSON.stringify(guideContent);
      if (!sameGuide) {
        const nextV = (latestGV?.version ?? 0) + 1;
        await supabase.from("guide_versions").update({ is_current: false }).eq("guide_id", guideId);
        const { error: vErr } = await supabase.from("guide_versions").insert({
          guide_id: guideId, version: nextV, content: guideContent as never,
          is_current: true, created_by: uid,
        } as never);
        if (vErr) throw vErr;
        await supabase.from("guides").update({ status: "published", current_version: nextV }).eq("id", guideId);
      }

      // Step 4 — campaign flow
      toast.message("Loading Assureway sample", { description: "Publishing decision tree…" });
      let { data: cf } = await supabase.from("guides")
        .select("id, status, current_version").eq("workspace_id", wsId)
        .eq("campaign_id", campaignId).eq("name", CAMPAIGN_FLOW_SENTINEL_NAME).maybeSingle();
      let flowId: string;
      if (cf?.id) {
        flowId = cf.id;
      } else {
        const { data: g, error: gErr } = await supabase.from("guides").insert({
          workspace_id: wsId, campaign_id: campaignId,
          name: CAMPAIGN_FLOW_SENTINEL_NAME, description: "Canonical campaign flow",
          status: "draft", current_version: 1,
          metadata: { kind: CAMPAIGN_FLOW_SENTINEL_KIND, native: true } as never,
          created_by: uid,
        } as never).select("id").single();
        if (gErr) throw gErr;
        flowId = g.id;
      }
      const flowContent = buildFlow();
      const { data: latestFV } = await supabase.from("guide_versions")
        .select("version, content, is_current").eq("guide_id", flowId)
        .order("version", { ascending: false }).limit(1).maybeSingle();
      const sameFlow = latestFV?.is_current &&
        JSON.stringify((latestFV.content as { steps?: unknown })?.steps) ===
          JSON.stringify(flowContent.steps);
      if (!sameFlow) {
        const nextV = (latestFV?.version ?? 0) + 1;
        await supabase.from("guide_versions").update({ is_current: false }).eq("guide_id", flowId);
        const { error: vErr } = await supabase.from("guide_versions").insert({
          guide_id: flowId, version: nextV, content: flowContent as never,
          is_current: true, created_by: uid,
        } as never);
        if (vErr) throw vErr;
        await supabase.from("guides").update({ status: "published", current_version: nextV }).eq("id", flowId);
      }

      // Step 5 — intake form (rename legacy form if found)
      toast.message("Loading Assureway sample", { description: "Publishing intake form…" });
      const schema = buildFormSchema();
      const { data: legacyForm } = await supabase.from("forms")
        .select("id, name").eq("workspace_id", wsId).eq("name", LEGACY_FORM_NAME).maybeSingle();
      if (legacyForm?.id) {
        await supabase.from("forms").update({ name: FORM_NAME } as never).eq("id", legacyForm.id);
      }
      let { data: existingForm } = await supabase.from("forms")
        .select("id, current_version").eq("workspace_id", wsId).eq("name", FORM_NAME).maybeSingle();
      let formId: string;
      if (existingForm?.id) {
        formId = existingForm.id;
        await supabase.from("forms").update({
          schema: schema as never, status: "published",
        } as never).eq("id", formId);
      } else {
        const { data: f, error: fErr } = await supabase.from("forms").insert({
          workspace_id: wsId, name: FORM_NAME,
          description: "Caller name, phone, email, and message — mirrors the canonical campaign flow.",
          schema: schema as never, status: "published", created_by: uid,
        } as never).select("id, current_version").single();
        if (fErr) throw fErr;
        formId = f.id;
      }
      // Ensure a v1 form_versions row exists & is current.
      const { data: existingFV } = await supabase.from("form_versions")
        .select("id, version, is_current").eq("form_id", formId)
        .order("version", { ascending: false }).limit(1).maybeSingle();
      if (!existingFV) {
        await supabase.from("form_versions").insert({
          form_id: formId, version: 1, schema: schema as never,
          is_current: true, created_by: uid,
        } as never);
        await supabase.from("forms").update({ current_version: 1 } as never).eq("id", formId);
      } else if (!existingFV.is_current) {
        await supabase.from("form_versions").update({ is_current: false }).eq("form_id", formId);
        await supabase.from("form_versions").update({ is_current: true }).eq("id", existingFV.id);
      }

      // Step 6 — attach form (single-active rule)
      toast.message("Loading Assureway sample", { description: "Attaching form to campaign…" });
      await supabase.from("form_campaign_assignments").delete()
        .eq("workspace_id", wsId).eq("campaign_id", campaignId);
      const { error: aErr } = await supabase.from("form_campaign_assignments").insert({
        workspace_id: wsId, form_id: formId, campaign_id: campaignId, created_by: uid,
      } as never);
      if (aErr) throw aErr;

      const stepCounts = flowContent.steps.reduce((acc, s) => {
        acc[s.type] = (acc[s.type] ?? 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      console.log("[seed-assureway] complete", {
        workspaceId: wsId,
        campaignId,
        campaignName: CAMPAIGN_NAME,
        stepCounts,
      });
      // Expected stepCounts: { information_display: 4, question_branch: 1, field_capture: 9, outcome_disposition: 1, notification_trigger: 1, end_flow: 1 }

      return { campaignId, created: true };
    },
    onSuccess: ({ campaignId, created }) => {
      if (!workspace) return;
      if (created) toast.success("Assureway sample loaded — opening campaign…");
      else toast.success("Assureway sample already loaded");
      navigate(`/w/${workspace.id}/campaigns/${campaignId}`);
    },
    onError: (e: Error) => {
      toast.error(`Seed failed: ${e.message}`);
    },
  });
}
