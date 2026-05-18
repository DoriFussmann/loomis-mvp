import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getPages } from "@/lib/data";
import { DepartmentDashboard, type DepartmentNavItem, type DepartmentToolCard } from "@/components/department-dashboard";
const BENEFITS_NAV_ITEMS: DepartmentNavItem[] = [
  { label: "Dashboard", icon: "LayoutGrid", active: true },
  { label: "Employer Application", icon: "Briefcase", slug: "employer-application", forceLive: true },
  { label: "Client Validation", icon: "UserCheck", slug: "claims-validation", forceLive: true },
  { label: "Consolidation Tool", icon: "Layers" },
];

const BENEFITS_TOOL_CARDS: DepartmentToolCard[] = [
  {
    label: "Employer Application",
    description: "Start and manage employer application intake.",
    slug: "employer-application",
    forceLive: true,
  },
  {
    label: "Client Validation",
    description: "Validate and verify patient identity against the client database.",
    slug: "claims-validation",
    forceLive: true,
  },
  {
    label: "Consolidation Tool",
    description: "Consolidate multi-carrier benefit data into a single unified view for reporting and analysis.",
    live: false,
  },
];

export default async function BenefitsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const allPages = await getPages();
  const accessiblePages =
    session.role === "admin" ? allPages : allPages.filter((p) => session.allowedPages.includes(p.slug));

  return (
    <DepartmentDashboard
      session={session}
      accessiblePages={accessiblePages}
      interactive
      showTools
      showNavTools
      navItems={BENEFITS_NAV_ITEMS}
      platformCards={BENEFITS_TOOL_CARDS}
    />
  );
}
