import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ClientRecord } from "@/lib/claimsValidation/schema";

interface ClientRow {
  id: string;
  first_name: string;
  last_name: string;
  dob: string;
  member_id: string;
  insurer_name: string;
}

export async function GET() {
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("clients")
      .select("id,first_name,last_name,dob,member_id,insurer_name")
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const clients: ClientRecord[] = (data ?? []).map((row: ClientRow) => ({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      dob: row.dob,
      memberId: row.member_id,
      insurerName: row.insurer_name,
    }));

    return NextResponse.json({ success: true, data: clients });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch clients";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
