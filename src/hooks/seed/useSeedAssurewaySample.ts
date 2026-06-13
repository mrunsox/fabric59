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
        kind: "special_handling",
        label: "If the caller persists (always-visible fallbacks)",
        description: "Read verbatim if the caller pushes for information the receptionist cannot give.",
        visibility: "agent",
        required: false,
        enabled: true,
        fields: [
          { id: rid("f"), label: "Fallback A — information limit", value: "Unfortunately, I do not have access to that information myself, but I will make sure your message is directed appropriately and someone will get back to you about this matter." },
          { id: rid("f"), label: "Fallback B — receptionist limit", value: "Unfortunately my access is limited as a receptionist, but if you are okay with it I can proceed to collect some information from you so our team can best assist you." },
          { id: rid("f"), label: "Fallback C — email path", value: "If you would like to detail your request by email to info@assureway.ca, they may be able to respond to you sooner." },
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
    required = true,
  ): FlowStep => ({
    id: rid("stp"),
    type,
    title,
    order: i,
    required,
    enabled: true,
    nextStepId: null,
    rules: [],
    config: config as FlowStep["config"],
  });

  // ---- Shared ----
  const greeting = mk(1, "information_display", "Greeting", {
    body: "Hi there, you've reached AssureWay. How can I help you today?",
  }, false);

  // Branch step (goto wired after we have target ids)
  const branch = mk(2, "question_branch", "Department", {
    prompt: "Are you calling about a dealership matter, or a general inquiry?",
    options: [
      { id: rid("opt"), label: "Dealership", goto: null },
      { id: rid("opt"), label: "General Inquiry", goto: null },
    ],
  });

  // ---- Dealership branch (orders 10–18) ----
  const dName = mk(10, "field_capture", "Dealership · Caller name", {
    fieldKey: "dealership_caller_name", fieldType: "short_text",
    placeholder: "May I have your name, please?",
    helper: "May I have your name, please?",
  });
  const dPhone = mk(11, "field_capture", "Dealership · Phone", {
    fieldKey: "dealership_caller_phone", fieldType: "phone",
    placeholder: "Best number to reach you?",
    helper: "What is the best number to reach you?",
  });
  const dEmail = mk(12, "field_capture", "Dealership · Email", {
    fieldKey: "dealership_caller_email", fieldType: "email",
    placeholder: "May I have your email address?",
    helper: "May I have your email address, please?",
  });
  const dNotes = mk(13, "field_capture", "Dealership · Notes", {
    fieldKey: "dealership_call_notes", fieldType: "long_text",
    placeholder: "What is your call regarding?",
    helper: "Capture verbatim where possible.",
  });
  const dWrap = mk(14, "information_display", "Dealership · Wrap-up", {
    body: "Thank you. I will pass along your information to our dealership team — you can expect to hear back within 3–5 business days.",
  }, false);
  const dDispo = mk(15, "outcome_disposition", "Dealership · Disposition", {
    destinationKey: "disposition",
    allowedOutcomes: [
      { code: "aw_dealership", label: "AW - Dealership", urgency: "normal" },
      { code: "wrong", label: "Wrong" },
      { code: "marketing", label: "Marketing" },
      { code: "testing", label: "Testing" },
      { code: "caller_hung_up", label: "Caller hung up - disconnected" },
    ],
  });
  const dNotify = mk(16, "notification_trigger", "Dealership · Notify team", {
    channel: "email",
    target: "admin@assureway.ca",
    payloadSummary: {
      templates: {
        aw_dealership: {
          subject: "CALL from DEALERSHIP: {{dealership_caller_name}}",
          body: "Name: {{dealership_caller_name}}\nPhone: {{dealership_caller_phone}}\nEmail: {{dealership_caller_email}}\nNotes: {{dealership_call_notes}}",
        },
      },
      skipOutcomes: ["wrong", "marketing", "testing", "caller_hung_up"],
    },
  }, false);

  // ---- General Inquiry branch (orders 20–28) ----
  const gName = mk(20, "field_capture", "General · Caller name", {
    fieldKey: "caller_name", fieldType: "short_text",
    placeholder: "May I have your name, please?",
    helper: "May I have your name, please?",
  });
  const gPhone = mk(21, "field_capture", "General · Phone", {
    fieldKey: "caller_phone", fieldType: "phone",
    placeholder: "Best number to reach you?",
    helper: "What is the best number to reach you?",
  });
  const gEmail = mk(22, "field_capture", "General · Email", {
    fieldKey: "caller_email", fieldType: "email",
    placeholder: "May I have your email address?",
    helper: "May I have your email address, please?",
  });
  const gNotes = mk(23, "field_capture", "General · Notes", {
    fieldKey: "call_notes", fieldType: "long_text",
    placeholder: "What is your call regarding?",
    helper: "Capture verbatim where possible.",
  });
  const gWrap = mk(24, "information_display", "General · Wrap-up", {
    body: "Thank you. I will pass along your information to our team — you can expect to hear back within 3–5 business days.",
  }, false);
  const gDispo = mk(25, "outcome_disposition", "General · Disposition", {
    destinationKey: "disposition",
    allowedOutcomes: [
      { code: "aw_general_inquiry", label: "AW - General Inquiry", urgency: "normal" },
      { code: "wrong", label: "Wrong" },
      { code: "marketing", label: "Marketing" },
      { code: "testing", label: "Testing" },
      { code: "caller_hung_up", label: "Caller hung up - disconnected" },
    ],
  });
  const gNotify = mk(26, "notification_trigger", "General · Notify team", {
    channel: "email",
    target: "admin@assureway.ca",
    payloadSummary: {
      templates: {
        aw_general_inquiry: {
          subject: "CALL from CUSTOMER: GENERAL INQUIRY — {{caller_name}}",
          body: "Name: {{caller_name}}\nPhone: {{caller_phone}}\nEmail: {{caller_email}}\nNotes: {{call_notes}}",
        },
      },
      skipOutcomes: ["wrong", "marketing", "testing", "caller_hung_up"],
    },
  }, false);

  const end = mk(99, "end_flow", "End", { label: "End of call" }, false);

  // Wire branch gotos
  const branchCfg = branch.config as { options: { id: string; label: string; goto: string | null }[] };
  branchCfg.options[0].goto = dName.id;
  branchCfg.options[1].goto = gName.id;

  // Hide-step rules so each branch's outline only shows its own steps.
  const dealershipIds = [dName.id, dPhone.id, dEmail.id, dNotes.id, dWrap.id, dDispo.id, dNotify.id];
  const generalIds = [gName.id, gPhone.id, gEmail.id, gNotes.id, gWrap.id, gDispo.id, gNotify.id];

  const hideWhenBranch = (label: string, targetId: string) => ({
    id: rid("rule"),
    groups: [
      {
        id: rid("grp"),
        combinator: "AND" as const,
        conditions: [
          { id: rid("cond"), source: "__branch_label__", op: "eq" as const, value: label },
        ],
      },
    ],
    action: { type: "hide_step" as const, stepId: targetId },
  });

  // When General Inquiry is chosen, hide all Dealership steps (attach on branch step).
  branch.rules = [
    ...generalIds.map((id) => hideWhenBranch("Dealership", id)),
    ...dealershipIds.map((id) => hideWhenBranch("General Inquiry", id)),
  ];

  // Jump-to-end on non-actionable dispositions.
  const skipOutcomes = ["wrong", "marketing", "testing", "caller_hung_up"];
  const jumpToEnd = () => ({
    id: rid("rule"),
    groups: [
      {
        id: rid("grp"),
        combinator: "AND" as const,
        conditions: [
          { id: rid("cond"), source: "__outcome__", op: "in" as const, value: skipOutcomes },
        ],
      },
    ],
    action: { type: "jump_to" as const, stepId: end.id },
  });
  dDispo.rules = [jumpToEnd()];
  gDispo.rules = [jumpToEnd()];

  // Sequential wiring inside each branch (last node points to end).
  dNotify.nextStepId = end.id;
  gNotify.nextStepId = end.id;

  const steps: FlowStep[] = [
    greeting, branch,
    dName, dPhone, dEmail, dNotes, dWrap, dDispo, dNotify,
    gName, gPhone, gEmail, gNotes, gWrap, gDispo, gNotify,
    end,
  ];
  return { schemaVersion: 1, steps, mappings: [] };
}

function buildFormSchema(): FormSchemaV1 {
  return {
    schemaVersion: 1,
    sections: [
      {
        id: cryptoRandomId(),
        title: "General Inquiry",
        description: "Used when the caller selects General Inquiry on the branch.",
        fields: [
          { id: cryptoRandomId(), key: "caller_name", type: "text", label: "Caller name", required: false, placeholder: "Full name" },
          { id: cryptoRandomId(), key: "caller_phone", type: "phone", label: "Phone number", required: false, placeholder: "Best number to reach the caller" },
          { id: cryptoRandomId(), key: "caller_email", type: "email", label: "Email address", required: false, placeholder: "name@example.com" },
          { id: cryptoRandomId(), key: "call_notes", type: "textarea", label: "Notes about the call", required: false, helpText: "What is the call regarding? Capture verbatim where possible." },
        ],
      },
      {
        id: cryptoRandomId(),
        title: "Dealership",
        description: "Used when the caller selects Dealership on the branch.",
        fields: [
          { id: cryptoRandomId(), key: "dealership_caller_name", type: "text", label: "Caller name", required: false, placeholder: "Full name" },
          { id: cryptoRandomId(), key: "dealership_caller_phone", type: "phone", label: "Phone number", required: false, placeholder: "Best number to reach the caller" },
          { id: cryptoRandomId(), key: "dealership_caller_email", type: "email", label: "Email address", required: false, placeholder: "name@example.com" },
          { id: cryptoRandomId(), key: "dealership_call_notes", type: "textarea", label: "Notes about the call", required: false, helpText: "Capture verbatim where possible." },
        ],
      },
    ],
    logic: [],
    outcomes: [
      { key: "aw_general_inquiry", label: "AW - General Inquiry", dispositionKey: "aw_general_inquiry", notificationEmails: ["admin@assureway.ca"] },
      { key: "aw_dealership", label: "AW - Dealership", dispositionKey: "aw_dealership", notificationEmails: ["admin@assureway.ca"] },
      { key: "wrong", label: "Wrong" },
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

      // Step 2 — campaign
      toast.message("Loading Assureway sample", { description: "Creating campaign…" });
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

      // Short-circuit if everything already exists.
      if (isExisting) {
        const { data: fa } = await supabase.from("form_campaign_assignments")
          .select("id").eq("campaign_id", campaignId).limit(1).maybeSingle();
        const { data: cf } = await supabase.from("guides")
          .select("id, status").eq("workspace_id", wsId).eq("campaign_id", campaignId)
          .eq("name", CAMPAIGN_FLOW_SENTINEL_NAME).maybeSingle();
        if (fa && cf && cf.status === "published") {
          return { campaignId, created: false };
        }
      }

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

      // Step 5 — intake form
      toast.message("Loading Assureway sample", { description: "Publishing intake form…" });
      const schema = buildFormSchema();
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
