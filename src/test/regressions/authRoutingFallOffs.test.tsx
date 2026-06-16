import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

/**
 * Regression: routing fall-offs in auth/onboarding pipeline.
 *
 * Covers three concrete bugs that previously fell off the floor:
 *   1. ProtectedRoute redirected master admins with no org into /onboarding
 *      instead of letting /superadmin take them.
 *   2. OnboardingPage's "Skip for now" navigated to /launch when the user had
 *      no workspace, which then bounced back into /onboarding (infinite loop).
 *      We assert the file no longer contains the `/launch` skip target.
 *   3. AuthContext.signUp attempted org insert when the project requires
 *      email confirmation (no session). We assert it now short-circuits with
 *      a "Check your email" message.
 */

type AuthMock = {
  isAuthenticated: boolean;
  isLoading: boolean;
  organization: { id: string } | null;
  isMasterAdmin: boolean;
};

const authState: AuthMock = {
  isAuthenticated: true,
  isLoading: false,
  organization: null,
  isMasterAdmin: false,
};

vi.mock("@/contexts/AuthContext", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/contexts/AuthContext")>();
  return {
    ...actual,
    useAuth: () => authState,
  };
});

function renderProtected(initialPath: string) {
  let landed = "";
  const Probe = ({ where }: { where: string }) => {
    landed = where;
    return <div>{where}</div>;
  };
  const view = render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/admin" element={<Probe where="/admin" />} />
          <Route path="/superadmin" element={<Probe where="/superadmin" />} />
          <Route path="/onboarding" element={<Probe where="/onboarding" />} />
          <Route path="/launch" element={<Probe where="/launch" />} />
        </Route>
        <Route path="/login" element={<Probe where="/login" />} />
      </Routes>
    </MemoryRouter>,
  );
  return { ...view, getLanded: () => landed };
}

describe("ProtectedRoute · master-admin no-org guard", () => {
  beforeEach(() => {
    authState.isAuthenticated = true;
    authState.isLoading = false;
    authState.organization = null;
    authState.isMasterAdmin = false;
  });

  it("regular user with no org and hitting /admin → /onboarding", async () => {
    const { getLanded } = renderProtected("/admin");
    await waitFor(() => expect(getLanded()).toBe("/onboarding"));
  });

  it("master admin with no org and hitting /admin → /superadmin (not /onboarding)", async () => {
    authState.isMasterAdmin = true;
    const { getLanded } = renderProtected("/admin");
    await waitFor(() => expect(getLanded()).toBe("/superadmin"));
  });

  it("master admin with no org and hitting /onboarding stays on /onboarding", async () => {
    authState.isMasterAdmin = true;
    const { getLanded } = renderProtected("/onboarding");
    await waitFor(() => expect(getLanded()).toBe("/onboarding"));
  });

  it("/launch is allowed through with no org so the resolver can run", async () => {
    const { getLanded } = renderProtected("/launch");
    await waitFor(() => expect(getLanded()).toBe("/launch"));
  });
});

describe("OnboardingPage · handleSkipForNow no longer bounces through /launch", () => {
  it("source no longer routes a missing-workspace skip into /launch", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "src/pages/onboarding/OnboardingPage.tsx"),
      "utf8",
    );
    // Old footgun: `const target = existing ? \`/w/${existing.id}/campaigns\` : "/launch";`
    // The fix keeps the user on /onboarding with a toast instead.
    expect(/handleSkipForNow[\s\S]*"\/launch"/.test(src)).toBe(false);
  });
});

describe("AuthContext.signUp · email-confirmation short-circuit", () => {
  beforeEach(() => {
    vi.resetModules();
  });
  afterEach(() => {
    vi.doUnmock("@/integrations/supabase/client");
  });

  it("returns 'Check your email' and skips org insert when no session is returned", async () => {
    const orgInsert = vi.fn();
    const memberInsert = vi.fn();
    vi.doMock("@/integrations/supabase/client", () => ({
      supabase: {
        auth: {
          signUp: vi.fn().mockResolvedValue({
            data: { user: { id: "u1" }, session: null },
            error: null,
          }),
          onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
          getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
          signInWithPassword: vi.fn(),
          signOut: vi.fn(),
        },
        from: vi.fn((table: string) => {
          if (table === "organizations") {
            return {
              insert: (..._args: unknown[]) => {
                orgInsert();
                return { select: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) };
              },
            };
          }
          if (table === "organization_members") {
            return { insert: (..._args: unknown[]) => { memberInsert(); return Promise.resolve({ error: null }); } };
          }
          return {
            select: () => ({ eq: () => ({ eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }) }) }),
          };
        }),
      },
    }));

    // Import and render AuthProvider, exercise signUp via the context.
    const React = await import("react");
    const { render: r, act } = await import("@testing-library/react");
    const mod = await import("@/contexts/AuthContext");

    let result: { error: Error | null } | null = null;
    function Probe() {
      const { signUp } = mod.useAuth();
      React.useEffect(() => {
        (async () => {
          result = await signUp("new@example.com", "pw1234", "Acme");
        })();
      }, [signUp]);
      return null;
    }

    await act(async () => {
      r(
        <mod.AuthProvider>
          <Probe />
        </mod.AuthProvider>,
      );
    });
    await waitFor(() => expect(result).not.toBeNull());
    expect(result!.error).toBeTruthy();
    expect(result!.error!.message).toMatch(/check your email/i);
    expect(orgInsert).not.toHaveBeenCalled();
    expect(memberInsert).not.toHaveBeenCalled();
  });
});
