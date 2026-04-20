// Writeback orchestrator — given a normalized Five9 event + resolved provider
// + action chain, executes the chain in order against the provider adapter,
// short-circuits on failure, and returns a structured result.

import type { LegalCrmAdapter, AdapterConnectionContext } from "./legal-crm-adapter.ts";
import type { SyncAction, AdapterResult } from "./normalized-entities.ts";

export interface OrchestrationResult {
  ok: boolean;
  steps: Array<{
    action: string;
    ok: boolean;
    status: number;
    data?: unknown;
    error?: string;
    retryable?: boolean;
  }>;
  context: Record<string, string>;
  failed_at?: number;
}

export async function executeActionChain(
  adapter: LegalCrmAdapter,
  ctx: AdapterConnectionContext,
  actions: SyncAction[],
  dryRun = false,
): Promise<OrchestrationResult> {
  const steps: OrchestrationResult["steps"] = [];
  const context: Record<string, string> = {};

  for (let i = 0; i < actions.length; i++) {
    const a = actions[i];
    if (dryRun) {
      steps.push({ action: a.action, ok: true, status: 200, data: { dry_run: true, payload: a.payload } });
      continue;
    }

    try {
      const result = await dispatchAction(adapter, ctx, a, context);
      steps.push({
        action: a.action,
        ok: result.ok,
        status: result.status,
        data: result.data,
        error: result.error,
        retryable: result.retryable,
      });
      if (!result.ok) {
        return { ok: false, steps, context, failed_at: i };
      }
      // Capture IDs into context so later steps can reference them.
      const data = result.data as any;
      if (a.action === "lookup_contact" && Array.isArray(data) && data[0]?.provider_id) {
        context.contact_id = data[0].provider_id;
      } else if (a.action === "create_contact" && data?.provider_id) {
        context.contact_id = data.provider_id;
      } else if (a.action === "lookup_matter" && Array.isArray(data) && data[0]?.provider_id) {
        context.matter_id = data[0].provider_id;
      } else if (a.action === "create_matter" && data?.provider_id) {
        context.matter_id = data.provider_id;
      } else if (a.action === "create_lead" && data?.provider_id) {
        context.lead_id = data.provider_id;
      }
    } catch (e) {
      steps.push({
        action: a.action,
        ok: false,
        status: 500,
        error: (e as Error).message,
        retryable: true,
      });
      return { ok: false, steps, context, failed_at: i };
    }
  }

  return { ok: true, steps, context };
}

async function dispatchAction(
  adapter: LegalCrmAdapter,
  ctx: AdapterConnectionContext,
  action: SyncAction,
  context: Record<string, string>,
): Promise<AdapterResult> {
  // Inject context IDs into the payload before dispatch.
  const payload: any = { ...action.payload };
  if (context.contact_id && payload.contact_id === undefined) payload.contact_id = context.contact_id;
  if (context.matter_id && payload.matter_id === undefined) payload.matter_id = context.matter_id;
  if (context.lead_id && payload.lead_id === undefined) payload.lead_id = context.lead_id;

  switch (action.action) {
    case "lookup_contact":
      return adapter.searchContact(ctx, payload);
    case "create_contact":
      return adapter.createContact(ctx, payload);
    case "update_contact":
      if (!adapter.updateContact || !payload.contact_id) {
        return { ok: false, status: 501, error: "update_contact unavailable" };
      }
      return adapter.updateContact(ctx, payload.contact_id, payload);
    case "lookup_matter":
      return adapter.searchMatter(ctx, payload);
    case "create_matter":
      if (!adapter.createMatter) return { ok: false, status: 501, error: "create_matter unsupported" };
      return adapter.createMatter(ctx, payload);
    case "create_lead":
      if (!adapter.createLead) return { ok: false, status: 501, error: "create_lead unsupported" };
      return adapter.createLead(ctx, payload);
    case "create_note":
      return adapter.createNote(ctx, payload);
    case "create_task":
      if (!adapter.createTask) return { ok: false, status: 501, error: "create_task unsupported" };
      return adapter.createTask(ctx, payload);
    case "create_activity":
      if (!adapter.createActivity) return { ok: false, status: 501, error: "create_activity unsupported" };
      return adapter.createActivity(ctx, payload);
    default:
      return { ok: false, status: 400, error: `unknown action: ${action.action}` };
  }
}
