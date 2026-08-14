import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getGapQuoteRun } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { GapQuoteClient } from "../../ui-client";

export default async function GapQuoteResultsPage({ params }: { params: { runId: string } }) {
  const session = await getSession();
  if (!session) {
    redirect(`/login?next=${encodeURIComponent(`/gap-quote/results/${params.runId}`)}`);
  }

  const run = await getGapQuoteRun(params.runId);
  if (!run || run.status !== "complete" || !run.result) {
    notFound();
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/benefits?tool=gap-quote">
          <Button variant="outline" size="sm">Back to Benefits</Button>
        </Link>
      </div>
      <GapQuoteClient
        storedRun={{
          id: run.id,
          subject: run.subject,
          senderEmail: run.senderEmail,
          result: run.result,
        }}
      />
    </div>
  );
}
