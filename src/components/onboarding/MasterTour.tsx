import { Building2, Users, LayoutDashboard } from "lucide-react";
import { GuidedTour, TourStep } from "./GuidedTour";

const masterSteps: TourStep[] = [
  {
    title: "System Admin Dashboard",
    description:
      "Welcome to the platform-level administration panel. From here you can manage all organizations, users, and system health.",
    icon: <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center"><LayoutDashboard className="h-6 w-6 text-primary" /></div>,
  },
  {
    title: "Organizations",
    description:
      "View and manage all organizations on the platform. Monitor plans, billing status, and usage across every account.",
    icon: <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center"><Building2 className="h-6 w-6 text-primary" /></div>,
  },
  {
    title: "Users & Roles",
    description:
      "Manage platform users, assign roles, and control access across the entire system.",
    icon: <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center"><Users className="h-6 w-6 text-primary" /></div>,
  },
];

export function MasterTour() {
  return <GuidedTour tourKey="master" steps={masterSteps} />;
}
