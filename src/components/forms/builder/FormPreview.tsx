import { FormRunner } from "@/components/forms/runtime/FormRunner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { FormSchemaV1 } from "@/types/form-schema";

/**
 * Builder Preview tab — wraps FormRunner with a contained chrome so
 * authors see the agent experience in-context.
 */
export function FormPreview({ schema }: { schema: FormSchemaV1 }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Agent preview</CardTitle>
        <p className="text-xs text-muted-foreground">
          What an agent sees during a call. Submissions in preview are not persisted.
        </p>
      </CardHeader>
      <CardContent>
        <FormRunner schema={schema} />
      </CardContent>
    </Card>
  );
}

export default FormPreview;
