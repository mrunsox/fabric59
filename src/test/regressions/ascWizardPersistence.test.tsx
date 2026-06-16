import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "u-1" },
    organization: { id: "org-1", integration_configs: {} },
  }),
}));

// Spy-able supabase mock. Insert returns a generated id; update no-ops.
const insertSingle = vi.fn(async () => ({
  data: {
    id: "setup-generated-1",
    intake_data: { source: "asc-wizard", ascDraft: {} },
  },
  error: null,
}));
const updateEq = vi.fn(async () => ({ data: null, error: null }));
const captured = { insertRows: [] as unknown[], updates: [] as unknown[] };

vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      from: vi.fn(() => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
            single: async () => ({ data: null, error: null }),
          }),
        }),
        insert: (row: unknown) => {
          captured.insertRows.push(row);
          return {
            select: () => ({ single: insertSingle }),
          };
        },
        update: (row: unknown) => {
          captured.updates.push(row);
          return { eq: updateEq };
        },
      })),
    },
  };
});

import AscWizardPage from "@/pages/workspace/campaigns/asc/AscWizardPage";

const FLAG_KEY = "fabric59.features.ascWizard.enabled";

function mount() {
  return render(
    <MemoryRouter initialEntries={["/w/ws-1/campaigns/new/assisted"]}>
      <Routes>
        <Route
          path="/w/:workspaceId/campaigns/new/assisted"
          element={<AscWizardPage />}
        />
        <Route
          path="/w/:workspaceId/campaigns/new/manual"
          element={<div data-testid="manual">manual</div>}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ASC wizard persistence — campaign_setups.intake_data.ascDraft (Slice 2)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.localStorage.clear();
    window.localStorage.setItem(FLAG_KEY, "1");
    captured.insertRows.length = 0;
    captured.updates.length = 0;
    insertSingle.mockClear();
    updateEq.mockClear();
  });

  it("does NOT insert a campaign_setups row on mount (lazy)", async () => {
    mount();
    // Run timers; with no user input there's still no autosave trigger.
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(insertSingle).not.toHaveBeenCalled();
    expect(captured.insertRows).toHaveLength(0);
  });

  it("inserts on first autosave with intake_data.source='asc-wizard' and an ascDraft payload", async () => {
    mount();
    fireEvent.change(screen.getByTestId("asc-business-description"), {
      target: { value: "Dental answering service" },
    });
    await act(async () => {
      vi.advanceTimersByTime(900);
    });
    await waitFor(() => expect(insertSingle).toHaveBeenCalledTimes(1));
    expect(captured.insertRows).toHaveLength(1);
    const row = captured.insertRows[0] as Record<string, unknown>;
    expect(row.organization_id).toBe("org-1");
    expect(row.status).toBe("draft");
    const intake = row.intake_data as Record<string, unknown>;
    expect(intake.source).toBe("asc-wizard");
    const ascDraft = intake.ascDraft as { input: { business: { description: string } } };
    expect(ascDraft.input.business.description).toBe("Dental answering service");
    // campaign_name should reflect user input, not the scaffold placeholder.
    expect(row.campaign_name).toBe("Dental answering service");
  });

  it("subsequent autosaves UPDATE by the captured setup id (no second insert)", async () => {
    mount();
    fireEvent.change(screen.getByTestId("asc-business-description"), {
      target: { value: "First" },
    });
    await act(async () => {
      vi.advanceTimersByTime(900);
    });
    await waitFor(() => expect(insertSingle).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByTestId("asc-business-description"), {
      target: { value: "Second" },
    });
    await act(async () => {
      vi.advanceTimersByTime(900);
    });
    await waitFor(() => expect(updateEq).toHaveBeenCalledTimes(1));
    expect(insertSingle).toHaveBeenCalledTimes(1);
    const upd = captured.updates[0] as Record<string, unknown>;
    const intake = upd.intake_data as Record<string, unknown>;
    expect(intake.source).toBe("asc-wizard");
    const ascDraft = intake.ascDraft as { input: { business: { description: string } } };
    expect(ascDraft.input.business.description).toBe("Second");
  });
});
