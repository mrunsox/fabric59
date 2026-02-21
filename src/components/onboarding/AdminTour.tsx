import { Globe, Users, Building2, Plug, FileJson, Settings } from "lucide-react";
import { GuidedTour, TourStep } from "./GuidedTour";

const adminSteps: TourStep[] = [
  {
    title: "Welcome to Fabric59!",
    description:
      "This is your integration hub for Five9. Let's take a quick tour of what you can do here.",
    icon: <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center"><Globe className="h-6 w-6 text-primary" /></div>,
  },
  {
    title: "Five9 Domains",
    description:
      "Connect and manage your Five9 domains. Configure API credentials, test connections, and set up workflow rules.",
    icon: <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center"><Globe className="h-6 w-6 text-primary" /></div>,
  },
  {
    title: "Agent Management",
    description:
      "Provision and deprovision agents across Five9, Google Workspace, and Slack in one click with full audit trails.",
    icon: <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center"><Users className="h-6 w-6 text-primary" /></div>,
  },
  {
    title: "Clients & Integrations",
    description:
      "Manage your clients (tenants) and configure 55+ integrations including CRM systems, messaging, and automation tools.",
    icon: <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center"><Building2 className="h-6 w-6 text-primary" /></div>,
  },
  {
    title: "Field Mapping Builder",
    description:
      "Use the visual drag-and-drop builder to map Five9 contact fields to any CRM with custom transformations.",
    icon: <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center"><FileJson className="h-6 w-6 text-primary" /></div>,
  },
  {
    title: "Settings & Configuration",
    description:
      "Configure API keys, team permissions, notifications, and security settings for your organization.",
    icon: <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center"><Settings className="h-6 w-6 text-primary" /></div>,
  },
];

export function AdminTour() {
  return <GuidedTour tourKey="admin" steps={adminSteps} />;
}
