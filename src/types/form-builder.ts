export type FormFieldType =
  | "text"
  | "textarea"
  | "email"
  | "phone"
  | "number"
  | "select"
  | "checkbox"
  | "date";

export type FormConditionOp = "equals" | "not_equals" | "is_empty" | "is_not_empty";

export type FormFieldCondition = {
  fieldId: string;
  op: FormConditionOp;
  value?: string;
};

export type FormField = {
  id: string;
  key: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  helpText?: string;
  placeholder?: string;
  options?: { label: string; value: string }[];
  visibleIf?: FormFieldCondition;
  /** Where this field maps when a submission is forwarded (lead.first_name, contact.phone, etc.) */
  mapping?: string;
};

export type FormSchema = {
  fields: FormField[];
  /** Optional confirmation copy. */
  confirmation?: string;
};

export const emptySchema: FormSchema = { fields: [] };

export function newField(type: FormFieldType = "text"): FormField {
  const id = crypto.randomUUID();
  return {
    id,
    key: `field_${id.slice(0, 6)}`,
    label: "Untitled field",
    type,
    required: false,
  };
}

export function isFieldVisible(field: FormField, values: Record<string, unknown>, allFields: FormField[]): boolean {
  const cond = field.visibleIf;
  if (!cond) return true;
  const refField = allFields.find((f) => f.id === cond.fieldId);
  if (!refField) return true;
  const v = values[refField.key];
  switch (cond.op) {
    case "equals":
      return String(v ?? "") === String(cond.value ?? "");
    case "not_equals":
      return String(v ?? "") !== String(cond.value ?? "");
    case "is_empty":
      return v === undefined || v === null || v === "";
    case "is_not_empty":
      return !(v === undefined || v === null || v === "");
  }
}

export function buildMappedPayload(schema: FormSchema, values: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of schema.fields) {
    if (!f.mapping) continue;
    if (!isFieldVisible(f, values, schema.fields)) continue;
    // dot-path assign
    const parts = f.mapping.split(".");
    let cur: Record<string, unknown> = out;
    for (let i = 0; i < parts.length - 1; i++) {
      const k = parts[i];
      if (typeof cur[k] !== "object" || cur[k] === null) cur[k] = {};
      cur = cur[k] as Record<string, unknown>;
    }
    cur[parts[parts.length - 1]] = values[f.key];
  }
  return out;
}
