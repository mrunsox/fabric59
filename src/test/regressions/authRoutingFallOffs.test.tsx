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
  it("source short-circuits when signUp returns no session, before any org insert", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "src/contexts/AuthContext.tsx"),
      "utf8",
    );
    // The signUp function must check for !authData.session AND return an
    // actionable error BEFORE the organizations insert runs. We assert
    // both the guard and that the no-session branch returns an error,
    // and that the guard appears before the organizations insert.
    const signUpStart = src.indexOf("const signUp = async");
    const orgInsert = src.indexOf('.from("organizations")', signUpStart);
    const sessionGuard = src.indexOf("!authData.session", signUpStart);
    expect(signUpStart).toBeGreaterThan(-1);
    expect(sessionGuard).toBeGreaterThan(-1);
    expect(orgInsert).toBeGreaterThan(-1);
    expect(sessionGuard).toBeLessThan(orgInsert);
    expect(/check your email/i.test(src.slice(signUpStart, orgInsert))).toBe(true);
  });
});

describe("AuthContext.signOut · clears onboarding scratch state", () => {
  it("removes any fabric59:onboarding:* localStorage keys on sign-out", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "src/contexts/AuthContext.tsx"),
      "utf8",
    );
    const signOutStart = src.indexOf("const signOut = async");
    expect(signOutStart).toBeGreaterThan(-1);
    const signOutSlice = src.slice(signOutStart, signOutStart + 1000);
    expect(signOutSlice).toMatch(/fabric59:onboarding:/);
    expect(signOutSlice).toMatch(/removeItem/);
  });
});

describe("AcceptInvitePage · tokenized invite no longer silently drops", () => {
  it("renders an explicit terminal state when authenticated user arrives with a token", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "src/pages/auth/AcceptInvitePage.tsx"),
      "utf8",
    );
    expect(src).toMatch(/isAuthenticated && token/);
    expect(src).toMatch(/not yet wired/i);
  });
});

describe("LoginPage · does not silently bounce signed-in users", () => {
  it("only auto-redirects authenticated users when ?continue=1 is present", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "src/pages/auth/LoginPage.tsx"),
      "utf8",
    );
    // Guard must require an explicit continue marker before issuing the
    // redirect to /launch. Without this, authenticated users get shunted to
    // /onboarding with no way back.
    expect(src).toMatch(/shouldContinue\s*=\s*params\.get\("continue"\)\s*===\s*"1"/);
    expect(src).toMatch(/isAuthenticated && shouldContinue/);
  });

  it("renders an interstitial with a sign-out action for already-authenticated visitors", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "src/pages/auth/LoginPage.tsx"),
      "utf8",
    );
    expect(src).toMatch(/Already signed in/);
    expect(src).toMatch(/Sign out and use a different account/);
    expect(src).toMatch(/signOut\(\)/);
  });

  it("post-signin submit forwards through /login?continue=1 so the guard fires", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "src/pages/auth/LoginPage.tsx"),
      "utf8",
    );
    expect(src).toMatch(/\/login\?continue=1/);
  });
});

describe("OnboardingPage · visible sign-out escape hatch", () => {
  it("renders a sign-out control wired to AuthContext.signOut and /login", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const src = fs.readFileSync(
      path.resolve(process.cwd(), "src/pages/onboarding/OnboardingPage.tsx"),
      "utf8",
    );
    expect(src).toMatch(/data-testid="onboarding-sign-out"/);
    expect(src).toMatch(/signOut\(\)/);
    expect(src).toMatch(/navigate\("\/login"/);
  });
});
