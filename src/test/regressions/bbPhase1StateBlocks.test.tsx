/**
 * Phase 1 — Disabled / permission / dead-end states.
 *
 * Verifies the shared `BbStateBlock` distinguishes every state kind with a
 * stable `data-bb-state-kind` attribute (so callers can render
 * surface-specific copy without losing structural identity), and that
 * `BbPermissionDenied` always renders as a noPermission state.
 */
import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { BbStateBlock, type BbStateKind } from "@/components/business-brain/BbStateBlock";
import { BbPermissionDenied } from "@/components/business-brain/BbPermissionDenied";

const KINDS: BbStateKind[] = [
  "loading",
  "empty",
  "noData",
  "failed",
  "noPermission",
  "upcoming",
];

describe("BbStateBlock", () => {
  it("renders a distinct data-bb-state-kind for every kind", () => {
    const seen = new Set<string>();
    for (const kind of KINDS) {
      const { container, unmount } = render(
        <BbStateBlock kind={kind} title={`title for ${kind}`} />,
      );
      const el = container.querySelector("[data-bb-state-kind]");
      expect(el).not.toBeNull();
      expect(el?.getAttribute("data-bb-state-kind")).toBe(kind);
      seen.add(kind);
      unmount();
    }
    expect(seen.size).toBe(KINDS.length);
  });

  it("never falls back to a generic shared message — caller copy is preserved", () => {
    const { getByText } = render(
      <BbStateBlock kind="failed" title="custom failure copy" />,
    );
    expect(getByText("custom failure copy")).toBeTruthy();
  });
});

describe("BbPermissionDenied", () => {
  it("always renders as a noPermission state with the named resource and role", () => {
    const { container, getByText } = render(
      <BbPermissionDenied
        resource="Brain settings"
        requiredRole="workspace admin or owner"
      />,
    );
    expect(
      container
        .querySelector("[data-bb-state-kind]")
        ?.getAttribute("data-bb-state-kind"),
    ).toBe("noPermission");
    expect(getByText(/Brain settings/)).toBeTruthy();
    expect(getByText(/workspace admin or owner/)).toBeTruthy();
  });
});
