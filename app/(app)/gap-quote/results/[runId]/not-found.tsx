import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function GapQuoteResultNotFound() {
  return (
    <div>
      <h1 className="text-[15px] text-ink">Quote not found</h1>
      <p className="mt-2 text-sm text-muted-foreground mb-6">
        This GAP quote link is invalid, still processing, or the run did not complete.
      </p>
      <Link href="/gap-quote">
        <Button variant="outline" size="sm">Open GAP Quote</Button>
      </Link>
    </div>
  );
}
