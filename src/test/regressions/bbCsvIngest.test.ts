/**
 * Business Brain — csv parser & deterministic extraction (Slice 2).
 */
import { describe, it, expect } from "vitest";
import {
  autoMapHeaders,
  normalizeRow,
  looksLikePersonName,
  rowsToExtractions,
} from "@/lib/business-brain/csvParser";

describe("Business Brain — CSV autoMapHeaders", () => {
  it("maps common header variants to canonical fields", () => {
    const m = autoMapHeaders([
      "Full Name",
      "Title",
      "Department",
      "Phone Number",
      "Ext",
      "Email",
      "Label",
      "Notes",
    ]);
    expect(m["Full Name"]).toBe("name");
    expect(m["Title"]).toBe("role");
    expect(m["Department"]).toBe("department");
    expect(m["Phone Number"]).toBe("phone");
    expect(m["Ext"]).toBe("extension");
    expect(m["Email"]).toBe("email");
    expect(m["Label"]).toBe("label");
    expect(m["Notes"]).toBe("notes");
  });

  it("falls back to 'ignore' for unknown columns", () => {
    const m = autoMapHeaders(["foo", "bar", "Cost Center"]);
    expect(m["foo"]).toBe("ignore");
    expect(m["bar"]).toBe("ignore");
    expect(m["Cost Center"]).toBe("ignore");
  });
});

describe("Business Brain — normalizeRow", () => {
  it("drops ignored columns and trims values", () => {
    const row = normalizeRow(
      { A: " Jane ", B: "Partner", C: "secret" },
      { A: "name", B: "role", C: "ignore" },
    );
    expect(row).toEqual({ name: "Jane", role: "Partner" });
  });
});

describe("Business Brain — looksLikePersonName", () => {
  it("accepts plausible person names", () => {
    expect(looksLikePersonName("Jane Doe")).toBe(true);
    expect(looksLikePersonName("Dr. Smith")).toBe(true);
  });
  it("rejects business labels in the name column", () => {
    expect(looksLikePersonName("Billing Line")).toBe(false);
    expect(looksLikePersonName("Front Desk")).toBe(false);
    expect(looksLikePersonName("After-Hours Support")).toBe(false);
    expect(looksLikePersonName("")).toBe(false);
    expect(looksLikePersonName(undefined)).toBe(false);
  });
});

describe("Business Brain — rowsToExtractions (deterministic CSV)", () => {
  it("emits staff + phone + department for a normal team row", () => {
    const exts = rowsToExtractions([
      {
        name: "Jane Doe",
        role: "Partner",
        department: "Family Law",
        phone: "(212) 555-0100",
        email: "jane@example.com",
      },
    ]);
    const types = exts.map((e) => e.entity_type).sort();
    expect(types).toEqual(["department", "phone", "staff"]);
    const staff = exts.find((e) => e.entity_type === "staff")!;
    expect(staff.payload.name).toBe("Jane Doe");
    expect(staff.payload.email).toBe("jane@example.com");
    const phone = exts.find((e) => e.entity_type === "phone")!;
    expect(phone.payload.number).toBe("(212) 555-0100");
    // No destination_contact for a named staff row.
    expect(exts.some((e) => e.entity_type === "destination_contact")).toBe(false);
  });

  it("emits destination_contact ONLY for a labeled non-person row", () => {
    const exts = rowsToExtractions([
      {
        label: "Billing Line",
        phone: "(212) 555-0199",
        notes: "After hours sends to vm",
      },
    ]);
    const types = exts.map((e) => e.entity_type).sort();
    expect(types).toEqual(["destination_contact", "phone"]);
    expect(exts.some((e) => e.entity_type === "staff")).toBe(false);
    const dest = exts.find((e) => e.entity_type === "destination_contact")!;
    expect(dest.payload.channel).toBe("phone");
    expect(dest.payload.label).toBe("Billing Line");
  });

  it("does NOT emit destination_contact for a staff row whose label looks billing-like", () => {
    // Mixed-row regression: a real staff member who happens to be labeled
    // "Billing Lead" must NOT be reclassified as a destination_contact.
    const exts = rowsToExtractions([
      {
        name: "Alex Rivera",
        role: "Billing Lead",
        label: "Billing Line",
        phone: "5551234567",
      },
    ]);
    expect(exts.some((e) => e.entity_type === "destination_contact")).toBe(false);
    expect(exts.some((e) => e.entity_type === "staff")).toBe(true);
    expect(exts.some((e) => e.entity_type === "phone")).toBe(true);
  });

  it("dedupes repeated departments, phones, and staff across rows", () => {
    const exts = rowsToExtractions([
      { name: "Jane Doe", department: "Family Law", phone: "212-555-0100" },
      { name: "John Roe", department: "Family Law", phone: "212-555-0100" },
      { name: "Jane Doe", department: "family   law", phone: "(212) 555.0100" },
    ]);
    const counts = (t: string) => exts.filter((e) => e.entity_type === t).length;
    expect(counts("department")).toBe(1);
    expect(counts("phone")).toBe(1);
    expect(counts("staff")).toBe(2);
  });

  it("skips phone numbers under 7 digits", () => {
    const exts = rowsToExtractions([{ name: "Jane Doe", phone: "123" }]);
    expect(exts.some((e) => e.entity_type === "phone")).toBe(false);
    expect(exts.some((e) => e.entity_type === "staff")).toBe(true);
  });

  it("emits email-channel destination_contact when only email present", () => {
    const exts = rowsToExtractions([
      { label: "After-Hours Emergency", email: "oncall@example.com" },
    ]);
    const dest = exts.find((e) => e.entity_type === "destination_contact");
    expect(dest).toBeTruthy();
    expect(dest!.payload.channel).toBe("email");
  });

  it("ignores destination_contact when label is not a known business pattern", () => {
    const exts = rowsToExtractions([
      { label: "Personal Cell", phone: "5551234567" },
    ]);
    expect(exts.some((e) => e.entity_type === "destination_contact")).toBe(false);
    expect(exts.some((e) => e.entity_type === "phone")).toBe(true);
  });
});
