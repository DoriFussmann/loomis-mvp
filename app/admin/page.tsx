import Link from "next/link";
import { getUsers, getPages, getPrompts } from "@/lib/data";
import { Users, FileText, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminDashboard() {
  const users = getUsers();
  const pages = getPages();
  const prompts = getPrompts();

  const stats = [
    { label: "Users", value: users.length, href: "/admin/users", icon: Users },
    { label: "Pages", value: pages.length, href: "/admin/pages", icon: FileText },
    { label: "Prompts", value: prompts.length, href: "/admin/prompts", icon: Zap },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-xl font-normal text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Overview of your application</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map(({ label, value, href, icon: Icon }) => (
          <Link key={href} href={href}>
            <Card className="hover:bg-accent/50 transition-colors duration-200 cursor-pointer">
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
