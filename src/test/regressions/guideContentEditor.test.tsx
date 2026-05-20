import { describe, it, expect } from "vitest";
import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { GuideContentEditor } from "@/components/guides/GuideContentEditor";
import { guideContentV1Schema } from "@/lib/guides/guideContentSchema";
import { EMPTY_GUIDE_CONTENT, type GuideContentV1 } from "@/types/guide-content";

function Harness({
  initial = EMPTY_GUIDE_CONTENT,
  onSnapshot,
}: {
  initial?: GuideContentV1;
  onSnapshot?: (v: GuideContentV1) => void;
}) {
  const [v, setV] = useState<GuideContentV1>(initial);
  return (
    <>
      <GuideContentEditor
        value={v}
        onChange={(next) => {
          setV(next);
          onSnapshot?.(next);
        }}
      />
      <pre data-testid="snapshot">{JSON.stringify(v)}</pre>
    </>
  );
}

function snapshot(): GuideContentV1 {
  return JSON.parse(screen.getByTestId("snapshot").textContent || "{}");
}

function addBlock(label: RegExp) {
  fireEvent.click(screen.getByRole("button", { name: label }));
}

describe("GuideContentEditor", () => {
  it("adds, edits, deletes, and reorders blocks; output is valid V1", () => {
    render(<Harness />);
    addBlock(/add heading/i);
    addBlock(/add paragraph/i);

    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0], { target: { value: "Hello" } });
    fireEvent.change(inputs[1], { target: { value: "World" } });

    let s = snapshot();
    expect(s.blocks).toHaveLength(2);
    expect(s.blocks[0]).toMatchObject({ type: "heading", text: "Hello" });
    expect(s.blocks[1]).toMatchObject({ type: "paragraph", text: "World" });
    expect(guideContentV1Schema.safeParse(s).success).toBe(true);

    // Move paragraph up
    const moveUps = screen.getAllByRole("button", { name: /move up/i });
    fireEvent.click(moveUps[1]);
    s = snapshot();
    expect(s.blocks[0].type).toBe("paragraph");
    expect(s.blocks[1].type).toBe("heading");

    // Delete first
    fireEvent.click(screen.getAllByRole("button", { name: /delete block/i })[0]);
    s = snapshot();
    expect(s.blocks).toHaveLength(1);
    expect(s.blocks[0].type).toBe("heading");
  });

  it("promotes a pasted http(s) URL into connector href when label/href are empty", () => {
    render(<Harness />);
    addBlock(/add connector link/i);

    const label = screen.getByLabelText(/connector label/i) as HTMLInputElement;
    fireEvent.change(label, { target: { value: "https://portal.test/x" } });

    const s = snapshot();
    expect(s.blocks[0]).toMatchObject({
      type: "connector",
      href: "https://portal.test/x",
      label: "",
    });
  });

  it("does not promote non-URL text into href", () => {
    render(<Harness />);
    addBlock(/add connector link/i);
    const label = screen.getByLabelText(/connector label/i);
    fireEvent.change(label, { target: { value: "Open portal" } });
    const s = snapshot();
    expect(s.blocks[0]).toMatchObject({ type: "connector", label: "Open portal", href: "" });
  });
});
