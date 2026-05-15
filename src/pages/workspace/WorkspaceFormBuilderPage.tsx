import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Send, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useWorkspaceForm, useFormSchema, useUpdateFormSchema, useFormVersionsV1, usePublishForm } from "@/hooks/useWorkspaceForms";
import { FieldList } from "@/components/forms/builder/FieldList";
import { FieldInspector } from "@/components/forms/builder/FieldInspector";
import { LogicEditor } from "@/components/forms/builder/LogicEditor";
import { FormPreview } from "@/components/forms/builder/FormPreview";
import { VersionHistory } from "@/components/forms/builder/VersionHistory";
import { FIELD_TYPE_BY_KEY } from "@/config/formFieldTypes";
import { cryptoRandomId, type FormField, type FormFieldType, type FormSchemaV1, type FormSection } from "@/types/form-schema";

/**
 * Canonical schema-driven form builder.
 * Tabs: Build · Logic · Preview · Versions. Persists via FormSchemaV1.
 */
export default function WorkspaceFormBuilderPage() {
  const { workspaceId, formId } = useParams<{ workspaceId: string; formId: string }>();
  const { data: form } = useWorkspaceForm(formId);
  const { data: loaded } = useFormSchema(formId);
  const { data: versions = [], isLoading: versionsLoading } = useFormVersionsV1(formId);
  const updateSchema = useUpdateFormSchema(formId);
  const publish = usePublishForm(formId);

  const [schema, setSchema] = useState<FormSchemaV1 | null>(null);
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [fieldId, setFieldId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (loaded && !schema) {
      setSchema(loaded);
      setSectionId(loaded.sections[0]?.id ?? null);
    }
  }, [loaded, schema]);

  const section = useMemo(
    () => schema?.sections.find((s) => s.id === sectionId) ?? schema?.sections[0] ?? null,
    [schema, sectionId],
  );
  const field = useMemo(
    () => section?.fields.find((f) => f.id === fieldId) ?? null,
    [section, fieldId],
  );

  if (!schema || !section) {
    return <p className="text-sm text-muted-foreground">Loading form…</p>;
  }

  const setSchemaDirty = (next: FormSchemaV1) => {
    setSchema(next);
    setDirty(true);
  };

  const addSection = () => {
    const s: FormSection = { id: cryptoRandomId(), title: `Section ${schema.sections.length + 1}`, description: "", fields: [] };
    setSchemaDirty({ ...schema, sections: [...schema.sections, s] });
    setSectionId(s.id);
  };
  const removeSection = (id: string) => {
    if (schema.sections.length === 1) return;
    const next = schema.sections.filter((s) => s.id !== id);
    setSchemaDirty({ ...schema, sections: next });
    setSectionId(next[0]?.id ?? null);
  };
  const renameSection = (id: string, title: string) => {
    setSchemaDirty({
      ...schema,
      sections: schema.sections.map((s) => (s.id === id ? { ...s, title } : s)),
    });
  };

  const addField = (type: FormFieldType) => {
    const f = FIELD_TYPE_BY_KEY[type].makeDefault();
    setSchemaDirty({
      ...schema,
      sections: schema.sections.map((s) =>
        s.id === section.id ? { ...s, fields: [...s.fields, f] } : s,
      ),
    });
    setFieldId(f.id);
  };
  const updateField = (next: FormField) => {
    setSchemaDirty({
      ...schema,
      sections: schema.sections.map((s) =>
        s.id === section.id ? { ...s, fields: s.fields.map((f) => (f.id === next.id ? next : f)) } : s,
      ),
    });
  };
  const removeField = (id: string) => {
    setSchemaDirty({
      ...schema,
      sections: schema.sections.map((s) =>
        s.id === section.id ? { ...s, fields: s.fields.filter((f) => f.id !== id) } : s,
      ),
    });
    if (fieldId === id) setFieldId(null);
  };
  const moveField = (id: string, dir: -1 | 1) => {
    const fields = [...section.fields];
    const idx = fields.findIndex((f) => f.id === id);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= fields.length) return;
    [fields[idx], fields[target]] = [fields[target], fields[idx]];
    setSchemaDirty({
      ...schema,
      sections: schema.sections.map((s) => (s.id === section.id ? { ...s, fields } : s)),
    });
  };

  const saveDraft = async () => {
    await updateSchema.mutateAsync(schema);
    setDirty(false);
  };
  const publishVersion = async () => {
    await publish.mutateAsync({ schema, notes: notes || undefined });
    setNotes("");
    setDirty(false);
  };

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm">
        <Link to={`/w/${workspaceId}/forms/${formId}`}>
          <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to form
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{form?.name ?? "Form"}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline">v{form?.current_version ?? 1}</Badge>
            {dirty && <Badge variant="outline" className="border-accent/40 text-accent">Unsaved</Badge>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Change notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-56"
          />
          <Button variant="outline" size="sm" onClick={saveDraft} disabled={updateSchema.isPending || !dirty}>
            <Save className="h-3.5 w-3.5 mr-1" /> Save draft
          </Button>
          <Button size="sm" onClick={publishVersion} disabled={publish.isPending}>
            <Send className="h-3.5 w-3.5 mr-1" /> Publish
          </Button>
        </div>
      </div>

      <Tabs defaultValue="build">
        <TabsList>
          <TabsTrigger value="build" data-testid="tab-build">Build</TabsTrigger>
          <TabsTrigger value="logic" data-testid="tab-logic">Logic</TabsTrigger>
          <TabsTrigger value="preview" data-testid="tab-preview">Preview</TabsTrigger>
          <TabsTrigger value="versions" data-testid="tab-versions">Versions</TabsTrigger>
        </TabsList>

        <TabsContent value="build" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr_320px] gap-4">
            {/* Left rail — sections */}
            <Card>
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Sections</p>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={addSection} data-testid="add-section">
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <ul className="space-y-1">
                  {schema.sections.map((s) => (
                    <li key={s.id} className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setSectionId(s.id)}
                        className={`flex-1 text-left px-2 py-1.5 rounded text-sm ${s.id === section.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/50"}`}
                      >
                        {s.title}
                      </button>
                      {schema.sections.length > 1 && (
                        <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive/60 hover:text-destructive" onClick={() => removeSection(s.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Center — fields */}
            <div className="space-y-4">
              <Input
                value={section.title}
                onChange={(e) => renameSection(section.id, e.target.value)}
                className="text-base font-semibold"
              />
              <FieldList
                section={section}
                selectedFieldId={fieldId}
                onSelectField={setFieldId}
                onAddField={addField}
                onRemoveField={removeField}
                onMoveField={moveField}
              />
            </div>

            {/* Right — inspector */}
            <Card>
              <CardContent className="pt-4">
                <FieldInspector field={field} onChange={updateField} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="logic" className="mt-4">
          <LogicEditor schema={schema} onChange={setSchemaDirty} />
        </TabsContent>

        <TabsContent value="preview" className="mt-4">
          <FormPreview schema={schema} />
        </TabsContent>

        <TabsContent value="versions" className="mt-4">
          <VersionHistory versions={versions} isLoading={versionsLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
