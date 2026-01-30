// CRM Field Schema Definitions
// These define the target fields available for each CRM type

export interface CRMField {
  path: string;
  label: string;
  type: "string" | "email" | "phone" | "text" | "number" | "boolean" | "date" | "enum";
  category: string;
  required?: boolean;
  options?: string[];
  description?: string;
}

export interface CRMSchema {
  name: string;
  displayName: string;
  icon: string;
  categories: string[];
  fields: CRMField[];
}

export const clioSchema: CRMSchema = {
  name: "clio",
  displayName: "Clio",
  icon: "Scale",
  categories: ["contact", "matter", "custom"],
  fields: [
    // Contact fields
    { path: "Contact.name", label: "Full Name", type: "string", category: "contact", required: true },
    { path: "Contact.first_name", label: "First Name", type: "string", category: "contact" },
    { path: "Contact.last_name", label: "Last Name", type: "string", category: "contact" },
    { path: "Contact.title", label: "Title", type: "string", category: "contact" },
    { path: "Contact.company", label: "Company", type: "string", category: "contact" },
    { path: "Contact.email_addresses[0].address", label: "Primary Email", type: "email", category: "contact" },
    { path: "Contact.email_addresses[1].address", label: "Secondary Email", type: "email", category: "contact" },
    { path: "Contact.phone_numbers[0].number", label: "Primary Phone", type: "phone", category: "contact", required: true },
    { path: "Contact.phone_numbers[1].number", label: "Secondary Phone", type: "phone", category: "contact" },
    { path: "Contact.phone_numbers[2].number", label: "Mobile Phone", type: "phone", category: "contact" },
    { path: "Contact.addresses[0].street", label: "Street Address", type: "string", category: "contact" },
    { path: "Contact.addresses[0].city", label: "City", type: "string", category: "contact" },
    { path: "Contact.addresses[0].province", label: "State/Province", type: "string", category: "contact" },
    { path: "Contact.addresses[0].postal_code", label: "ZIP/Postal Code", type: "string", category: "contact" },
    { path: "Contact.addresses[0].country", label: "Country", type: "string", category: "contact" },
    
    // Matter fields
    { path: "Matter.display_number", label: "Matter Number", type: "string", category: "matter" },
    { path: "Matter.description", label: "Description", type: "text", category: "matter" },
    { path: "Matter.practice_area.name", label: "Practice Area", type: "string", category: "matter" },
    { path: "Matter.status", label: "Status", type: "enum", category: "matter", options: ["Open", "Pending", "Closed"] },
    { path: "Matter.open_date", label: "Open Date", type: "date", category: "matter" },
    { path: "Matter.close_date", label: "Close Date", type: "date", category: "matter" },
    { path: "Matter.billable", label: "Billable", type: "boolean", category: "matter" },
    
    // Custom fields
    { path: "Matter.custom_field_values.source", label: "Lead Source", type: "string", category: "custom" },
    { path: "Matter.custom_field_values.priority", label: "Priority", type: "enum", category: "custom", options: ["Low", "Medium", "High", "Urgent"] },
    { path: "Matter.custom_field_values.caller_id", label: "Caller ID", type: "phone", category: "custom" },
    { path: "Matter.custom_field_values.call_notes", label: "Call Notes", type: "text", category: "custom" },
  ],
};

export const workizSchema: CRMSchema = {
  name: "workiz",
  displayName: "Workiz",
  icon: "Wrench",
  categories: ["client", "job", "custom"],
  fields: [
    // Client fields
    { path: "Client.name", label: "Client Name", type: "string", category: "client", required: true },
    { path: "Client.first_name", label: "First Name", type: "string", category: "client" },
    { path: "Client.last_name", label: "Last Name", type: "string", category: "client" },
    { path: "Client.email", label: "Email", type: "email", category: "client" },
    { path: "Client.phone", label: "Primary Phone", type: "phone", category: "client", required: true },
    { path: "Client.secondary_phone", label: "Secondary Phone", type: "phone", category: "client" },
    { path: "Client.address", label: "Address", type: "string", category: "client" },
    { path: "Client.city", label: "City", type: "string", category: "client" },
    { path: "Client.state", label: "State", type: "string", category: "client" },
    { path: "Client.zip", label: "ZIP Code", type: "string", category: "client" },
    { path: "Client.company", label: "Company", type: "string", category: "client" },
    { path: "Client.notes", label: "Client Notes", type: "text", category: "client" },
    
    // Job fields
    { path: "Job.title", label: "Job Title", type: "string", category: "job" },
    { path: "Job.service_type", label: "Service Type", type: "string", category: "job" },
    { path: "Job.priority", label: "Priority", type: "enum", category: "job", options: ["low", "medium", "high", "emergency"] },
    { path: "Job.status", label: "Status", type: "enum", category: "job", options: ["new", "scheduled", "in_progress", "completed", "cancelled"] },
    { path: "Job.scheduled_date", label: "Scheduled Date", type: "date", category: "job" },
    { path: "Job.notes", label: "Job Notes", type: "text", category: "job" },
    { path: "Job.description", label: "Description", type: "text", category: "job" },
    { path: "Job.estimated_duration", label: "Estimated Duration (hours)", type: "number", category: "job" },
    
    // Custom fields
    { path: "Job.custom_fields.gate_code", label: "Gate Code", type: "string", category: "custom" },
    { path: "Job.custom_fields.pets", label: "Pets on Property", type: "boolean", category: "custom" },
    { path: "Job.custom_fields.referral_source", label: "Referral Source", type: "string", category: "custom" },
    { path: "Job.custom_fields.caller_id", label: "Caller ID", type: "phone", category: "custom" },
  ],
};

export const salesforceSchema: CRMSchema = {
  name: "salesforce",
  displayName: "Salesforce",
  icon: "Cloud",
  categories: ["lead", "contact", "account", "opportunity", "custom"],
  fields: [
    // Lead fields
    { path: "Lead.FirstName", label: "First Name", type: "string", category: "lead" },
    { path: "Lead.LastName", label: "Last Name", type: "string", category: "lead", required: true },
    { path: "Lead.Email", label: "Email", type: "email", category: "lead" },
    { path: "Lead.Phone", label: "Phone", type: "phone", category: "lead" },
    { path: "Lead.Company", label: "Company", type: "string", category: "lead", required: true },
    { path: "Lead.Title", label: "Title", type: "string", category: "lead" },
    { path: "Lead.LeadSource", label: "Lead Source", type: "string", category: "lead" },
    { path: "Lead.Status", label: "Status", type: "enum", category: "lead", options: ["New", "Contacted", "Qualified", "Unqualified"] },
    { path: "Lead.Description", label: "Description", type: "text", category: "lead" },
    
    // Contact fields
    { path: "Contact.FirstName", label: "First Name", type: "string", category: "contact" },
    { path: "Contact.LastName", label: "Last Name", type: "string", category: "contact", required: true },
    { path: "Contact.Email", label: "Email", type: "email", category: "contact" },
    { path: "Contact.Phone", label: "Phone", type: "phone", category: "contact" },
    { path: "Contact.MobilePhone", label: "Mobile Phone", type: "phone", category: "contact" },
    { path: "Contact.MailingStreet", label: "Mailing Street", type: "string", category: "contact" },
    { path: "Contact.MailingCity", label: "Mailing City", type: "string", category: "contact" },
    { path: "Contact.MailingState", label: "Mailing State", type: "string", category: "contact" },
    { path: "Contact.MailingPostalCode", label: "Mailing Postal Code", type: "string", category: "contact" },
    
    // Account fields
    { path: "Account.Name", label: "Account Name", type: "string", category: "account", required: true },
    { path: "Account.Phone", label: "Phone", type: "phone", category: "account" },
    { path: "Account.Website", label: "Website", type: "string", category: "account" },
    { path: "Account.Industry", label: "Industry", type: "string", category: "account" },
    
    // Opportunity fields
    { path: "Opportunity.Name", label: "Opportunity Name", type: "string", category: "opportunity", required: true },
    { path: "Opportunity.StageName", label: "Stage", type: "enum", category: "opportunity", options: ["Prospecting", "Qualification", "Proposal", "Negotiation", "Closed Won", "Closed Lost"] },
    { path: "Opportunity.Amount", label: "Amount", type: "number", category: "opportunity" },
    { path: "Opportunity.CloseDate", label: "Close Date", type: "date", category: "opportunity" },
    
    // Custom fields
    { path: "Lead.Five9_Caller_ID__c", label: "Five9 Caller ID", type: "phone", category: "custom" },
    { path: "Lead.Five9_Campaign__c", label: "Five9 Campaign", type: "string", category: "custom" },
    { path: "Lead.Five9_Disposition__c", label: "Five9 Disposition", type: "string", category: "custom" },
  ],
};

export const webhookSchema: CRMSchema = {
  name: "webhook",
  displayName: "Generic Webhook",
  icon: "Webhook",
  categories: ["contact", "call", "custom"],
  fields: [
    // Contact fields for webhook output
    { path: "contact.name", label: "Full Name", type: "string", category: "contact" },
    { path: "contact.first_name", label: "First Name", type: "string", category: "contact" },
    { path: "contact.last_name", label: "Last Name", type: "string", category: "contact" },
    { path: "contact.email", label: "Email", type: "email", category: "contact" },
    { path: "contact.phone", label: "Phone", type: "phone", category: "contact" },
    { path: "contact.company", label: "Company", type: "string", category: "contact" },
    { path: "contact.address", label: "Address", type: "string", category: "contact" },
    { path: "contact.city", label: "City", type: "string", category: "contact" },
    { path: "contact.state", label: "State", type: "string", category: "contact" },
    { path: "contact.zip", label: "ZIP Code", type: "string", category: "contact" },
    
    // Call fields for webhook output
    { path: "call.id", label: "Call ID", type: "string", category: "call" },
    { path: "call.ani", label: "ANI", type: "phone", category: "call" },
    { path: "call.dnis", label: "DNIS", type: "phone", category: "call" },
    { path: "call.campaign", label: "Campaign", type: "string", category: "call" },
    { path: "call.skill", label: "Skill", type: "string", category: "call" },
    { path: "call.agent", label: "Agent", type: "string", category: "call" },
    { path: "call.disposition", label: "Disposition", type: "string", category: "call" },
    { path: "call.notes", label: "Notes", type: "text", category: "call" },
    { path: "call.duration", label: "Duration (seconds)", type: "number", category: "call" },
    { path: "call.timestamp", label: "Timestamp", type: "date", category: "call" },
    
    // Custom fields
    { path: "custom.field_1", label: "Custom Field 1", type: "string", category: "custom" },
    { path: "custom.field_2", label: "Custom Field 2", type: "string", category: "custom" },
    { path: "custom.field_3", label: "Custom Field 3", type: "string", category: "custom" },
  ],
};

export const crmSchemas: Record<string, CRMSchema> = {
  clio: clioSchema,
  workiz: workizSchema,
  salesforce: salesforceSchema,
  webhook: webhookSchema,
  generic_rest: webhookSchema,
};

export function getCRMSchema(crmType: string): CRMSchema | undefined {
  return crmSchemas[crmType];
}

export function getAllCRMSchemas(): CRMSchema[] {
  return Object.values(crmSchemas);
}
