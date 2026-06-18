import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import BbStaleFactDrawer from "@/components/business-brain/BbStaleFactDrawer";
import type { StaleFactView } from "@/lib/business-brain/selectors";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ organization: { id: "org-1" } }),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }) },
}));
vi.mock("sonner", () => ({ toast: { success: () => {}, error: () => {} } }));

function wrap(ui: React.ReactElement) {
  return <QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>;
}

const fact: StaleFactView = {
  id: "f1", workspaceId: "ws-1",
  entityType: "phone", displayName: "Main line",
  staleState: "stale_due_to_age",
  staleReasons: ["stale_due_to_age"],
  lastReviewedAt: new Date(Date.now() - 100 * 86400_000).toISOString(),
  lastUsedAt: null,
  intervalDays: 60,
  usageScore: 4.2,
  usageBreakdown: {
    searchOpens: 2, searchMarkedUseful: 1, searchMarkedNotUseful: 0,
    ascUsed: 0, ascDismissed: 0,
    assistOpened: 1, assistCopied: 0, assistInserted: 0,
  },
};

describe("BbStaleFactDrawer", () => {
  it("renders explainable usage breakdown so reviewers see the signals", () => {
    render(wrap(<BbStaleFactDrawer fact={fact} onClose={() => {}} />));
    expect(screen.getByText(/Usage breakdown/i)).toBeTruthy();
    expect(screen.getByText(/Search opens: 2/)).toBeTruthy();
    expect(screen.getByText(/Assist opened: 1/)).toBeTruthy();
    expect(screen.getByText(/Mark reviewed/i)).toBeTruthy();
    expect(screen.getByText(/Mark needs update/i)).toBeTruthy();
  });
});
