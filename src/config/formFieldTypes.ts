/**
 * Canonical registry of the 24 form field types.
 *
 * Drives the builder's "Add field" picker, default config when a field is
 * inserted, and the inspector. Keep `FormFieldType` (in form-schema.ts) and
 * the keys here in lockstep — the schema-zod test asserts both ends.
 */
import {
  Type, AlignLeft, AtSign, Phone, Link as LinkIcon, Hash, DollarSign,
  Calendar, Clock, CalendarClock, ChevronDown, ListChecks, Circle, Check,
  CheckSquare, ToggleLeft, Upload, PenLine, MapPin, Star, SlidersHorizontal,
  EyeOff, Minus, Heading, Info, MessageSquareQuote, ExternalLink,
} from "lucide-react";
import type { ComponentType } from "react";
import { cryptoRandomId, type FormField, type FormFieldType } from "@/types/form-schema";

export type FieldTypeMeta = {
  type: FormFieldType;
  label: string;
  icon: ComponentType<{ className?: string }>;
  group: "input" | "choice" | "datetime" | "advanced" | "layout" | "agent";
  /** Whether the inspector should expose an `options` editor. */
  hasOptions?: boolean;
  /** Field is presentational (info/script/connector/divider/heading) — no value collected. */
  presentational?: boolean;
  /** Default config sprayed into a fresh field of this type. */
  makeDefault: () => FormField;
};

const base = (type: FormFieldType, label: string, extra: Partial<FormField> = {}): FormField => {
  const id = cryptoRandomId();
  return {
    id,
    key: `${type}_${id.slice(0, 6)}`,
    type,
    label,
    required: false,
    ...extra,
  };
};

const choice = (type: FormFieldType, label: string): FormField =>
  base(type, label, {
    options: [
      { label: "Option 1", value: "option_1" },
      { label: "Option 2", value: "option_2" },
    ],
  });

export const FIELD_TYPE_REGISTRY: FieldTypeMeta[] = [
  // Input
  { type: "text",        label: "Short text",   icon: Type,         group: "input",    makeDefault: () => base("text", "Short text") },
  { type: "textarea",    label: "Long text",    icon: AlignLeft,    group: "input",    makeDefault: () => base("textarea", "Long text") },
  { type: "email",       label: "Email",        icon: AtSign,       group: "input",    makeDefault: () => base("email", "Email") },
  { type: "phone",       label: "Phone",        icon: Phone,        group: "input",    makeDefault: () => base("phone", "Phone") },
  { type: "url",         label: "URL",          icon: LinkIcon,     group: "input",    makeDefault: () => base("url", "URL") },
  { type: "number",      label: "Number",       icon: Hash,         group: "input",    makeDefault: () => base("number", "Number") },
  { type: "currency",    label: "Currency",     icon: DollarSign,   group: "input",    makeDefault: () => base("currency", "Amount") },
  // Datetime
  { type: "date",        label: "Date",         icon: Calendar,     group: "datetime", makeDefault: () => base("date", "Date") },
  { type: "time",        label: "Time",         icon: Clock,        group: "datetime", makeDefault: () => base("time", "Time") },
  { type: "datetime",    label: "Date & time",  icon: CalendarClock,group: "datetime", makeDefault: () => base("datetime", "Date & time") },
  // Choice
  { type: "select",         label: "Select",        icon: ChevronDown,  group: "choice", hasOptions: true, makeDefault: () => choice("select", "Select") },
  { type: "multiselect",    label: "Multi-select",  icon: ListChecks,   group: "choice", hasOptions: true, makeDefault: () => choice("multiselect", "Multi-select") },
  { type: "radio",          label: "Radio",         icon: Circle,       group: "choice", hasOptions: true, makeDefault: () => choice("radio", "Radio") },
  { type: "checkbox",       label: "Checkbox",      icon: Check,        group: "choice", makeDefault: () => base("checkbox", "Checkbox") },
  { type: "checkbox_group", label: "Checkbox group",icon: CheckSquare,  group: "choice", hasOptions: true, makeDefault: () => choice("checkbox_group", "Checkbox group") },
  { type: "toggle",         label: "Toggle",        icon: ToggleLeft,   group: "choice", makeDefault: () => base("toggle", "Toggle") },
  // Advanced
  { type: "file",      label: "File upload", icon: Upload,             group: "advanced", makeDefault: () => base("file", "File upload") },
  { type: "signature", label: "Signature",   icon: PenLine,            group: "advanced", makeDefault: () => base("signature", "Signature") },
  { type: "address",   label: "Address",     icon: MapPin,             group: "advanced", makeDefault: () => base("address", "Address") },
  { type: "rating",    label: "Rating",      icon: Star,               group: "advanced", makeDefault: () => base("rating", "Rating", { validation: { min: 1, max: 5 } }) },
  { type: "slider",    label: "Slider",      icon: SlidersHorizontal,  group: "advanced", makeDefault: () => base("slider", "Slider", { validation: { min: 0, max: 100 } }) },
  { type: "hidden",    label: "Hidden",      icon: EyeOff,             group: "advanced", makeDefault: () => base("hidden", "Hidden") },
  // Layout
  { type: "divider", label: "Divider", icon: Minus,    group: "layout", presentational: true, makeDefault: () => base("divider", "—") },
  { type: "heading", label: "Heading", icon: Heading,  group: "layout", presentational: true, makeDefault: () => base("heading", "Heading") },
  // Agent guidance (presentational, no value collected)
  { type: "info",           label: "Info note",      icon: Info,               group: "agent", presentational: true, makeDefault: () => base("info", "Info", { content: "Helpful note for the agent." }) },
  { type: "script_block",   label: "Say this",       icon: MessageSquareQuote, group: "agent", presentational: true, makeDefault: () => base("script_block", "Say this", { content: "Thank you for calling. How may I help you?" }) },
  { type: "connector_link", label: "Connector link", icon: ExternalLink,       group: "agent", presentational: true, makeDefault: () => base("connector_link", "Open resource", { href: "https://example.com" }) },
];

export const FIELD_TYPE_BY_KEY: Record<FormFieldType, FieldTypeMeta> = Object.fromEntries(
  FIELD_TYPE_REGISTRY.map((m) => [m.type, m]),
) as Record<FormFieldType, FieldTypeMeta>;

export const FIELD_TYPE_GROUPS: { label: string; key: FieldTypeMeta["group"] }[] = [
  { label: "Input",       key: "input" },
  { label: "Choice",      key: "choice" },
  { label: "Date & time", key: "datetime" },
  { label: "Advanced",    key: "advanced" },
  { label: "Agent guide", key: "agent" },
  { label: "Layout",      key: "layout" },
];
