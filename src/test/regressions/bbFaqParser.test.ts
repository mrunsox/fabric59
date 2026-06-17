/**
 * Business Brain — FAQ paste parser (Slice 2).
 */
import { describe, it, expect } from "vitest";
import { parseFaqText } from "@/lib/business-brain/faqParser";

describe("Business Brain — parseFaqText", () => {
  it("parses Q:/A: marker format", () => {
    const text = [
      "Q: What are your hours?",
      "A: Mon-Fri 9-5 ET.",
      "",
      "Q: Do you take credit cards?",
      "A: Yes, all major cards.",
    ].join("\n");
    const pairs = parseFaqText(text);
    expect(pairs).toHaveLength(2);
    expect(pairs[0].question).toContain("hours");
    expect(pairs[1].answer).toContain("credit cards");
  });

  it("parses numbered FAQ format", () => {
    const text = [
      "1. What is your fee?",
      "Our consultation fee is $250.",
      "2. Do you offer payment plans?",
      "Yes, we offer plans for retainers over $2,500.",
    ].join("\n");
    const pairs = parseFaqText(text);
    expect(pairs).toHaveLength(2);
    expect(pairs[0].question).toContain("fee");
  });

  it("parses blank-line separated Q?\\nA paragraphs", () => {
    const text = [
      "How do I schedule a consult?",
      "Call our intake line or use the form on our website.",
      "",
      "What documents should I bring?",
      "Photo ID and any contracts relevant to your case.",
    ].join("\n");
    const pairs = parseFaqText(text);
    expect(pairs).toHaveLength(2);
  });

  it("dedupes by normalized question", () => {
    const text = [
      "Q: What are your hours?",
      "A: 9-5.",
      "Q: WHAT ARE YOUR HOURS?",
      "A: 9-5.",
    ].join("\n");
    expect(parseFaqText(text)).toHaveLength(1);
  });

  it("returns empty array for unparseable prose so AI fallback runs", () => {
    const text =
      "Our firm has been around since 1995. We help people with family matters, estate planning, and small business work.";
    expect(parseFaqText(text)).toEqual([]);
  });

  it("returns empty array when only one pair is detected (avoid low-signal fast path)", () => {
    expect(parseFaqText("Q: hi?\nA: yes")).toEqual([]);
  });
});
