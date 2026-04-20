export interface DraftPayload {
  campaign_name?: string;
  campaign_type?: string;
  five9_domain?: string;
  client_id?: string;
  provider_target?: string;
  variable_group_name?: string;
  variables?: Array<{ name: string; label: string; type: string; required: boolean }>;
  worksheet_fields?: string[];
  dispositions?: Array<{ code: string; label: string; action: string }>;
  routing_notes?: string;
}

export interface StepProps {
  payload: DraftPayload;
  updatePayload: (patch: Partial<DraftPayload>) => void;
}
