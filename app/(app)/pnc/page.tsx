import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getPages } from "@/lib/data";
import { DepartmentDashboard } from "@/components/department-dashboard";

export default async function PnCPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  const allPages = await getPages();
  const accessiblePages =
    session.role === "admin" ? allPages : allPages.filter((p) => session.allowedPages.includes(p.slug));

  return <DepartmentDashboard session={session} accessiblePages={accessiblePages} interactive />;
}
