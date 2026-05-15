import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { emptyFormSchemaV1, type FormSchemaV1 } from "@/types/form-schema";

/**
 * Builder smoke — Phase C lock.
 *
 * Renders WorkspaceFormBuilderPage with the form hooks mocked, exercises
 * Add section + 3 different field types, then switches to Preview and
 * asserts FormRunner mirrors them. Uses findBy* / waitFor for stability.
 */

let currentSchema: FormSchemaV1 = emptyFormSchemaV1();

vi.mock("@/hooks/useWorkspaceForms", () => ({
  useWorkspaceForm: () => ({
    data: {
      id: "f1",
      workspace_id: "w1",
      name: "Test Form",
      description: null,
      status: "draft",
      schema: currentSchema,
      metadata: {},
      current_version: 1,
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  }),
  useFormSchema: () => ({ data: currentSchema }),
  useUpdateFormSchema: () => ({
    mutateAsync: vi.fn(async (s: FormSchemaV1) => {
      currentSchema = s;
    }),
    isPending: false,
  }),
  useFormVersionsV1: () => ({ data: [], isLoading: false }),
  usePublishForm: () => ({ mutateAsync: vi.fn(async () => {}), isPending: false }),
}));

import WorkspaceFormBuilderPage from "@/pages/workspace/WorkspaceFormBuilderPage";

beforeEach(() => {
  currentSchema = emptyFormSchemaV1();
});

function renderBuilder() {
  return render(
    <TooltipProvider>
      <MemoryRouter initialEntries={["/w/w1/forms/f1/edit"]}>
        <Routes>
          <Route path="/w/:workspaceId/forms/:formId/edit" element={<WorkspaceFormBuilderPage />} />
        </Routes>
      </MemoryRouter>
    </TooltipProvider>,
  );
}

describe("WorkspaceFormBuilderPage — smoke", () => {
  it("adds a section, 3 field types, and previews them via FormRunner", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderBuilder();

    // Add a second section.
    const addSection = await screen.findByTestId("add-section");
    await user.click(addSection);

    // Open Add field dropdown and pick three different types in succession.
    for (const type of ["text", "email", "select"]) {
      const trigger = await screen.findByTestId("add-field-trigger");
      await user.click(trigger);
      const item = await screen.findByTestId(`add-field-${type}`);
      await user.click(item);
    }

    // Center field list should now show 3 rows.
    await waitFor(() => {
      const list = screen.getByTestId("field-list");
      expect(within(list).getAllByRole("button").length).toBeGreaterThanOrEqual(3);
    });

    // Switch to Preview tab.
    await user.click(screen.getByTestId("tab-preview"));

    // FormRunner mounts. Fields were added to the second (newly added) section,
    // so click "Next" to reach it before asserting field renders.
    const runner = await screen.findByTestId("form-runner");
    const nextBtn = await within(runner).findByRole("button", { name: /next/i });
    await user.click(nextBtn);

    await waitFor(() => {
      expect(runner.querySelector('[data-field-type="text"]')).toBeTruthy();
      expect(runner.querySelector('[data-field-type="email"]')).toBeTruthy();
      expect(runner.querySelector('[data-field-type="select"]')).toBeTruthy();
    });
  });
});
