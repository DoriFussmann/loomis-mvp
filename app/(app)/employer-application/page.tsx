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
    <div>
      <div className="mb-6">
        <Link href="/benefits">
          <Button variant="outline" size="sm">Back to Benefits</Button>
        </Link>
      </div>
      <EmployerApplicationClient />
    </div>
  );
}
