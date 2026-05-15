import { describe, it, expect, vi } from "vitest";
import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FormRunner } from "@/components/forms/runtime/FormRunner";
import type { FormSchemaV1 } from "@/types/form-schema";

function makeSchema(): FormSchemaV1 {
  return {
    schemaVersion: 1,
    sections: [
      {
        id: "s1", title: "Triage", description: "",
        fields: [
          { id: "g1", key: "greeting", type: "script_block", label: "Greeting", content: "Thank you for calling." },
          { id: "f1", key: "reason", type: "select", label: "Reason", required: true,
            options: [
              { label: "Billing", value: "billing" },
              { label: "Sales", value: "sales" },
            ] },
        ],
      },
      {
        id: "s_billing", title: "Billing", description: "",
        fields: [{ id: "f2", key: "billing_note", type: "text", label: "Billing note" }],
      },
      {
        id: "s_sales", title: "Sales", description: "",
        fields: [{ id: "f3", key: "company", type: "text", label: "Company" }],
      },
    ],
    logic: [
      {
        id: "r_jump_billing",
        groups: [{ all: [{ fieldKey: "reason", op: "equals", value: "billing" }] }],
        actions: [{ type: "jump_to_section", sectionId: "s_billing" }],
      },
      {
        id: "r_end_sales",
        groups: [{ all: [{ fieldKey: "reason", op: "equals", value: "sales" }] }],
        actions: [{ type: "end_with_outcome", outcomeKey: "lead_captured" }],
      },
    ],
    outcomes: [{ key: "lead_captured", label: "Lead captured", description: "Forwarded to sales." }],
  };
}

describe("FormRunner — branching + validation", () => {
  it("renders a script_block as presentational, validates required, and jumps via logic", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(<FormRunner schema={makeSchema()} />);

    const runner = await screen.findByTestId("form-runner");
    expect(runner.querySelector('[data-field-type="script_block"]')).toBeTruthy();

    // Required validation: clicking Next without picking Reason shows error.
    await user.click(within(runner).getByRole("button", { name: /next/i }));
    await waitFor(() => {
      expect(within(runner).getByText(/required/i)).toBeInTheDocument();
    });

    // Pick Billing → logic jump_to_section advances to "Billing".
    const trigger = within(runner).getByRole("combobox");
    await user.click(trigger);
    const option = await screen.findByRole("option", { name: "Billing" });
    await user.click(option);

    await waitFor(() => {
      expect(within(screen.getByTestId("form-runner")).getByText(/Section 2 of 3|Billing/i)).toBeTruthy();
    });
  });

  it("end_with_outcome short-circuits the runner", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const onSubmit = vi.fn();
    render(<FormRunner schema={makeSchema()} onSubmit={onSubmit} />);
    const runner = await screen.findByTestId("form-runner");

    const trigger = within(runner).getByRole("combobox");
    await user.click(trigger);
    const option = await screen.findByRole("option", { name: "Sales" });
    await user.click(option);

    const ended = await screen.findByTestId("form-runner");
    await waitFor(() => {
      expect(ended.getAttribute("data-ended-outcome")).toBe("lead_captured");
    });
    expect(within(ended).getByText("Lead captured")).toBeInTheDocument();

    await user.click(within(ended).getByRole("button", { name: /wrap up/i }));
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ outcomeKey: "lead_captured" }),
    );
  });
});
