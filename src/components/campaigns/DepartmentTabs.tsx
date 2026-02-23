import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { DecisionTreeBuilder } from "@/components/campaigns/DecisionTreeBuilder";
import { DispositionEmailTable } from "@/components/campaigns/DispositionEmailTable";
import type { CampaignDepartment, DecisionTreeNode, DispositionEmailConfig } from "@/types/campaign";

interface DepartmentTabsProps {
  departments: CampaignDepartment[];
  onChange: (departments: CampaignDepartment[]) => void;
  allDispositions: string[]; // combined existing + new from parent
}

function generateId() {
  return `dept_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function DepartmentTabs({ departments, onChange, allDispositions }: DepartmentTabsProps) {
  const [activeTab, setActiveTab] = useState(departments[0]?.id || "");

  const addDepartment = () => {
    const newDept: CampaignDepartment = {
      id: generateId(),
      name: "",
      ivrPromptNumber: departments.length + 1,
      skillName: "",
      decisionTree: [],
      dispositionEmailConfigs: [],
      dispatchInstructions: "",
    };
    const updated = [...departments, newDept];
    onChange(updated);
    setActiveTab(newDept.id);
  };

  const updateDepartment = (id: string, patch: Partial<CampaignDepartment>) => {
    onChange(departments.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  };

  const removeDepartment = (id: string) => {
    const updated = departments.filter((d) => d.id !== id);
    onChange(updated);
    if (activeTab === id) setActiveTab(updated[0]?.id || "");
  };

  if (departments.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-muted-foreground mb-3">No departments configured yet. Add your first department to get started.</p>
        <Button type="button" variant="outline" onClick={addDepartment} className="gap-2">
          <Plus className="h-4 w-4" /> Add Department
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="flex items-center gap-2 overflow-x-auto">
          <TabsList className="flex-1 justify-start">
            {departments.map((dept) => (
              <TabsTrigger key={dept.id} value={dept.id} className="gap-1.5 text-xs">
                {dept.ivrPromptNumber}. {dept.name || "Untitled"}
              </TabsTrigger>
            ))}
          </TabsList>
          <Button type="button" variant="outline" size="sm" onClick={addDepartment} className="gap-1 shrink-0">
            <Plus className="h-3 w-3" /> Add
          </Button>
        </div>

        {departments.map((dept) => (
          <TabsContent key={dept.id} value={dept.id}>
            <Card>
              <CardContent className="pt-4 space-y-4">
                {/* Department basics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label>Department Name</Label>
                    <Input
                      value={dept.name}
                      onChange={(e) => updateDepartment(dept.id, { name: e.target.value })}
                      placeholder="e.g. New Claim"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>IVR Prompt #</Label>
                    <Input
                      type="number"
                      min={1}
                      value={dept.ivrPromptNumber}
                      onChange={(e) => updateDepartment(dept.id, { ivrPromptNumber: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Skill Override</Label>
                    <Input
                      value={dept.skillName || ""}
                      onChange={(e) => updateDepartment(dept.id, { skillName: e.target.value })}
                      placeholder="Optional separate skill"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>IVR Greeting</Label>
                  <Textarea
                    value={dept.ivrGreeting || ""}
                    onChange={(e) => updateDepartment(dept.id, { ivrGreeting: e.target.value })}
                    placeholder="Department-specific IVR greeting text"
                    rows={2}
                  />
                </div>

                {/* Decision Tree */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Agent Worksheet / Decision Tree</Label>
                  <DecisionTreeBuilder
                    nodes={dept.decisionTree}
                    onChange={(nodes) => updateDepartment(dept.id, { decisionTree: nodes })}
                  />
                </div>

                {/* Disposition Email Configs */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Disposition Email Routing</Label>
                  <DispositionEmailTable
                    dispositions={allDispositions}
                    configs={dept.dispositionEmailConfigs}
                    onChange={(configs) => updateDepartment(dept.id, { dispositionEmailConfigs: configs })}
                  />
                </div>

                {/* Dispatch Instructions */}
                <div className="space-y-1.5">
                  <Label>Dispatch Instructions</Label>
                  <Textarea
                    value={dept.dispatchInstructions || ""}
                    onChange={(e) => updateDepartment(dept.id, { dispatchInstructions: e.target.value })}
                    placeholder="Free-text dispatch notes for this department"
                    rows={3}
                  />
                </div>

                {/* Remove button */}
                <div className="flex justify-end pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-destructive hover:text-destructive"
                    onClick={() => removeDepartment(dept.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Remove Department
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
