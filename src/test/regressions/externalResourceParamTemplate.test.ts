import { describe, it, expect } from "vitest";
import {
  renderTemplate,
  resolveResourceUrl,
} from "@/lib/external-resources/resolveParams";

describe("resource param templating", () => {
  it("substitutes allow-listed tokens, URL-encoded", () => {
    const out = renderTemplate("{{ani}} - {{agentName}}", {
      ani: "555 123",
      agentName: "Bob & Alice",
    });
    // each value URL-encoded
    expect(out).toBe("555%20123 - Bob%20%26%20Alice");
  });

  it("drops unknown tokens silently", () => {
    const out = renderTemplate("a={{ani}}&x={{secret}}", { ani: "1" });
    expect(out).toBe("a=1&x=");
  });

  it("resolves field.<key> from captured fields", () => {
    const out = renderTemplate("{{field.policy_id}}", { capturedFields: { policy_id: "P-9" } });
    expect(out).toBe("P-9");
  });

  it("attaches query params from template", () => {
    const r = resolveResourceUrl(
      "https://book.example.com/slot",
      { ani: "555", agentName: "Bob" },
      { phone: "{{ani}}", agent: "{{agentName}}" },
    );
    expect(r.url).toContain("phone=555");
    expect(r.url).toContain("agent=Bob");
    expect(r.unresolved).toEqual([]);
    expect(r.droppedParams).toEqual([]);
  });

  it("drops empty params and tracks unresolved tokens", () => {
    const r = resolveResourceUrl(
      "https://book.example.com",
      { ani: "555" },
      { phone: "{{ani}}", email: "{{callerEmail}}" },
    );
    expect(r.url).toContain("phone=555");
    expect(r.url).not.toContain("email=");
    expect(r.droppedParams).toContain("email");
    expect(r.unresolved).toContain("callerEmail");
  });

  it("preserves existing query and hash on the URL", () => {
    const r = resolveResourceUrl(
      "https://book.example.com/x?existing=yes#anchor",
      { ani: "555" },
      { phone: "{{ani}}" },
    );
    expect(r.url).toContain("existing=yes");
    expect(r.url).toContain("phone=555");
    expect(r.url).toMatch(/#anchor$/);
  });

  it("never produces a non-http URL", () => {
    const r = resolveResourceUrl(
      "https://book.example.com",
      { ani: "555" },
      { phone: "{{ani}}" },
    );
    expect(r.url.startsWith("https://")).toBe(true);
  });

  it("does not inject script-style values", () => {
    const r = resolveResourceUrl(
      "https://book.example.com",
      { ani: "<script>alert(1)</script>" },
      { phone: "{{ani}}" },
    );
    // The encoded form must not contain raw < or >
    expect(r.url).not.toMatch(/<script>/);
  });
});
