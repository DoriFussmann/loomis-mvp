import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { EmployerApplicationClient } from "./ui-client";

export default async function EmployerApplicationPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1080px] mx-auto px-6 py-10">
        <Link href="/benefits">
          <Button variant="outline" size="sm">Back to Benefits</Button>
        </Link>
        <EmployerApplicationClient />
      </div>
    </div>
  );
}
