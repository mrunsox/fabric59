import { ScriptNode } from '@/types/script';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RichTextEditor } from './RichTextEditor';
import { Button } from '@/components/ui/button';
import { Upload, Image, Video, Variable } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ContentNodeConfigProps {
  node: ScriptNode;
  onUpdate: (updates: Partial<ScriptNode>) => void;
  variables?: string[];
}

export function ContentNodeConfig({ node, onUpdate, variables = [] }: ContentNodeConfigProps) {
  const insertVariable = (varName: string) => {
    const currentContent = node.content || '';
    onUpdate({ content: currentContent + ` {${varName}}` });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Node Title</Label>
        <Input
          value={node.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Enter title..."
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Script Content</Label>
          <div className="flex gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 text-xs">
                  <Variable className="w-3 h-3 mr-1" />
                  Insert Variable
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {variables.length > 0 ? (
                  variables.map((v) => (
                    <DropdownMenuItem key={v} onClick={() => insertVariable(v)}>
                      {`{${v}}`}
                    </DropdownMenuItem>
                  ))
                ) : (
                  <>
                    <DropdownMenuItem onClick={() => insertVariable('customerName')}>
                      {'{customerName}'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => insertVariable('accountNumber')}>
                      {'{accountNumber}'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => insertVariable('agentName')}>
                      {'{agentName}'}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <RichTextEditor
          content={node.content}
          onChange={(content) => onUpdate({ content })}
          placeholder="Enter script content with rich formatting..."
        />
        <p className="text-xs text-muted-foreground">
          Use {'{variableName}'} to insert dynamic values. Select text for formatting options.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Continue Button Label</Label>
        <Input
          value={node.continueLabel || ''}
          onChange={(e) => onUpdate({ continueLabel: e.target.value })}
          placeholder="Next"
        />
        <p className="text-xs text-muted-foreground">
          Customize the button text agents see to advance (e.g., "Continue", "I've Read This", "Acknowledge")
        </p>
      </div>

      <div className="space-y-2">
        <Label>Media Attachments</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" className="justify-start">
            <Image className="w-4 h-4 mr-2" />
            Add Image
          </Button>
          <Button variant="outline" size="sm" className="justify-start">
            <Video className="w-4 h-4 mr-2" />
            Add Video
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">Max 5MB per file</p>
      </div>
    </div>
  );
}