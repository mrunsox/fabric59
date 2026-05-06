import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// --- Mocks --------------------------------------------------------------

vi.mock("@/integrations/supabase/client", () => {
  const channel = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
  };
  const queryBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: [], error: null }),
  };
  return {
    supabase: {
      from: vi.fn(() => queryBuilder),
      channel: vi.fn(() => channel),
      removeChannel: vi.fn(),
    },
  };
});

vi.mock("@/hooks/useTenants", () => ({
  useTenants: () => ({ data: [{ id: "t1", name: "Acme" }] }),
}));

vi.mock("@/hooks/useScenarioDeviations", () => ({
  useScenarioDeviations: () => ({
    data: {
      resolved: { scenario: "resolved", total: 0, deviations: 0, reasons: [], sampleSessions: [] },
      callback: { scenario: "callback", total: 0, deviations: 0, reasons: [], sampleSessions: [] },
      escalation: { scenario: "escalation", total: 0, deviations: 0, reasons: [], sampleSessions: [] },
      failed: { scenario: "failed", total: 0, deviations: 0, reasons: [], sampleSessions: [] },
    },
    loading: false,
    error: null,
    updatedAt: new Date(),
  }),
}));

import CallFlowPage from "../CallFlowPage";

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/superadmin/call-flow"]}>
        <CallFlowPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("/superadmin/call-flow smoke", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders page header and core sections", () => {
    renderPage();
    expect(screen.getByRole("heading", { level: 1, name: /call flow/i })).toBeInTheDocument();
    expect(screen.getByText(/Live state counters/i)).toBeInTheDocument();
    expect(screen.getByText(/Lifecycle legend/i)).toBeInTheDocument();
    expect(screen.getByText(/Master lifecycle flow/i)).toBeInTheDocument();
    expect(screen.getByText(/Scenario-specific flows/i)).toBeInTheDocument();
  });

  it("renders all five lifecycle phases in master flow", () => {
    renderPage();
    for (const phase of ["Before Call", "During Call", "ACW", "Disposition", "Post Disposition"]) {
      expect(screen.getAllByText(new RegExp(phase, "i")).length).toBeGreaterThan(0);
    }
  });

  it("switches scenario tabs on click", () => {
    renderPage();
    const callbackTab = screen.getByRole("button", { name: /callback required/i });
    fireEvent.click(callbackTab);
    expect(
      screen.getByText(/Live call did not fully resolve/i),
    ).toBeInTheDocument();

    const escalation = screen.getByRole("button", { name: /escalation/i });
    fireEvent.click(escalation);
  });

  it("wires lifecycle impl refs with edge/table links to dev nav", () => {
    const { container } = renderPage();
    const links = Array.from(container.querySelectorAll("a[href]"));
    const hrefs = links.map((a) => a.getAttribute("href") ?? "");
    expect(hrefs.some((h) => h.startsWith("/superadmin/logs?fn="))).toBe(true);
    expect(hrefs.some((h) => h.startsWith("/superadmin/exports?table="))).toBe(true);
    expect(hrefs.some((h) => h.includes("fn=five9-main"))).toBe(true);
  });

  it("renders live call state counter buckets", () => {
    renderPage();
    const counters = screen.getByText(/Live call session counters/i).closest("div")!.parentElement!;
    expect(within(counters).getByText(/Active \/ Connected/i)).toBeInTheDocument();
    expect(within(counters).getByText(/Queued \/ Routing/i)).toBeInTheDocument();
    expect(within(counters).getByText(/ACW \(Wrap-up\)/i)).toBeInTheDocument();
    expect(within(counters).getByText(/Failed \/ Abandoned/i)).toBeInTheDocument();
  });
});
