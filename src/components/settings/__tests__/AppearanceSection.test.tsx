/**
 * Vertical Skin System — Phase 6
 * Admin appearance section tests.
 *
 * Mocks the Phase 3 hooks so we exercise the form/preview behavior
 * deterministically without touching Supabase.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

import type { ThemeConfig } from "@/lib/skins/themeConfig";

// ---- hook mocks ------------------------------------------------------------

const mutate = vi.fn();
let currentConfig: ThemeConfig = { skinId: "general", branding: {} };

vi.mock("@/hooks/useOrganizationThemeConfig", () => ({
  useOrganizationThemeConfig: () => ({
    config: currentConfig,
    rawRow: null,
    isLoading: false,
    error: null,
  }),
  useUpdateOrganizationThemeConfig: () => ({
    mutate,
    isPending: false,
  }),
}));

import AppearanceSection from "@/components/settings/AppearanceSection";

beforeEach(() => {
  mutate.mockReset();
  currentConfig = { skinId: "general", branding: {} };
  cleanup();
});

function selectSkin(value: string) {
  // Radix Select renders a hidden native <select> for a11y in jsdom is not
  // available, so we toggle the trigger and click the option.
  const trigger = screen.getByRole("combobox", { name: /skin/i });
  fireEvent.click(trigger);
  const option = screen.getByRole("option", { name: new RegExp(value, "i") });
  fireEvent.click(option);
}

describe("AppearanceSection", () => {
  it("hydrates form from existing org theme config", () => {
    currentConfig = {
      skinId: "legal",
      branding: { brandName: "Acme Law", logoUrl: "https://x/y.png" },
    };
    render(<AppearanceSection />);
    expect((screen.getByLabelText(/brand name/i) as HTMLInputElement).value).toBe("Acme Law");
    expect((screen.getByLabelText(/logo url/i) as HTMLInputElement).value).toBe("https://x/y.png");
    // Save disabled when there are no changes vs. hydrated config.
    expect(screen.getByRole("button", { name: /save changes/i })).toBeDisabled();
  });

  it("falls back to general when no skin is set", () => {
    currentConfig = { skinId: "general", branding: {} };
    render(<AppearanceSection />);
    expect(screen.getAllByText(/general/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/fallback/i).length).toBeGreaterThan(0);
  });

  it("shows starter pack + copy preset preview deterministically per skin", () => {
    currentConfig = { skinId: "medical", branding: {} };
    render(<AppearanceSection />);
    // Medical → patient noun
    expect(screen.getByTestId("preview-copy-preset").textContent).toMatch(/medical/i);
    expect(screen.getByText("patient")).toBeInTheDocument();
  });

  it("marks form dirty and enables Save when the user edits brand name", () => {
    render(<AppearanceSection />);
    const brand = screen.getByLabelText(/brand name/i);
    fireEvent.change(brand, { target: { value: "New Brand" } });
    expect(screen.getByText(/unsaved changes/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /save changes/i })).not.toBeDisabled();
  });

  it("Reset reverts unsaved changes", () => {
    render(<AppearanceSection />);
    const brand = screen.getByLabelText(/brand name/i) as HTMLInputElement;
    fireEvent.change(brand, { target: { value: "Temp" } });
    expect(brand.value).toBe("Temp");
    fireEvent.click(screen.getByRole("button", { name: /reset/i }));
    expect(brand.value).toBe("");
    expect(screen.queryByText(/unsaved changes/i)).not.toBeInTheDocument();
  });

  it("Save calls the update mutation with the current form state", () => {
    render(<AppearanceSection />);
    fireEvent.change(screen.getByLabelText(/brand name/i), { target: { value: "Persisted" } });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    expect(mutate).toHaveBeenCalledTimes(1);
    const arg = mutate.mock.calls[0][0] as ThemeConfig;
    expect(arg.skinId).toBe("general");
    expect(arg.branding.brandName).toBe("Persisted");
  });

  it("primary color override is only persisted when HSL triplet is valid", () => {
    render(<AppearanceSection />);
    fireEvent.change(screen.getByLabelText(/primary color/i), { target: { value: "notvalid" } });
    fireEvent.change(screen.getByLabelText(/brand name/i), { target: { value: "X" } });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    let arg = mutate.mock.calls[0][0] as ThemeConfig;
    expect(arg.branding.tokens).toBeUndefined();

    mutate.mockReset();
    fireEvent.change(screen.getByLabelText(/primary color/i), {
      target: { value: "120 50% 40%" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));
    arg = mutate.mock.calls[0][0] as ThemeConfig;
    expect(arg.branding.tokens?.light?.colors?.primary).toBe("120 50% 40%");
    expect(arg.branding.tokens?.dark?.colors?.primary).toBe("120 50% 40%");
  });

  it("changing the skin updates the preview without persisting", () => {
    render(<AppearanceSection />);
    expect(screen.getByTestId("preview-copy-preset").textContent).toMatch(/general/i);
    selectSkin("Legal");
    expect(screen.getByTestId("preview-copy-preset").textContent).toMatch(/legal/i);
    expect(mutate).not.toHaveBeenCalled();
  });
});
