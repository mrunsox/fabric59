// Types for the field mapping system

export interface FieldDefinition {
  name: string;
  label: string;
  type: "string" | "email" | "phone" | "text" | "number" | "boolean" | "date" | "enum" | "disposition";
  category: string;
  required?: boolean;
  options?: string[];
  description?: string;
}

export interface FieldMapping {
  id: string;
  sourceField: {
    path: string;
    label: string;
    type: string;
    category: string;
  };
  targetField: {
    path: string;
    label: string;
    type: string;
    category: string;
  };
  transform?: TransformRule | null;
}

export interface TransformRule {
  type: TransformType;
  params?: Record<string, unknown>;
}

export type TransformType =
  | "none"
  | "format_phone"
  | "uppercase"
  | "lowercase"
  | "trim"
  | "default"
  | "template"
  | "lookup"
  | "regex_extract"
  | "concat"
  | "split";

export interface TransformConfig {
  type: TransformType;
  label: string;
  description: string;
  params?: {
    name: string;
    label: string;
    type: "string" | "number" | "select" | "keyvalue";
    options?: string[];
    required?: boolean;
  }[];
}

export const transformConfigs: TransformConfig[] = [
  { type: "none", label: "No Transform", description: "Pass value as-is" },
  { 
    type: "format_phone", 
    label: "Format Phone", 
    description: "Normalize phone number format",
    params: [
      { name: "format", label: "Format", type: "select", options: ["E.164", "National", "International"], required: true }
    ]
  },
  { type: "uppercase", label: "Uppercase", description: "Convert to uppercase" },
  { type: "lowercase", label: "Lowercase", description: "Convert to lowercase" },
  { type: "trim", label: "Trim", description: "Remove leading/trailing whitespace" },
  { 
    type: "default", 
    label: "Default Value", 
    description: "Use default if empty",
    params: [
      { name: "value", label: "Default Value", type: "string", required: true }
    ]
  },
  { 
    type: "template", 
    label: "Template", 
    description: "String template with placeholders",
    params: [
      { name: "template", label: "Template", type: "string", required: true }
    ]
  },
  { 
    type: "lookup", 
    label: "Lookup/Map", 
    description: "Map values to different values",
    params: [
      { name: "mappings", label: "Value Mappings", type: "keyvalue", required: true }
    ]
  },
  { 
    type: "regex_extract", 
    label: "Regex Extract", 
    description: "Extract using regular expression",
    params: [
      { name: "pattern", label: "Pattern", type: "string", required: true },
      { name: "group", label: "Capture Group", type: "number" }
    ]
  },
  { 
    type: "concat", 
    label: "Concatenate", 
    description: "Combine with other fields",
    params: [
      { name: "separator", label: "Separator", type: "string" },
      { name: "fields", label: "Additional Fields", type: "string" }
    ]
  },
];

export interface Five9Schema {
  contactFields: FieldDefinition[];
  callVariables: FieldDefinition[];
  dispositions: FieldDefinition[];
  campaigns: FieldDefinition[];
}

export interface FieldMappingRecord {
  id: string;
  five9_domain_id: string;
  tenant_id: string | null;
  name: string;
  description: string | null;
  source_type: string;
  destination_type: string;
  mappings: FieldMapping[];
  transformations: unknown[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
