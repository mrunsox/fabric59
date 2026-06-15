import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import { useRunnerCardOrder } from "@/hooks/useRunnerCardOrder";
import { DraggableStack } from "@/components/call-runner/DraggableStack";

function Harness({
  knownIds,
  campaignId = "c-1",
}: {
  knownIds: string[];
  campaignId?: string;
}) {
  const { order, setOrder, reset, isCustom } = useRunnerCardOrder({
    knownIds,
    workspaceId: "ws-1",
    campaignId,
    userId: "u-1",
  });
  return (
    <div>
      <DraggableStack
        items={knownIds.map((id) => ({ id, label: id, node: <div data-testid={`card-${id}`}>{id}</div> }))}
        order={order}
        onOrderChange={setOrder}
      />
      <button data-testid="reset" onClick={reset}>reset</button>
      <span data-testid="order">{order.join(",")}</span>
      <span data-testid="custom">{String(isCustom)}</span>
    </div>
  );
}

describe("Runner card reorder", () => {
  beforeEach(() => window.localStorage.clear());

  it("renders all known cards in default order", () => {
    render(<Harness knownIds={["copilot", "transfer", "resources"]} />);
    expect(screen.getByTestId("order").textContent).toBe("copilot,transfer,resources");
    expect(screen.getByTestId("custom").textContent).toBe("false");
  });

  it("persists a custom order to localStorage and restores on remount", () => {
    const known = ["copilot", "transfer", "resources"];
    const key = "fabric59:runner:rightStack:v1:main:u-1:ws-1:c-1";
    window.localStorage.setItem(key, JSON.stringify(["resources", "copilot", "transfer"]));
    render(<Harness knownIds={known} />);
    expect(screen.getByTestId("order").textContent).toBe("resources,copilot,transfer");
    expect(screen.getByTestId("custom").textContent).toBe("true");
  });

  it("prunes unknown ids and appends new ones", () => {
    const key = "fabric59:runner:rightStack:v1:main:u-1:ws-1:c-1";
    window.localStorage.setItem(key, JSON.stringify(["resources", "ghost", "copilot"]));
    render(<Harness knownIds={["copilot", "transfer", "resources"]} />);
    // ghost dropped, transfer appended at end
    expect(screen.getByTestId("order").textContent).toBe("resources,copilot,transfer");
  });

  it("keyboard reorder moves an item and announces", async () => {
    render(<Harness knownIds={["a", "b", "c"]} />);
    const handle = screen.getByLabelText(/Reorder a/i);
    handle.focus();
    await act(async () => {
      handle.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
      handle.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
      handle.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
    });
    expect(screen.getByTestId("order").textContent).toBe("b,a,c");
  });

  it("reset clears persisted order", () => {
    const key = "fabric59:runner:rightStack:v1:main:u-1:ws-1:c-1";
    window.localStorage.setItem(key, JSON.stringify(["resources", "copilot", "transfer"]));
    render(<Harness knownIds={["copilot", "transfer", "resources"]} />);
    expect(screen.getByTestId("custom").textContent).toBe("true");
    act(() => {
      screen.getByTestId("reset").click();
    });
    expect(screen.getByTestId("order").textContent).toBe("copilot,transfer,resources");
    expect(window.localStorage.getItem(key)).toBeNull();
  });
});
