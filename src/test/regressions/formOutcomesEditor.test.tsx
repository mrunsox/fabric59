import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { OutcomesEditor } from "@/components/forms/builder/OutcomesEditor";
import { emptyFormSchemaV1, type FormSchemaV1 } from "@/types/form-schema";

vi.mock("@/hooks/useDispositions", () => ({
  useDispositions: () => ({
    data: [
      { id: "d1", name: "Sale" },
      { id: "d2", name: "Callback" },
    ],
  }),
}));

function Harness({ initial }: { initial: FormSchemaV1 }) {
  const [schema, setSchema] = useState(initial);
  return (
    <TooltipProvider>
      <OutcomesEditor schema={schema} onChange={setSchema} />
      <pre data-testid="snap">{JSON.stringify(schema.outcomes)}</pre>
    </TooltipProvider>
  );
}

function readOutcomes(): FormSchemaV1["outcomes"] {
  return JSON.parse(screen.getByTestId("snap").textContent || "[]");
}

describe("OutcomesEditor", () => {
  it("adds, edits, persists notification emails, and deletes outcomes", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    render(<Harness initial={emptyFormSchemaV1()} />);

    await user.click(screen.getByTestId("add-outcome"));
    expect(readOutcomes()).toHaveLength(1);

    const labelInput = screen.getByTestId("outcome-label-0");
    await user.clear(labelInput);
    await user.type(labelInput, "Lead Captured");

    const emailsInput = screen.getByTestId("outcome-emails-0");
    await user.type(emailsInput, "ops@acme.com{Enter}");
    await user.type(emailsInput, "qa@acme.com,");

    const outcomes = readOutcomes();
    expect(outcomes[0].label).toBe("Lead Captured");
    expect(outcomes[0].notificationEmails).toEqual(["ops@acme.com", "qa@acme.com"]);

    await user.click(screen.getByTestId("remove-outcome-0"));
    expect(readOutcomes()).toHaveLength(0);
  });

  it("renders the selected dispositionKey on the outcome's disposition control", () => {
    const initial: FormSchemaV1 = {
      ...emptyFormSchemaV1(),
      outcomes: [
        { key: "lead", label: "Lead", dispositionKey: "Sale", notificationEmails: [] },
      ],
    };
    render(<Harness initial={initial} />);
    const trigger = screen.getByTestId("outcome-disposition-0");
    expect(trigger.textContent).toContain("Sale");
    // And the schema still carries the dispositionKey end-to-end.
    expect(readOutcomes()[0].dispositionKey).toBe("Sale");
  });
});
