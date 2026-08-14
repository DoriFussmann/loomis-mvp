import Link from "next/link";
import { getUsers, getPages, getPrompts, getGapQuoteRates } from "@/lib/data";
import { Users, FileText, Zap, Table2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const users = await getUsers();
  const pages = await getPages();
  const prompts = await getPrompts();
  let gapRateCount = 0;
  try {
    gapRateCount = (await getGapQuoteRates()).length;
  } catch {
    gapRateCount = 0;
  }

  const stats = [
    { label: "Users", value: users.length, href: "/admin/users", icon: Users },
    { label: "Pages", value: pages.length, href: "/admin/pages", icon: FileText },
    { label: "Prompts", value: prompts.length, href: "/admin/prompts", icon: Zap },
    { label: "GAP Rates", value: gapRateCount, href: "/admin/gap-rates", icon: Table2 },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-[15px] text-ink">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Overview of your application</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(({ label, value, href, icon: Icon }) => (
          <Link key={href} href={href}>
            <Card className="cursor-pointer hover:bg-soft">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm text-muted-foreground font-light">{label}</CardTitle>
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-normal">{value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
