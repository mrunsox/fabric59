import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(process.cwd(), "src");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

describe("embed route isolation", () => {
  it("registers /embed/c/:campaignId outside auth shell", () => {
    const app = read("App.tsx");
    expect(app).toMatch(/path="\/embed\/c\/:campaignId"/);
    // It must be declared before the <Route element={<ProtectedRoute />}> wrapper,
    // OR not nested inside it. Sanity-check by ensuring the route line precedes
    // the first occurrence of ProtectedRoute opening tag.
    const embedIdx = app.indexOf('path="/embed/c/:campaignId"');
    const protectedIdx = app.indexOf("element={<ProtectedRoute />}");
    expect(embedIdx).toBeGreaterThan(0);
    expect(protectedIdx).toBeGreaterThan(0);
    expect(embedIdx).toBeLessThan(protectedIdx);
  });

  it("registers internal preview route inside workspace shell", () => {
    const app = read("App.tsx");
    expect(app).toMatch(/path="campaigns\/:campaignId\/embed-preview"/);
  });

  it("embed runner page does not import WorkspaceShell or OrgRail", () => {
    const src = read("pages/embed/EmbedCampaignRunnerPage.tsx");
    expect(src).not.toMatch(/WorkspaceShell|OrgRail|AdminShell/);
  });

  it("embed shell carries data-embed-shell marker for QA", () => {
    const src = read("components/embed/EmbedShell.tsx");
    expect(src).toMatch(/data-embed-shell="true"/);
  });
});

describe("publish minimal payload contract (resolver source)", () => {
  it("edge function never echoes the raw token in response", () => {
    const fn = fs.readFileSync(
      path.resolve(process.cwd(), "supabase/functions/campaign-embed-resolve/index.ts"),
      "utf8",
    );
    // The payload object must not include "token: "
    const payloadStart = fn.indexOf("const payload = {");
    const payloadEnd = fn.indexOf("};", payloadStart);
    const payloadBlock = fn.slice(payloadStart, payloadEnd);
    expect(payloadBlock).not.toMatch(/token\s*:/);
  });

  it("edge function notes the no-echo intent explicitly", () => {
    const fn = fs.readFileSync(
      path.resolve(process.cwd(), "supabase/functions/campaign-embed-resolve/index.ts"),
      "utf8",
    );
    expect(fn).toMatch(/token deliberately omitted/);
  });
});
