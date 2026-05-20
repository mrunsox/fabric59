import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";

/**
 * Regression — Form ↔ Campaign assignments.
 *
 * Covers:
 *  - useFormCampaignAssignments returns attached campaigns for a form
 *  - attachCampaign / detachCampaign mutate the underlying store
 *  - useCampaignIntakeForm enforces the single-active rule when swapping
 */

// ----- fake supabase store -----
type Row = { id: string; workspace_id: string; form_id: string; campaign_id: string; created_at: string; created_by: string | null };
const store: { rows: Row[] } = { rows: [] };
let idSeq = 0;

function makeQuery(initial: Row[]) {
  let rows = [...initial];
  const filters: Array<(r: Row) => boolean> = [];
  const api: any = {
    select: () => api,
    eq: (col: keyof Row, val: unknown) => {
      filters.push((r) => (r as any)[col] === val);
      return api;
    },
    order: () => api,
    limit: () => api,
    maybeSingle: async () => {
      const f = rows.filter((r) => filters.every((fn) => fn(r)));
      return { data: f[0] ?? null, error: null };
    },
    then: undefined,
  };
  // make awaitable for select chain
  api.then = (resolve: (v: { data: Row[]; error: null }) => void) => {
    const f = rows.filter((r) => filters.every((fn) => fn(r)));
    resolve({ data: f, error: null });
  };
  return api;
}

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      if (table !== "form_campaign_assignments") {
        // forms / campaigns reads aren't exercised here
        return { select: () => ({ eq: () => ({ order: () => ({ maybeSingle: async () => ({ data: null, error: null }), then: (r: any) => r({ data: [], error: null }) }), then: (r: any) => r({ data: [], error: null }) }) }) };
      }
      return {
        select: () => makeQuery(store.rows),
        insert: async (row: Omit<Row, "id" | "created_at">) => {
          store.rows.push({ ...row, id: `r${++idSeq}`, created_at: new Date().toISOString() });
          return { error: null };
        },
        delete: () => {
          const filters: Array<(r: Row) => boolean> = [];
          const api: any = {
            eq: (col: keyof Row, val: unknown) => {
              filters.push((r) => (r as any)[col] === val);
              return api;
            },
            then: (resolve: any) => {
              store.rows = store.rows.filter((r) => !filters.every((fn) => fn(r)));
              resolve({ error: null });
            },
          };
          return api;
        },
      };
    },
  },
}));

vi.mock("@/contexts/WorkspaceContext", () => ({
  useWorkspace: () => ({ workspace: { id: "w1", name: "WS", organization_id: "o1" } }),
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1" }, organization: { id: "o1" } }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { useFormCampaignAssignments, useCampaignIntakeForm } from "@/hooks/useFormCampaignAssignments";

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <TooltipProvider>{ui}</TooltipProvider>
    </QueryClientProvider>
  );
}

function FormHarness({ formId }: { formId: string }) {
  const { data = [], attachCampaign, detachCampaign } = useFormCampaignAssignments(formId);
  return (
    <div>
      <button data-testid="attach" onClick={() => attachCampaign("c1")}>attach</button>
      <button data-testid="attach2" onClick={() => attachCampaign("c2")}>attach2</button>
      <button data-testid="detach" onClick={() => detachCampaign("c1")}>detach</button>
      <pre data-testid="rows">{JSON.stringify(data.map((r) => r.campaign_id))}</pre>
    </div>
  );
}

function CampaignHarness({ campaignId }: { campaignId: string }) {
  const { data, setActive } = useCampaignIntakeForm(campaignId);
  return (
    <div>
      <button data-testid="set-a" onClick={() => setActive("fA")}>set A</button>
      <button data-testid="set-b" onClick={() => setActive("fB")}>set B</button>
      <button data-testid="clear" onClick={() => setActive(null)}>clear</button>
      <pre data-testid="active">{data?.form_id ?? "none"}</pre>
    </div>
  );
}

beforeEach(() => {
  store.rows = [];
  idSeq = 0;
});

describe("useFormCampaignAssignments", () => {
  it("attaches and detaches a campaign", async () => {
    const user = userEvent.setup();
    render(wrap(<FormHarness formId="f1" />));
    await waitFor(() => expect(screen.getByTestId("rows").textContent).toBe("[]"));

    await user.click(screen.getByTestId("attach"));
    await waitFor(() => expect(screen.getByTestId("rows").textContent).toBe('["c1"]'));

    await user.click(screen.getByTestId("attach2"));
    await waitFor(() =>
      expect(JSON.parse(screen.getByTestId("rows").textContent!)).toEqual(
        expect.arrayContaining(["c1", "c2"]),
      ),
    );

    await user.click(screen.getByTestId("detach"));
    await waitFor(() => expect(screen.getByTestId("rows").textContent).toBe('["c2"]'));
  });
});

describe("useCampaignIntakeForm — single-active rule", () => {
  it("setActive replaces any existing form on the same campaign", async () => {
    const user = userEvent.setup();
    render(wrap(<CampaignHarness campaignId="c1" />));
    await waitFor(() => expect(screen.getByTestId("active").textContent).toBe("none"));

    await user.click(screen.getByTestId("set-a"));
    await waitFor(() => expect(screen.getByTestId("active").textContent).toBe("fA"));
    expect(store.rows.filter((r) => r.campaign_id === "c1")).toHaveLength(1);

    await user.click(screen.getByTestId("set-b"));
    await waitFor(() => expect(screen.getByTestId("active").textContent).toBe("fB"));
    expect(store.rows.filter((r) => r.campaign_id === "c1")).toHaveLength(1);
    expect(store.rows[0].form_id).toBe("fB");

    await user.click(screen.getByTestId("clear"));
    await waitFor(() => expect(screen.getByTestId("active").textContent).toBe("none"));
    expect(store.rows).toHaveLength(0);
  });
});
