/**
 * Phase 8 — Settings UI regression.
 *
 * Validates the per-row "effective / source / editability" structure, and
 * that disabling ASC with approved facts opens a confirm dialog before the
 * write fires.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import BusinessBrainSettingsPage from "@/pages/workspace/settings/BusinessBrainSettingsPage";

// --- mocks --------------------------------------------------------------

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    organization: {
      id: "org-1",
      integration_configs: {
        features: { businessBrain: { enabled: true, asc: { enabled: true } } },
      },
    },
    isWorkspaceAdmin: true,
    workspaceRole: "owner",
  }),
}));

vi.mock("@/contexts/WorkspaceContext", () => ({
  useWorkspace: () => ({ workspace: { id: "ws-1", name: "Acme" } }),
}));

const updateSpy = vi.fn(() => ({ eq: () => ({ error: null }) }));
const upsertSpy = vi.fn(() => ({ error: null }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      if (table === "organizations") return { update: updateSpy };
      if (table === "bb_workspace_vertical_profiles") return { upsert: upsertSpy };
      if (table === "bb_facts") {
        return {
          select: () => ({
            eq: () => ({ eq: () => Promise.resolve({ count: 3 }) }),
          }),
        };
      }
      if (table === "bb_vertical_profiles") {
        return {
          select: () => ({
            order: () =>
              Promise.resolve({
                data: [{ id: "vp-1", slug: "local_gov", label: "Local Gov", description: "" }],
              }),
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: null }),
            }),
          }),
        };
      }
      if (table === "platform_events") {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                gte: () => ({
                  order: () => ({
                    limit: () => Promise.resolve({ data: [], error: null }),
                  }),
                }),
              }),
            }),
          }),
        };
      }
      return { select: () => ({}) };
    },
    auth: { getUser: () => Promise.resolve({ data: { user: null } }) },
    functions: { invoke: vi.fn(() => Promise.resolve({})) },
  },
}));

vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));

vi.mock("@/lib/business-brain/bridge/governance", async () => ({
  getWorkspaceVerticalProfile: async () => null,
  triggerVerticalEvaluation: vi.fn(async () => ({ ok: true })),
}));

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/w/ws-1/settings/brain"]}>
        <Routes>
          <Route path="/w/:workspaceId/settings/brain" element={<BusinessBrainSettingsPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  updateSpy.mockClear();
  upsertSpy.mockClear();
});

describe("bbSettingsUi", () => {
  it("renders effective state, source, and editability badges per flag row", async () => {
    renderPage();
    await waitFor(() => screen.getByText("Business Brain core UI"));
    // Core UI flag is `true` in mock → effective On, source = Org, editable.
    const ons = screen.getAllByText("On");
    expect(ons.length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Source: org/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Editable here/i).length).toBeGreaterThan(0);
  });

  it("opens a confirm dialog when disabling ASC while facts exist", async () => {
    renderPage();
    await waitFor(() => screen.getByText("ASC advisory"));
    // Wait for fact count to load (3).
    await waitFor(() => expect(screen.queryAllByRole("switch").length).toBeGreaterThan(0));
    const ascSwitch = screen
      .getAllByRole("switch")
      .find((el) => el.getAttribute("aria-label") === "Toggle ASC advisory")!;
    fireEvent.click(ascSwitch);
    await waitFor(() => screen.getByText(/Disable asc/i));
    expect(screen.getByText(/approved facts/i)).toBeInTheDocument();
    // Cancel — no write.
    fireEvent.click(screen.getByText("Cancel"));
    expect(updateSpy).not.toHaveBeenCalled();
  });
});
